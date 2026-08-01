"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, ButtonLink, Card, Container, Logo } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useMealSession } from "@/lib/session";
import { listSavedRecipes } from "@/lib/account-data";
import { SignInSheet } from "@/components/SignInSheet";
import type { GeneratedRecipe } from "@/lib/schemas";

export default function SavedPage() {
  const router = useRouter();
  const { account, accountsAvailable, loading } = useAuth();
  const { session, update } = useMealSession();
  const [recipes, setRecipes] = useState<GeneratedRecipe[] | null>(null);
  const [signIn, setSignIn] = useState(false);

  useEffect(() => {
    if (!account) {
      setRecipes([]);
      return;
    }
    void listSavedRecipes().then(setRecipes);
  }, [account]);

  function open(r: GeneratedRecipe) {
    if (!session.recipes.some((x) => x.id === r.id)) {
      update({ recipes: [...session.recipes, r] });
    }
    router.push(`/recipes/${r.id}`);
  }

  return (
    <>
      <header className="border-b border-line">
        <Container className="flex items-center justify-between py-4">
          <Link href="/" aria-label="Mealhack home">
            <Logo className="text-xl" />
          </Link>
          {account && (
            <Link href="/account" className="text-sm font-600 text-ink-soft hover:text-ink">
              Account
            </Link>
          )}
        </Container>
      </header>

      <main className="flex-1 pb-16">
        <Container className="pt-6">
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-700 text-ink">
            Saved recipes
          </h1>

          {!accountsAvailable ? (
            <Empty>Saving recipes will arrive once accounts are enabled.</Empty>
          ) : loading || recipes === null ? (
            <Empty>Loading…</Empty>
          ) : !account ? (
            <div className="mt-8 text-center">
              <div className="text-4xl">🔖</div>
              <p className="mx-auto mt-2 max-w-xs text-ink-soft">
                Sign in to save recipes and find them here across your devices.
              </p>
              <Button className="mt-5" onClick={() => setSignIn(true)}>
                Sign in
              </Button>
            </div>
          ) : recipes.length === 0 ? (
            <div className="mt-8 text-center">
              <div className="text-4xl">🍽️</div>
              <p className="mx-auto mt-2 max-w-xs text-ink-soft">
                No saved recipes yet. Tap ♡ Save on any recipe to keep it here.
              </p>
              <ButtonLink href="/scan" className="mt-5">
                📷 Scan ingredients
              </ButtonLink>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {recipes.map((r) => (
                <Card key={r.id} className="overflow-hidden">
                  <button onClick={() => open(r)} className="block w-full p-5 text-left">
                    <h2 className="font-[family-name:var(--font-fraunces)] text-lg font-700 text-ink">
                      {r.title}
                    </h2>
                    <p className="mt-1 text-sm text-ink-soft line-clamp-2">{r.summary}</p>
                    <div className="mt-2 text-sm text-ink-soft">
                      ⏱️ {r.totalMinutes} min · <span className="capitalize">{r.difficulty}</span>
                    </div>
                  </button>
                </Card>
              ))}
            </div>
          )}
        </Container>
      </main>

      <SignInSheet open={signIn} onClose={() => setSignIn(false)} reason="Sign in to see your saved recipes" />
    </>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="mt-8 text-center text-ink-soft">{children}</p>;
}
