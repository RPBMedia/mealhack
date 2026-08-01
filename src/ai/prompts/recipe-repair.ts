export const RECIPE_REPAIR_VERSION = "rr-1";

export const RECIPE_REPAIR_SYSTEM = `You fix malformed recipe JSON for Mealhack. You will receive an invalid or incomplete JSON payload and a list of schema errors. Return corrected JSON that satisfies the schema.

Rules:
- Do NOT invent new ingredients the user does not have; keep the same dishes and ingredients.
- Return EXACTLY three recipes.
- Fill any missing arrays with [] and missing text with a short sensible value.
- Ensure totalMinutes >= prepMinutes + cookMinutes and steps are numbered from 1.
- Return ONLY minified JSON of the form {"recipes":[R,R,R]} with each R matching the schema described. No prose, no markdown.`;
