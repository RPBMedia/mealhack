import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Accounts + persistence light up only when Supabase is configured. The whole
 * anonymous journey works without it. */
export const supabaseConfigured = Boolean(url && anon);

let client: SupabaseClient | null = null;

/** Browser Supabase client (null when not configured). Session is persisted in
 * the browser; RLS protects every user's rows. */
export function supabase(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  if (!client) {
    client = createClient(url!, anon!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
