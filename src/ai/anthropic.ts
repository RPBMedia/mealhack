import Anthropic from "@anthropic-ai/sdk";
import { AnalyzeResponse, GenerateRecipesResponse } from "@/lib/schemas";
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
    // Fan the three roles out into parallel single-recipe calls. Each is ~1/3
    // the output of a combined generation, so the whole set finishes in roughly
    // the time of the slowest one — keeping us well under the serverless budget
    // and isolating a truncation/parse failure to a single recipe.
    const roles = ["fastest", "best", "different"] as const;
    const user = recipeGenerationUser(input);
    const recipes = await Promise.all(roles.map((role) => genOneRecipe(user, role)));

    const parsed = GenerateRecipesResponse.safeParse({ recipes, modelName: model() });
    if (parsed.success) return parsed.data;
    throw new Error("recipe output failed schema after generation");
  },
};

/** Generate one recipe of the given role, with a single retry on parse
 * failure. The role is forced onto the result so the assembled set always has
 * one of each. */
async function genOneRecipe(
  user: string,
  role: "fastest" | "best" | "different",
): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const msg = await anthropic().messages.create({
      model: model(),
      max_tokens: 3000,
      system: singleRecipeSystem(role),
      messages: [{ role: "user", content: user }],
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
 * normalized recipe. Returns null if nothing usable could be extracted. */
function coerceOneRecipe(
  text: string,
  role: "fastest" | "best" | "different",
): Record<string, unknown> | null {
  let obj: Record<string, unknown> = {};
  try {
    obj = extractJson(text) as Record<string, unknown>;
  } catch {
    return null;
  }
  const raw = (obj.recipe as Record<string, unknown>) ?? obj;
  if (!raw || typeof raw !== "object" || !raw.title) return null;
  return normalizeRecipe(raw, 0, role);
}
