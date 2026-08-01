# Mealhack — Supabase setup (accounts & personalization)

Accounts are **optional**: Mealhack works fully anonymously without any of this.
When these env vars are present, sign-in, saved recipes and saved preferences
light up. Do it in a spare Supabase project first if you like.

Nothing secret here goes in the browser except the **anon** key (which is meant
to be public and is protected by row-level security). The **service-role** key
is server-only.

---

## 1. Create a Supabase project

[supabase.com](https://supabase.com) → **New project**. Note the project's
region and database password.

## 2. Run the migration

Dashboard → **SQL Editor** → **New query** → paste and run the contents of
`supabase/migrations/0001_accounts.sql` (creates `saved_recipes` and
`user_preferences` with row-level security). You should see "Success".

## 3. Grab your keys

**Project Settings → API**:
- **Project URL** → `https://<ref>.supabase.co`
- **anon public** key → safe for the browser
- **service_role** secret key → server-only (⚠️ never expose to the client)

## 4. Configure auth providers

**Authentication → Providers**:
- **Email** — enable; the app uses **magic links** (no passwords). Under
  **Email Auth**, keep "Confirm email" on.
- **Google** — enable and paste a Google OAuth **Client ID + Secret**
  (Google Cloud Console → Credentials → OAuth client, type *Web application*).
  In Google, add the Supabase callback as an authorized redirect URI:
  `https://<ref>.supabase.co/auth/v1/callback`.
- (Apple can be added later — see spec §29.)

**Authentication → URL Configuration**:
- **Site URL:** `https://mealhack.vercel.app`
- **Redirect URLs:** add `https://mealhack.vercel.app/account` and
  `http://localhost:3000/account` (magic-link / OAuth return here).

## 5. Set environment variables (Vercel → Settings → Environment Variables)

Production **and** Preview:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | your Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | your service_role secret (for account deletion) |

For local dev, put the same in `.env.local`.

## 6. Redeploy

Env-var changes need a fresh deploy. Vercel → Deployments → ⋯ → **Redeploy**.

---

## Test

1. Open the site → **Sign in** (top right) → Google or email magic link.
2. Generate recipes → open one → **♡ Save** → it appears under **Saved**.
3. On the preferences screen, tick **"Remember these as my defaults"**; next
   time they pre-fill.
4. **Account → Delete my account** removes your data and auth user.

Rows are protected by RLS, so each account only ever sees its own data.
