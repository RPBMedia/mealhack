import { describe, expect, it } from "vitest";
import { validateRecipe, validateRecipeSet } from "./validate-recipes";
import { DEFAULT_PREFERENCES, type GeneratedRecipe, type Preferences } from "./schemas";

function validRecipe(over: Partial<GeneratedRecipe> = {}): GeneratedRecipe {
  return {
    id: "r1",
    role: "best",
    title: "Tomato & onion skillet",
    summary: "A simple skillet.",
    servings: 2,
    prepMinutes: 5,
    cookMinutes: 10,
    totalMinutes: 15,
    difficulty: "easy",
    matchScore: 0.9,
    usesIngredients: [{ name: "Tomatoes" }, { name: "Onion" }],
    pantryStaples: [{ name: "salt", quantity: "to taste" }],
    missingRequired: [],
    missingOptional: [],
    substitutions: [],
    equipment: ["pan"],
    steps: [
      { number: 1, instruction: "Chop the tomatoes and onion." },
      { number: 2, instruction: "Fry the tomatoes and onion until soft, then serve." },
    ],
    safetyNotes: [],
    whyItFits: [],
    ...over,
  };
}

const prefs = (over: Partial<Preferences> = {}): Preferences => ({
  ...DEFAULT_PREFERENCES,
  ...over,
});

describe("validateRecipe", () => {
  it("accepts a coherent recipe", () => {
    expect(validateRecipe(validRecipe(), prefs()).ok).toBe(true);
  });

  it("rejects impossible total time", () => {
    const v = validateRecipe(validRecipe({ totalMinutes: 8 }), prefs());
    expect(v.ok).toBe(false);
    expect(v.errors.join()).toMatch(/total time/);
  });

  it("rejects a used ingredient missing from the method", () => {
    const v = validateRecipe(
      validRecipe({ usesIngredients: [{ name: "Tomatoes" }, { name: "Halloumi" }] }),
      prefs(),
    );
    expect(v.ok).toBe(false);
    expect(v.errors.join()).toMatch(/Halloumi/);
  });

  it("accepts plural/descriptor ingredients named more loosely in the steps", () => {
    const v = validateRecipe(
      validRecipe({
        usesIngredients: [{ name: "Eggs" }, { name: "Feta cheese" }],
        steps: [
          { number: 1, instruction: "Beat the egg in a bowl." },
          { number: 2, instruction: "Crumble the feta over the top and serve." },
        ],
      }),
      prefs(),
    );
    expect(v.ok).toBe(true);
  });

  it("rejects an ingredient that conflicts with an allergy", () => {
    const v = validateRecipe(
      validRecipe({
        usesIngredients: [{ name: "Peanut butter" }],
        steps: [{ number: 1, instruction: "Spread the peanut butter and serve." }],
      }),
      prefs({ allergies: ["peanut"] }),
    );
    expect(v.ok).toBe(false);
    expect(v.errors.join()).toMatch(/allerg/i);
  });

  it("rejects meat when the diet is vegetarian", () => {
    const v = validateRecipe(
      validRecipe({
        usesIngredients: [{ name: "Chicken breast" }],
        steps: [{ number: 1, instruction: "Cook the chicken breast through, then serve." }],
      }),
      prefs({ diet: ["vegetarian"] }),
    );
    expect(v.ok).toBe(false);
    expect(v.errors.join()).toMatch(/meat-free/);
  });

  it("rejects a missing ingredient also listed as used", () => {
    const v = validateRecipe(
      validRecipe({ missingRequired: [{ name: "Tomatoes" }] }),
      prefs(),
    );
    expect(v.ok).toBe(false);
    expect(v.errors.join()).toMatch(/both used and missing/);
  });
});

describe("validateRecipeSet", () => {
  it("needs exactly three distinct recipes", () => {
    const three = [
      validRecipe({ id: "a", title: "One" }),
      validRecipe({ id: "b", title: "Two" }),
      validRecipe({ id: "c", title: "Three" }),
    ];
    expect(validateRecipeSet(three, prefs()).ok).toBe(true);
    expect(validateRecipeSet(three.slice(0, 2), prefs()).ok).toBe(false);

    const dupes = [
      validRecipe({ id: "a", title: "Same" }),
      validRecipe({ id: "b", title: "Same" }),
      validRecipe({ id: "c", title: "Diff" }),
    ];
    expect(validateRecipeSet(dupes, prefs()).ok).toBe(false);
  });
});
