"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, ButtonLink, Container, Logo } from "@/components/ui";
import { useMealSession } from "@/lib/session";
import type { GeneratedRecipe, RecipeIngredient } from "@/lib/schemas";
import { track } from "@/lib/analytics";

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useMealSession();
  const recipe = session.recipes.find((r) => r.id === id);

  if (!recipe) {
    return (
      <Shell>
        <div className="py-16 text-center">
          <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-700 text-ink">
            Recipe not found
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-ink-soft">
            It may have been regenerated. Head back to your recipes.
          </p>
          <div className="mt-6">
            <ButtonLink href="/recipes">← Back to recipes</ButtonLink>
          </div>
        </div>
      </Shell>
    );
  }

  function startCooking(r: GeneratedRecipe) {
    track("cooking_started", { role: r.role });
    router.push(`/cook/${r.id}`);
  }

  return (
    <Shell>
      <div className="pb-32 pt-4">
        <Link href="/recipes" className="text-sm font-600 text-ink-soft hover:text-ink">
          ← All recipes
        </Link>

        <h1 className="mt-3 font-[family-name:var(--font-fraunces)] text-3xl font-700 leading-tight text-ink">
          {recipe.title}
        </h1>
        <p className="mt-2 text-ink-soft">{recipe.summary}</p>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft">
          <span>⏱️ {recipe.totalMinutes} min ({recipe.prepMinutes} prep + {recipe.cookMinutes} cook)</span>
          <span className="capitalize">🔥 {recipe.difficulty}</span>
          <span>🍽️ {recipe.servings} servings</span>
        </div>

        {/* ingredients */}
        <Group title="What you have">
          {recipe.usesIngredients.map((i, k) => (
            <IngredientRow key={k} ing={i} />
          ))}
        </Group>
        {recipe.pantryStaples.length > 0 && (
          <Group title="Pantry staples">
            {recipe.pantryStaples.map((i, k) => (
              <IngredientRow key={k} ing={i} muted />
            ))}
          </Group>
        )}
        {recipe.missingRequired.length > 0 && (
          <Group title="You'll need to add" tone="alert">
            {recipe.missingRequired.map((i, k) => (
              <IngredientRow key={k} ing={i} tone="alert" />
            ))}
          </Group>
        )}

        {recipe.substitutions.length > 0 && (
          <Note title="Substitutions">
            <ul className="space-y-1">
              {recipe.substitutions.map((s, k) => (
                <li key={k}>
                  No {s.ingredient}? Use {s.substituteWith}.
                  {s.note ? ` ${s.note}` : ""}
                </li>
              ))}
            </ul>
          </Note>
        )}

        {recipe.equipment.length > 0 && (
          <Note title="Equipment">{recipe.equipment.join(" · ")}</Note>
        )}

        {/* steps preview */}
        <h2 className="mt-8 font-[family-name:var(--font-fraunces)] text-xl font-700 text-ink">
          Method
        </h2>
        <ol className="mt-3 space-y-3">
          {recipe.steps.map((s) => (
            <li key={s.number} className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-basil text-sm font-700 text-white">
                {s.number}
              </span>
              <div>
                <p className="text-ink">{s.instruction}</p>
                {s.safetyNote && (
                  <p className="mt-1 text-sm text-tomato">⚠️ {s.safetyNote}</p>
                )}
              </div>
            </li>
          ))}
        </ol>

        {recipe.childVariation && (
          <Note title="👶 For children">{recipe.childVariation}</Note>
        )}
        {recipe.safetyNotes.length > 0 && (
          <Note title="Food safety" tone="alert">
            <ul className="space-y-1">
              {recipe.safetyNotes.map((s, k) => (
                <li key={k}>{s}</li>
              ))}
            </ul>
          </Note>
        )}
        {recipe.storageAdvice && <Note title="Storage">{recipe.storageAdvice}</Note>}
        {recipe.leftoverAdvice && <Note title="Leftovers">{recipe.leftoverAdvice}</Note>}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-salt/90 backdrop-blur">
        <Container className="py-4">
          <Button className="w-full" onClick={() => startCooking(recipe)}>
            👩‍🍳 Start cooking
          </Button>
        </Container>
      </div>
    </Shell>
  );
}

function IngredientRow({ ing, muted, tone }: { ing: RecipeIngredient; muted?: boolean; tone?: "alert" }) {
  return (
    <li className="flex items-center justify-between py-1.5">
      <span className={tone === "alert" ? "text-tomato" : muted ? "text-ink-soft" : "text-ink"}>
        {ing.name}
      </span>
      {ing.quantity && <span className="text-sm text-ink-faint">{ing.quantity}</span>}
    </li>
  );
}

function Group({ title, tone, children }: { title: string; tone?: "alert"; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className={`text-sm font-700 uppercase tracking-wider ${tone === "alert" ? "text-tomato" : "text-ink-soft"}`}>
        {title}
      </h2>
      <ul className="mt-1 divide-y divide-line rounded-2xl bg-paper px-4 ring-1 ring-line">
        {children}
      </ul>
    </section>
  );
}

function Note({ title, tone, children }: { title: string; tone?: "alert"; children: React.ReactNode }) {
  return (
    <div className={`mt-4 rounded-2xl p-4 ${tone === "alert" ? "bg-tomato/8 ring-1 ring-tomato/20" : "bg-paper-sunk"}`}>
      <div className={`text-sm font-700 ${tone === "alert" ? "text-tomato" : "text-ink"}`}>{title}</div>
      <div className="mt-1 text-sm text-ink-soft">{children}</div>
    </div>
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
        </Container>
      </header>
      <main className="flex-1">
        <Container>{children}</Container>
      </main>
    </>
  );
}
