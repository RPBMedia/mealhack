import { z } from "zod";

/** Ingredient categories (spec §6.3). */
export const IngredientCategory = z.enum([
  "produce",
  "meat",
  "fish",
  "dairy",
  "egg",
  "grain",
  "legume",
  "condiment",
  "spice",
  "leftover",
  "packaged",
  "other",
]);
export type IngredientCategory = z.infer<typeof IngredientCategory>;

export const IngredientState = z.enum([
  "fresh",
  "frozen",
  "cooked",
  "opened",
  "unknown",
]);
export type IngredientState = z.infer<typeof IngredientState>;

/** What the vision model returns for each detected item (spec §6.3). */
export const DetectedIngredient = z.object({
  id: z.string(),
  name: z.string().min(1),
  category: IngredientCategory,
  confidence: z.number().min(0).max(1),
  estimatedQuantity: z.string().optional(),
  state: IngredientState.optional(),
  sourceImageIndex: z.number().int().optional(),
  requiresConfirmation: z.boolean(),
});
export type DetectedIngredient = z.infer<typeof DetectedIngredient>;

export const AnalyzeResponse = z.object({
  ingredients: z.array(DetectedIngredient),
  modelName: z.string(),
});
export type AnalyzeResponse = z.infer<typeof AnalyzeResponse>;

/** The user-confirmed ingredient the recipe engine will use. */
export interface ConfirmedIngredient {
  id: string;
  name: string;
  category: IngredientCategory;
  state: IngredientState;
  useFirst: boolean;
  available: boolean;
  /** "detected" (from a photo) or "manual" (user-added). */
  source: "detected" | "manual";
  confidence?: number;
}

export const CATEGORY_EMOJI: Record<IngredientCategory, string> = {
  produce: "🥬",
  meat: "🥩",
  fish: "🐟",
  dairy: "🧀",
  egg: "🥚",
  grain: "🌾",
  legume: "🫘",
  condiment: "🧴",
  spice: "🧂",
  leftover: "🍱",
  packaged: "📦",
  other: "🍽️",
};
