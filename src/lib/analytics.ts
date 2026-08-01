/** Analytics funnel (spec §19). Thin wrapper — PostHog is wired in later; for
 * now events are captured to a small dev log so the funnel is exercised. */
export type MealhackEvent =
  | "landing_viewed"
  | "scan_started"
  | "photo_added"
  | "scan_submitted"
  | "ingredients_detected"
  | "ingredients_confirmed"
  | "recipe_generation_started"
  | "recipes_generated"
  | "recipe_selected"
  | "cooking_started"
  | "recipe_cooked"
  | "recipe_saved"
  | "recipe_rated";

export function track(
  event: MealhackEvent,
  props?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined") return;
  // Placeholder until PostHog: keep a lightweight breadcrumb in dev.
  if (process.env.NODE_ENV !== "production") {
    console.debug("[mealhack:event]", event, props ?? {});
  }
}
