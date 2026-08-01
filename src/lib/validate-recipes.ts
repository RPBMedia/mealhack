import type { GeneratedRecipe, Preferences } from "@/lib/schemas";

const MEAT = /chicken|beef|pork|lamb|bacon|ham|sausage|turkey|meat|mince|steak/i;
const FISH = /fish|salmon|tuna|cod|prawn|shrimp|anchov|seafood/i;
const ANIMAL = /milk|cheese|butter|cream|yogh?urt|egg|honey/i;

const norm = (s: string) => s.toLowerCase().replace(/\s*\(.*\)\s*/g, "").trim();

export interface RecipeValidation {
  ok: boolean;
  errors: string[];
}

/** Programmatic checks run before any recipe is shown (spec §6.8). */
export function validateRecipe(
  r: GeneratedRecipe,
  prefs: Preferences,
): RecipeValidation {
  const errors: string[] = [];

  if (r.totalMinutes < r.prepMinutes + r.cookMinutes)
    errors.push("total time is less than prep + cook");

  // step numbering must be 1..n sequential
  r.steps.forEach((s, i) => {
    if (s.number !== i + 1) errors.push(`step ${i + 1} is misnumbered`);
  });

  // a missing ingredient must not also be listed as used/available
  const usedSet = new Set(r.usesIngredients.map((u) => norm(u.name)));
  for (const m of r.missingRequired) {
    if (usedSet.has(norm(m.name)))
      errors.push(`"${m.name}" is both used and missing`);
  }

  // every used ingredient must appear somewhere in the method
  const method = r.steps.map((s) => norm(s.instruction)).join(" | ");
  for (const u of r.usesIngredients) {
    if (!method.includes(norm(u.name)))
      errors.push(`"${u.name}" never appears in the steps`);
  }

  // dietary restrictions
  const usedNames = r.usesIngredients.map((u) => u.name);
  const diet = prefs.diet.map((d) => d.toLowerCase());
  if (diet.includes("vegetarian") || diet.includes("vegan")) {
    const bad = usedNames.find((n) => MEAT.test(n) || FISH.test(n));
    if (bad) errors.push(`contains "${bad}" but diet is meat-free`);
  }
  if (diet.includes("vegan")) {
    const bad = usedNames.find((n) => ANIMAL.test(n));
    if (bad) errors.push(`contains "${bad}" but diet is vegan`);
  }

  // allergens must never be present
  for (const a of prefs.allergies) {
    const key = a.trim();
    if (!key) continue;
    const bad = usedNames.find((n) => norm(n).includes(key.toLowerCase()));
    if (bad) errors.push(`contains "${bad}" which conflicts with allergy "${a}"`);
  }

  return { ok: errors.length === 0, errors };
}

/** The trio must be present, valid, and meaningfully distinct. */
export function validateRecipeSet(
  recipes: GeneratedRecipe[],
  prefs: Preferences,
): RecipeValidation {
  const errors: string[] = [];
  if (recipes.length !== 3) errors.push("expected exactly 3 recipes");
  recipes.forEach((r, i) => {
    const v = validateRecipe(r, prefs);
    if (!v.ok) errors.push(`recipe ${i + 1}: ${v.errors.join("; ")}`);
  });
  const titles = new Set(recipes.map((r) => norm(r.title)));
  if (titles.size < recipes.length) errors.push("recipes are not distinct");
  return { ok: errors.length === 0, errors };
}
