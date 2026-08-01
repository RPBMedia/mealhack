"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, ButtonLink, Card, Container, Logo } from "@/components/ui";
import { useMealSession } from "@/lib/session";
import { GenerateRecipesResponse, type GeneratedRecipe } from "@/lib/schemas";
import { track } from "@/lib/analytics";

const ROLE: Record<GeneratedRecipe["role"], { label: string; cls: string }> = {
  fastest: { label: "Fastest", cls: "bg-ember/15 text-ember" },
  best: { label: "Best match", cls: "bg-basil-tint text-basil-strong" },
  different: { label: "Something different", cls: "bg-tomato/12 text-tomato" },
};

export default function RecipesPage() {
  const router = useRouter();
  const { session, setRecipes } = useMealSession();
  const [busy, setBusy] = useState(false);

  if (session.recipes.length === 0) {
    return (
      <Shell>
        <div className="py-16 text-center">
          <div className="text-4xl">🍽️</div>
          <h1 className="mt-3 font-[family-name:var(--font-fraunces)] text-2xl font-700 text-ink">
            No recipes yet
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-ink-soft">
            Scan your ingredients and set your preferences to get three recipes.
          </p>
          <div className="mt-6">
            <ButtonLink href="/scan">📷 Scan ingredients</ButtonLink>
          </div>
        </div>
      </Shell>
    );
  }

  async function regenerate() {
    const available = session.confirmed
      .filter((i) => i.available)
      .map((i) => ({ name: i.name, useFirst: i.useFirst }));
    if (!available.length || !session.preferences) return;
    setBusy(true);
    try {
      const res = await fetch("/api/recipes/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ available, staples: session.staples, preferences: session.preferences }),
      });
      const json = await res.json();
      if (res.ok) setRecipes(GenerateRecipesResponse.parse(json).recipes);
    } finally {
      setBusy(false);
    }
  }

  function cook(r: GeneratedRecipe) {
    track("recipe_selected", { role: r.role });
    router.push(`/recipes/${r.id}`);
  }

  return (
    <Shell>
      <div className="pt-6">
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-700 text-ink">
          Three ways to dinner
        </h1>
        <p className="mt-1 text-ink-soft">
          From your {session.confirmed.filter((i) => i.available).length}{" "}
          ingredients. Pick one to cook.
        </p>

        <div className="mt-5 space-y-4">
          {session.recipes.map((r) => (
            <Card key={r.id} className="overflow-hidden">
              <button onClick={() => cook(r)} className="block w-full p-5 text-left">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-700 uppercase tracking-wider ${ROLE[r.role].cls}`}>
                    {ROLE[r.role].label}
                  </span>
                  {session.preferences?.childFriendly && r.childVariation && (
                    <span className="rounded-full bg-paper-sunk px-2.5 py-1 text-xs font-600 text-ink-soft">
                      👶 kid-friendly
                    </span>
                  )}
                  <span className="ml-auto text-sm font-600 text-ink-soft">
                    {Math.round(r.matchScore * 100)}% match
                  </span>
                </div>
                <h2 className="mt-2 font-[family-name:var(--font-fraunces)] text-xl font-700 text-ink">
                  {r.title}
                </h2>
                <p className="mt-1 text-sm text-ink-soft">{r.summary}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
                  <span>⏱️ {r.totalMinutes} min</span>
                  <span className="capitalize">🔥 {r.difficulty}</span>
                  <span>🧺 {r.usesIngredients.length} of yours</span>
                  {r.missingRequired.length > 0 && (
                    <span className="text-tomato">
                      🛒 {r.missingRequired.length} to buy
                    </span>
                  )}
                </div>
              </button>
              <div className="border-t border-line px-5 py-3">
                <Button className="w-full" onClick={() => cook(r)}>
                  Cook this →
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-6 flex justify-center">
          <Button variant="soft" onClick={regenerate} disabled={busy}>
            {busy ? "Regenerating…" : "↻ Regenerate all"}
          </Button>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-line">
        <Container className="flex items-center justify-between py-4">
          <Link href="/" aria-label="Mealhack home">
            <Logo className="text-xl" />
          </Link>
          <Link href="/preferences" className="text-sm font-600 text-ink-soft hover:text-ink">
            Preferences
          </Link>
        </Container>
      </header>
      <main className="flex-1 pb-16">
        <Container>{children}</Container>
      </main>
    </>
  );
}
