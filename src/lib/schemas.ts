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

// ---- preferences (spec §6.6) ------------------------------------------------

export const Effort = z.enum(["bare", "normal", "great"]);
export type Effort = z.infer<typeof Effort>;

export const MissingAllowance = z.enum(["none", "one", "few"]);
export type MissingAllowance = z.infer<typeof MissingAllowance>;

export const Preferences = z.object({
  servings: z.number().int().min(1).max(12),
  /** null = no strict limit. */
  maxMinutes: z.number().int().nullable(),
  effort: Effort,
  diet: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
  dislikes: z.array(z.string()).default([]),
  childFriendly: z.boolean().default(false),
  missing: MissingAllowance.default("one"),
});
export type Preferences = z.infer<typeof Preferences>;

export const DEFAULT_PREFERENCES: Preferences = {
  servings: 2,
  maxMinutes: 30,
  effort: "normal",
  diet: [],
  allergies: [],
  dislikes: [],
  childFriendly: false,
  missing: "one",
};

// ---- recipes (spec §6.7) ----------------------------------------------------

export const RecipeIngredient = z.object({
  name: z.string().min(1),
  quantity: z.string().optional(),
});
export type RecipeIngredient = z.infer<typeof RecipeIngredient>;

export const RecipeSubstitution = z.object({
  ingredient: z.string(),
  substituteWith: z.string(),
  note: z.string().optional(),
});
export type RecipeSubstitution = z.infer<typeof RecipeSubstitution>;

export const RecipeStep = z.object({
  number: z.number().int().positive(),
  instruction: z.string().min(1),
  durationMinutes: z.number().optional(),
  timerRecommended: z.boolean().optional(),
  safetyNote: z.string().optional(),
});
export type RecipeStep = z.infer<typeof RecipeStep>;

export const GeneratedRecipe = z.object({
  id: z.string(),
  role: z.enum(["fastest", "best", "different"]),
  title: z.string().min(1),
  summary: z.string(),
  servings: z.number().int().positive(),
  prepMinutes: z.number().min(0),
  cookMinutes: z.number().min(0),
  totalMinutes: z.number().min(0),
  difficulty: z.enum(["easy", "medium", "ambitious"]),
  matchScore: z.number().min(0).max(1),
  usesIngredients: z.array(RecipeIngredient),
  pantryStaples: z.array(RecipeIngredient),
  missingRequired: z.array(RecipeIngredient),
  missingOptional: z.array(RecipeIngredient),
  substitutions: z.array(RecipeSubstitution),
  equipment: z.array(z.string()),
  steps: z.array(RecipeStep).min(1),
  childVariation: z.string().optional(),
  adultVariation: z.string().optional(),
  storageAdvice: z.string().optional(),
  leftoverAdvice: z.string().optional(),
  safetyNotes: z.array(z.string()).default([]),
  whyItFits: z.array(z.string()).default([]),
});
export type GeneratedRecipe = z.infer<typeof GeneratedRecipe>;

export const GenerateRecipesResponse = z.object({
  recipes: z.array(GeneratedRecipe).length(3),
  modelName: z.string(),
});
export type GenerateRecipesResponse = z.infer<typeof GenerateRecipesResponse>;

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
