import Anthropic from "@anthropic-ai/sdk";
import { AnalyzeResponse, GenerateRecipesResponse } from "@/lib/schemas";
import type { AiProvider, AnalyzeInput } from "./provider";
import type { GenerateInput } from "./recipe-fixtures";
import {
  INGREDIENT_ANALYSIS_SYSTEM,
  INGREDIENT_ANALYSIS_USER,
} from "./prompts/ingredient-analysis";
import {
  RECIPE_GENERATION_SYSTEM,
  recipeGenerationUser,
} from "./prompts/recipe-generation";
import { RECIPE_REPAIR_SYSTEM } from "./prompts/recipe-repair";

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
      max_tokens: 1500,
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

    const obj = extractJson(textOf(msg)) as {
      ingredients?: Array<Record<string, unknown>>;
    };
    const ingredients = (obj.ingredients ?? []).map((i, idx) => ({
      ...i,
      id: (i.id as string) ?? `d${idx}`,
      requiresConfirmation:
        (i.requiresConfirmation as boolean) ??
        ((i.confidence as number) ?? 1) < 0.6,
    }));
    return AnalyzeResponse.parse({ ingredients, modelName: model() });
  },

  async generateRecipes(input: GenerateInput) {
    const first = await anthropic().messages.create({
      model: model(),
      max_tokens: 8000,
      system: RECIPE_GENERATION_SYSTEM,
      messages: [{ role: "user", content: recipeGenerationUser(input) }],
    });
    const firstText = textOf(first);

    const parsed = coerceRecipes(firstText);
    if (parsed.success) return parsed.data;

    // One repair attempt with the raw output + validation errors (spec §6.8).
    const repair = await anthropic().messages.create({
      model: model(),
      max_tokens: 8000,
      system: RECIPE_REPAIR_SYSTEM,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            invalidOutput: firstText.slice(0, 12000),
            schemaErrors: parsed.error.issues.slice(0, 12),
          }),
        },
      ],
    });
    const repaired = coerceRecipes(textOf(repair));
    if (repaired.success) return repaired.data;
    throw new Error("recipe output failed schema after repair");
  },
};

/** Parse model text into a validated recipes response, filling sane defaults
 * for fields models commonly omit. Returns a Zod SafeParse result. */
function coerceRecipes(text: string) {
  let obj: { recipes?: Array<Record<string, unknown>> } = {};
  try {
    obj = extractJson(text) as { recipes?: Array<Record<string, unknown>> };
  } catch {
    obj = {};
  }
  const recipes = (obj.recipes ?? []).map((r, idx) => {
    const prep = Number(r.prepMinutes ?? 0);
    const cook = Number(r.cookMinutes ?? 0);
    return {
      role: "best",
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
      id: (r.id as string) ?? `${(r.role as string) ?? "recipe"}-${idx}`,
      prepMinutes: prep,
      cookMinutes: cook,
      totalMinutes: Number(r.totalMinutes ?? prep + cook),
    };
  });
  return GenerateRecipesResponse.safeParse({ recipes, modelName: model() });
}
