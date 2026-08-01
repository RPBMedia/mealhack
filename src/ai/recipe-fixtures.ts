import type {
  GeneratedRecipe,
  Preferences,
  RecipeIngredient,
  RecipeStep,
} from "@/lib/schemas";
import { DEFAULT_STAPLES } from "@/lib/staples";

export interface GenerateInput {
  available: { name: string; useFirst: boolean }[];
  staples: string[]; // enabled optional staples
  prefs: Preferences;
}

/** Deterministic mock recipe engine. Builds three coherent, meaningfully
 * different recipes from the actual confirmed ingredients so the whole flow +
 * validation can be exercised before the real model is wired in. */
export function mockGenerateRecipes(input: GenerateInput): GeneratedRecipe[] {
  const { prefs } = input;
  // use-first ingredients come first
  const names = [...input.available]
    .sort((a, b) => Number(b.useFirst) - Number(a.useFirst))
    .map((a) => a.name);
  const heroes = names.length ? names : ["your ingredients"];
  const staples = [...DEFAULT_STAPLES, ...input.staples];
  const cap = prefs.maxMinutes ?? 60;

  const fastest = build({
    role: "fastest",
    title: `Quick ${cut(heroes[0])} skillet`,
    summary: `A fast, low-mess skillet that leans on your ${listNatural(heroes.slice(0, 2))}.`,
    used: heroes.slice(0, Math.min(3, heroes.length)),
    prep: 5,
    cook: Math.min(10, Math.max(8, cap - 5)),
    difficulty: "easy",
    staples,
    prefs,
    why: ["Ready fastest", "Few steps and one pan"],
  });

  const best = build({
    role: "best",
    title: `${cut(heroes[0])} traybake`,
    summary: `A balanced dinner that makes the most of what you have.`,
    used: heroes.slice(0, Math.min(5, heroes.length)),
    prep: 10,
    cook: Math.min(cap - 10 > 0 ? cap - 10 : 20, 25),
    difficulty: prefs.effort === "great" ? "medium" : "easy",
    staples,
    prefs,
    missingReq: heroes.length < 2 ? ["a fresh vegetable"] : [],
    why: ["Best overall match", "Uses the most of your ingredients"],
  });

  const different = build({
    role: "different",
    title: `${cut(heroes[0])} frittata`,
    summary: `A comforting, slightly different take you can serve warm or cold.`,
    used: heroes.slice(0, Math.min(4, heroes.length)),
    prep: 10,
    cook: Math.min(20, cap - 10 > 0 ? cap - 10 : 20),
    difficulty: "medium",
    staples,
    prefs,
    missingReq: names.some((n) => /egg/i.test(n)) ? [] : ["eggs"],
    why: ["Something a little different", "Great for using odds and ends"],
  });

  return [fastest, best, different];
}

function build(o: {
  role: GeneratedRecipe["role"];
  title: string;
  summary: string;
  used: string[];
  prep: number;
  cook: number;
  difficulty: GeneratedRecipe["difficulty"];
  staples: string[];
  prefs: Preferences;
  missingReq?: string[];
  why: string[];
}): GeneratedRecipe {
  const missingRequired: RecipeIngredient[] = (o.missingReq ?? []).map((n) => ({
    name: n,
  }));
  const steps = buildSteps(o.used, missingRequired.map((m) => m.name), o.cook);
  const safetyNotes = o.used.some((n) => /chicken|meat|pork|beef|fish|egg/i.test(n))
    ? [
        "Cook meat, poultry, fish and eggs through until piping hot before serving.",
      ]
    : [];
  const childVariation = o.prefs.childFriendly
    ? "Set aside a portion for children before adding strong seasoning or chilli."
    : undefined;

  return {
    id: `${o.role}-${Math.random().toString(36).slice(2, 8)}`,
    role: o.role,
    title: o.title,
    summary: o.summary,
    servings: o.prefs.servings,
    prepMinutes: o.prep,
    cookMinutes: o.cook,
    totalMinutes: o.prep + o.cook,
    difficulty: o.difficulty,
    matchScore: clamp(
      o.used.length / (o.used.length + missingRequired.length + 0.5),
    ),
    usesIngredients: o.used.map((n) => ({ name: n, quantity: portion(n) })),
    pantryStaples: o.staples
      .filter((s) => ["salt", "black pepper", "cooking oil"].includes(s))
      .map((n) => ({ name: n, quantity: n === "cooking oil" ? "1 tbsp" : "to taste" })),
    missingRequired,
    missingOptional: [],
    substitutions: missingRequired.length
      ? [
          {
            ingredient: missingRequired[0].name,
            substituteWith: "anything similar you have",
            note: "Optional — the dish still works without it.",
          },
        ]
      : [],
    equipment: ["pan or oven tray", "knife", "chopping board"],
    steps,
    childVariation,
    storageAdvice: "Keeps in the fridge for up to 2 days in a sealed container.",
    leftoverAdvice: "Reheat until piping hot; add a splash of water if it dries out.",
    safetyNotes,
    whyItFits: o.why,
  };
}

function buildSteps(
  used: string[],
  missing: string[],
  cook: number,
): RecipeStep[] {
  const steps: RecipeStep[] = [];
  let n = 1;
  steps.push({
    number: n++,
    instruction: `Prep everything first: roughly chop ${listNatural(used) || "your ingredients"} so it's all within reach.`,
  });
  steps.push({
    number: n++,
    instruction:
      "Warm 1 tbsp of cooking oil in a pan over medium heat.",
  });
  for (const ing of used) {
    steps.push({
      number: n++,
      instruction: `Add the ${ing} and cook, stirring now and then, until it softens and takes on a little colour.`,
    });
  }
  if (missing.length) {
    steps.push({
      number: n++,
      instruction: `If you have ${listNatural(missing)}, stir it in now — otherwise skip it, the dish still works.`,
    });
  }
  steps.push({
    number: n,
    instruction:
      "Season with salt and pepper to taste, cook through until piping hot, then serve.",
    durationMinutes: Math.max(2, Math.round(cook / 3)),
    timerRecommended: true,
  });
  return steps;
}

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const cut = (s: string) => s.replace(/\s*\(.*\)\s*/g, "").trim();
function portion(name: string) {
  if (/oil|salt|pepper|sauce|vinegar/i.test(name)) return "to taste";
  return "as available";
}
function listNatural(items: string[]): string {
  const a = items.map(cut).filter(Boolean);
  if (a.length === 0) return "";
  if (a.length === 1) return a[0];
  return `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`;
}
