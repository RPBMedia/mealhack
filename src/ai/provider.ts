/** AI provider abstraction (spec §11). All AI runs server-side behind this
 * interface so the real Anthropic implementation can drop in later without
 * touching the routes or UI. For M1 we use a deterministic mock. */
import { AnalyzeResponse } from "@/lib/schemas";
import { nextMockDetection } from "./fixtures";

export interface AnalyzeInput {
  /** How many images were submitted (mock ignores pixels). */
  imageCount: number;
}

export interface AiProvider {
  readonly name: string;
  analyzeIngredients(input: AnalyzeInput): Promise<AnalyzeResponse>;
}

const mockProvider: AiProvider = {
  name: "mock-fixtures-1",
  async analyzeIngredients() {
    // Simulate processing latency so the scanning state is visible.
    await new Promise((r) => setTimeout(r, 900));
    const parsed = AnalyzeResponse.parse({
      ingredients: nextMockDetection(),
      modelName: "mock-fixtures-1",
    });
    return parsed;
  },
};

/** Choose the provider. Real Claude is added later, gated on ANTHROPIC_API_KEY
 * and MEALHACK_AI !== "mock". Until then, always the mock. */
export function getProvider(): AiProvider {
  return mockProvider;
}
