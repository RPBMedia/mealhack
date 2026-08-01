/** AI provider abstraction (spec §11). All AI runs server-side behind this
 * interface so the real Anthropic implementation can drop in later without
 * touching the routes or UI. For M1 we use a deterministic mock. */
import { AnalyzeResponse, GenerateRecipesResponse } from "@/lib/schemas";
import { nextMockDetection } from "./fixtures";
import { mockGenerateRecipes, type GenerateInput } from "./recipe-fixtures";
import { anthropicProvider } from "./anthropic";

export interface InputImage {
  /** base64-encoded image bytes. */
  data: string;
  /** e.g. "image/jpeg". */
  mediaType: string;
}

export interface AnalyzeInput {
  /** Submitted images (the mock ignores pixels; the real provider reads them). */
  images: InputImage[];
}

export interface AiProvider {
  readonly name: string;
  analyzeIngredients(input: AnalyzeInput): Promise<AnalyzeResponse>;
  generateRecipes(input: GenerateInput): Promise<GenerateRecipesResponse>;
}

const mockProvider: AiProvider = {
  name: "mock-fixtures-1",
  async analyzeIngredients() {
    // Simulate processing latency so the scanning state is visible.
    await new Promise((r) => setTimeout(r, 900));
    return AnalyzeResponse.parse({
      ingredients: nextMockDetection(),
      modelName: "mock-fixtures-1",
    });
  },
  async generateRecipes(input) {
    await new Promise((r) => setTimeout(r, 1100));
    return GenerateRecipesResponse.parse({
      recipes: mockGenerateRecipes(input),
      modelName: "mock-fixtures-1",
    });
  },
};

/** Choose the provider: real Claude when a key is present (and not explicitly
 * forced to mock), otherwise the deterministic mock so the app runs with no
 * keys. */
export function getProvider(): AiProvider {
  if (process.env.MEALHACK_AI !== "mock" && process.env.ANTHROPIC_API_KEY) {
    return anthropicProvider;
  }
  return mockProvider;
}
