import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** POST /api/account/delete — deletes the signed-in user's data and auth
 * account. The caller proves identity with their access token; deletion uses
 * the service role (never exposed to the client). */
export async function POST(req: Request) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) {
    return NextResponse.json(
      { error: "Account deletion isn't configured." },
      { status: 501 },
    );
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const authed = createClient(url, anon);
  const {
    data: { user },
    error,
  } = await authed.auth.getUser(token);
  if (error || !user) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await admin.from("saved_recipes").delete().eq("user_id", user.id);
  await admin.from("user_preferences").delete().eq("user_id", user.id);
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
