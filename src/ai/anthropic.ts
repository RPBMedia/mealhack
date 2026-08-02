import Anthropic from "@anthropic-ai/sdk";
import {
  AnalyzeResponse,
  GeneratedRecipe,
  GenerateRecipesResponse,
} from "@/lib/schemas";
import type { AiProvider, AnalyzeInput } from "./provider";
import type { GenerateInput } from "./recipe-fixtures";
import {
  INGREDIENT_ANALYSIS_SYSTEM,
  INGREDIENT_ANALYSIS_USER,
} from "./prompts/ingredient-analysis";
import {
  recipeGenerationUser,
  singleRecipeSystem,
} from "./prompts/recipe-generation";

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  return (client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }));
}
const model = () => process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

type MediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

/** The model is told to return JSON only, but strip any stray prose/fences. */
function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json\s*|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice);
}

function textOf(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

export const anthropicProvider: AiProvider = {
  name: "anthropic",

  async analyzeIngredients(input: AnalyzeInput) {
    const msg = await anthropic().messages.create({
      model: model(),
      max_tokens: 2000,
      system: INGREDIENT_ANALYSIS_SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            ...input.images.map((img) => ({
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: img.mediaType as MediaType,
                data: img.data,
              },
            })),
            { type: "text" as const, text: INGREDIENT_ANALYSIS_USER },
          ],
        },
      ],
    });
    return coerceIngredients(textOf(msg));
  },

  async generateRecipes(input: GenerateInput) {
    // Each recipe is its own single-recipe call (~1/3 the output of a combined
    // generation), keeping us well under the serverless time budget and
    // isolating a truncation/parse failure to a single recipe. "fastest" and
    // "best" run in parallel; "different" then runs steered away from those two
    // so the trio is genuinely varied (parallel calls can't see each other and
    // otherwise converge on the obvious dish).
    const user = recipeGenerationUser(input);
    const [fastest, best] = await Promise.all([
      genOneRecipe(user, "fastest"),
      genOneRecipe(user, "best"),
    ]);
    const avoid = [fastest, best]
      .map((r) => String(r.title ?? ""))
      .filter(Boolean);
    const different = await genOneRecipe(user, "different", avoid);
    const recipes = [fastest, best, different];

    const parsed = GenerateRecipesResponse.safeParse({ recipes, modelName: model() });
    if (parsed.success) return parsed.data;
    throw new Error("recipe output failed schema after generation");
  },
};

/** Generate one recipe of the given role, with a single retry on parse
 * failure. The role is forced onto the result so the assembled set always has
 * one of each. `avoid` steers the recipe away from named dishes. */
async function genOneRecipe(
  user: string,
  role: "fastest" | "best" | "different",
  avoid: string[] = [],
): Promise<GeneratedRecipe> {
  const content =
    avoid.length > 0
      ? `${user}\n\nMake this recipe clearly different from these dishes — a different cuisine or format: ${avoid.join("; ")}.`
      : user;
  for (let attempt = 0; attempt < 3; attempt++) {
    const msg = await anthropic().messages.create({
      model: model(),
      max_tokens: 4000,
      system: singleRecipeSystem(role),
      messages: [{ role: "user", content }],
    });
    const recipe = coerceOneRecipe(textOf(msg), role);
    if (recipe) return recipe;
  }
  throw new Error(`failed to generate "${role}" recipe`);
}

const CATEGORIES = new Set([
  "produce", "meat", "fish", "dairy", "egg", "grain", "legume",
  "condiment", "spice", "leftover", "packaged", "other",
]);
const STATES = new Set(["fresh", "frozen", "cooked", "opened", "unknown"]);

/** Tolerant parse of the analysis output: coerce categories/confidence, fill
 * defaults, drop unnamed items, and never throw (empty list on total failure
 * so the user can still add ingredients manually). */
function coerceIngredients(text: string) {
  let obj: { ingredients?: Array<Record<string, unknown>> } = {};
  try {
    obj = extractJson(text) as { ingredients?: Array<Record<string, unknown>> };
  } catch {
    obj = {};
  }
  const raw = Array.isArray(obj.ingredients) ? obj.ingredients : [];
  const ingredients = raw
    .map((i, idx) => {
      let conf = Number(i.confidence ?? 0.7);
      if (!Number.isFinite(conf)) conf = 0.7;
      if (conf > 1) conf = conf / 100;
      conf = Math.max(0, Math.min(1, conf));
      return {
        id: (i.id as string) || `d${idx}`,
        name: String(i.name ?? "").trim(),
        category: CATEGORIES.has(i.category as string)
          ? (i.category as string)
          : "other",
        confidence: conf,
        estimatedQuantity: i.estimatedQuantity
          ? String(i.estimatedQuantity)
          : undefined,
        state: STATES.has(i.state as string) ? (i.state as string) : undefined,
        sourceImageIndex:
          typeof i.sourceImageIndex === "number" ? i.sourceImageIndex : undefined,
        requiresConfirmation:
          typeof i.requiresConfirmation === "boolean"
            ? i.requiresConfirmation
            : conf < 0.6,
      };
    })
    .filter((i) => i.name.length > 0);
  const parsed = AnalyzeResponse.safeParse({ ingredients, modelName: model() });
  return parsed.success ? parsed.data : { ingredients: [], modelName: model() };
}

/** Fill sane defaults for fields models commonly omit, and force the role so
 * the assembled set always has one of each. */
function normalizeRecipe(
  r: Record<string, unknown>,
  idx: number,
  roleFallback: string,
): Record<string, unknown> {
  const prep = Number(r.prepMinutes ?? 0);
  const cook = Number(r.cookMinutes ?? 0);
  return {
    summary: "",
    difficulty: "easy",
    matchScore: 0.7,
    servings: 2,
    usesIngredients: [],
    pantryStaples: [],
    missingRequired: [],
    missingOptional: [],
    substitutions: [],
    equipment: [],
    steps: [],
    safetyNotes: [],
    whyItFits: [],
    ...r,
    role: roleFallback,
    id: (r.id as string) ?? `${roleFallback}-${idx}`,
    prepMinutes: prep,
    cookMinutes: cook,
    totalMinutes: Number(r.totalMinutes ?? prep + cook),
  };
}

/** Parse one-recipe model output ({"recipe":R}, or a bare recipe object) into a
 * schema-valid recipe. Returns null if it can't be parsed or fails the schema,
 * so the caller retries rather than letting one bad field fail the whole set. */
function coerceOneRecipe(
  text: string,
  role: "fastest" | "best" | "different",
): GeneratedRecipe | null {
  let obj: Record<string, unknown> = {};
  try {
    obj = extractJson(text) as Record<string, unknown>;
  } catch {
    return null;
  }
  const raw = (obj.recipe as Record<string, unknown>) ?? obj;
  if (!raw || typeof raw !== "object" || !raw.title) return null;
  const parsed = GeneratedRecipe.safeParse(normalizeRecipe(raw, 0, role));
  return parsed.success ? parsed.data : null;
}
