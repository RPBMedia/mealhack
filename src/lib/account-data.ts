import { supabase } from "@/lib/supabase";
import { Preferences, GeneratedRecipe } from "@/lib/schemas";

/** Saved recipes are stored as full snapshots (payload JSONB) since the
 * generated id is per-run. RLS ensures a user only sees their own rows. */

export async function saveRecipe(recipe: GeneratedRecipe): Promise<string | null> {
  const sb = supabase();
  if (!sb) return "Accounts aren't available.";
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return "Please sign in to save recipes.";
  const { error } = await sb.from("saved_recipes").upsert(
    {
      user_id: user.id,
      recipe_id: recipe.id,
      title: recipe.title,
      total_minutes: recipe.totalMinutes,
      payload: recipe,
    },
    { onConflict: "user_id,recipe_id" },
  );
  return error ? error.message : null;
}

export async function unsaveRecipe(recipeId: string): Promise<void> {
  const sb = supabase();
  if (!sb) return;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return;
  await sb
    .from("saved_recipes")
    .delete()
    .eq("user_id", user.id)
    .eq("recipe_id", recipeId);
}

export async function listSavedRecipes(): Promise<GeneratedRecipe[]> {
  const sb = supabase();
  if (!sb) return [];
  const { data } = await sb
    .from("saved_recipes")
    .select("payload")
    .order("created_at", { ascending: false });
  return (data ?? [])
    .map((row) => GeneratedRecipe.safeParse(row.payload))
    .filter((r) => r.success)
    .map((r) => r.data);
}

export async function savedRecipeIds(): Promise<Set<string>> {
  const sb = supabase();
  if (!sb) return new Set();
  const { data } = await sb.from("saved_recipes").select("recipe_id");
  return new Set((data ?? []).map((r) => r.recipe_id as string));
}

// ---- persistent preferences -------------------------------------------------

export async function saveDefaultPreferences(prefs: Preferences): Promise<void> {
  const sb = supabase();
  if (!sb) return;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return;
  await sb
    .from("user_preferences")
    .upsert({ user_id: user.id, preferences: prefs }, { onConflict: "user_id" });
}

export async function loadDefaultPreferences(): Promise<Preferences | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data } = await sb
    .from("user_preferences")
    .select("preferences")
    .maybeSingle();
  if (!data?.preferences) return null;
  const parsed = Preferences.safeParse(data.preferences);
  return parsed.success ? parsed.data : null;
}
