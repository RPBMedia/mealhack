import type { DetectedIngredient } from "@/lib/schemas";

/** Deterministic mock detections used until the real vision model is wired in.
 * Includes a couple of low-confidence items to exercise the confirmation UI. */
export const MOCK_DETECTION_SETS: DetectedIngredient[][] = [
  [
    { id: "d1", name: "Tomatoes", category: "produce", confidence: 0.95, estimatedQuantity: "4–5", state: "fresh", sourceImageIndex: 0, requiresConfirmation: false },
    { id: "d2", name: "Yellow onion", category: "produce", confidence: 0.9, estimatedQuantity: "1", state: "fresh", sourceImageIndex: 0, requiresConfirmation: false },
    { id: "d3", name: "Eggs", category: "egg", confidence: 0.88, estimatedQuantity: "about 6", state: "fresh", sourceImageIndex: 0, requiresConfirmation: false },
    { id: "d4", name: "Feta cheese", category: "dairy", confidence: 0.82, estimatedQuantity: "1 block", state: "opened", sourceImageIndex: 1, requiresConfirmation: false },
    { id: "d5", name: "Fresh basil", category: "produce", confidence: 0.6, state: "fresh", sourceImageIndex: 1, requiresConfirmation: true },
    { id: "d6", name: "Garlic", category: "produce", confidence: 0.71, estimatedQuantity: "1 bulb", state: "fresh", sourceImageIndex: 0, requiresConfirmation: false },
    { id: "d7", name: "Leafy greens (spinach?)", category: "produce", confidence: 0.48, state: "fresh", sourceImageIndex: 1, requiresConfirmation: true },
  ],
  [
    { id: "d1", name: "Chicken thighs", category: "meat", confidence: 0.86, estimatedQuantity: "4", state: "fresh", sourceImageIndex: 0, requiresConfirmation: false },
    { id: "d2", name: "Bell pepper", category: "produce", confidence: 0.92, estimatedQuantity: "2", state: "fresh", sourceImageIndex: 0, requiresConfirmation: false },
    { id: "d3", name: "Rice", category: "grain", confidence: 0.8, estimatedQuantity: "1 bag", state: "unknown", sourceImageIndex: 1, requiresConfirmation: false },
    { id: "d4", name: "Soy sauce", category: "condiment", confidence: 0.78, state: "opened", sourceImageIndex: 1, requiresConfirmation: false },
    { id: "d5", name: "Spring onion", category: "produce", confidence: 0.55, state: "fresh", sourceImageIndex: 0, requiresConfirmation: true },
    { id: "d6", name: "Unlabelled jar", category: "packaged", confidence: 0.35, sourceImageIndex: 1, requiresConfirmation: true },
  ],
];

let cursor = 0;
export function nextMockDetection(): DetectedIngredient[] {
  const set = MOCK_DETECTION_SETS[cursor % MOCK_DETECTION_SETS.length];
  cursor++;
  // fresh copies so callers can't mutate the fixtures
  return set.map((i) => ({ ...i }));
}
