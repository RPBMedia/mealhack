"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, ButtonLink, Card, Container, Logo } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { SignInSheet } from "@/components/SignInSheet";

export default function AccountPage() {
  const router = useRouter();
  const { account, accountsAvailable, loading, signOut } = useAuth();
  const [signIn, setSignIn] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function deleteAccount() {
    if (!confirm("Permanently delete your account and all saved data? This can't be undone.")) return;
    setDeleting(true);
    setErr(null);
    try {
      const sb = supabase();
      const token = (await sb?.auth.getSession())?.data.session?.access_token;
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? "Delete failed.");
      await signOut();
      router.push("/");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed.");
      setDeleting(false);
    }
  }

  return (
    <>
      <header className="border-b border-line">
        <Container className="flex items-center justify-between py-4">
          <Link href="/" aria-label="Mealhack home">
            <Logo className="text-xl" />
          </Link>
          <Link href="/saved" className="text-sm font-600 text-ink-soft hover:text-ink">
            Saved
          </Link>
        </Container>
      </header>

      <main className="flex-1 pb-16">
        <Container className="pt-6">
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-700 text-ink">
            Account
          </h1>

          {!accountsAvailable ? (
            <p className="mt-6 text-ink-soft">
              Accounts are coming soon. You can cook without one — nothing is
              required to scan and get recipes.
            </p>
          ) : loading ? (
            <p className="mt-6 text-ink-soft">Loading…</p>
          ) : !account ? (
            <div className="mt-8 text-center">
              <div className="text-4xl">👋</div>
              <p className="mx-auto mt-2 max-w-xs text-ink-soft">
                Sign in to save recipes and keep your preferences across devices.
              </p>
              <Button className="mt-5" onClick={() => setSignIn(true)}>
                Sign in
              </Button>
            </div>
          ) : (
            <>
              <Card className="mt-6 flex items-center gap-4 p-5">
                <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-basil-tint text-2xl font-700 text-basil-strong">
                  {account.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={account.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    account.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-[family-name:var(--font-fraunces)] text-lg font-700 text-ink">
                    {account.name}
                  </div>
                  {account.email && (
                    <div className="truncate text-sm text-ink-soft">{account.email}</div>
                  )}
                </div>
              </Card>

              <div className="mt-4 grid gap-3">
                <ButtonLink href="/saved" variant="soft">
                  🔖 Saved recipes
                </ButtonLink>
                <Button variant="soft" onClick={() => void signOut()}>
                  Sign out
                </Button>
              </div>

              <div className="mt-10 rounded-2xl border border-tomato/20 bg-tomato/5 p-5">
                <h2 className="font-600 text-tomato">Delete account</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Permanently removes your account, saved recipes and preferences.
                </p>
                <Button
                  variant="soft"
                  className="mt-3 !bg-tomato !text-white"
                  disabled={deleting}
                  onClick={deleteAccount}
                >
                  {deleting ? "Deleting…" : "Delete my account"}
                </Button>
                {err && <p className="mt-2 text-sm font-600 text-tomato">{err}</p>}
              </div>
            </>
          )}
        </Container>
      </main>

      <SignInSheet open={signIn} onClose={() => setSignIn(false)} />
    </>
  );
}
