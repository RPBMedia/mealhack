/** Pantry staples (spec §6.5). Kept in a plain (non-client) module so both
 * server code (recipe generation) and client components can import them. */

export const DEFAULT_STAPLES = ["salt", "black pepper", "cooking oil", "water"];

export const OPTIONAL_STAPLES = [
  "butter",
  "flour",
  "sugar",
  "garlic",
  "onions",
  "rice",
  "pasta",
  "soy sauce",
  "vinegar",
  "dried herbs",
  "common spices",
];
