"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Container, Logo } from "@/components/ui";
import {
  DEFAULT_STAPLES,
  OPTIONAL_STAPLES,
  useMealSession,
} from "@/lib/session";
import {
  CATEGORY_EMOJI,
  type ConfirmedIngredient,
  type IngredientState,
} from "@/lib/schemas";
import { track } from "@/lib/analytics";

const STATES: IngredientState[] = ["fresh", "frozen", "cooked", "opened", "unknown"];

export default function ConfirmPage() {
  const router = useRouter();
  const { session, setConfirmed, setStaples } = useMealSession();
  const [items, setItems] = useState<ConfirmedIngredient[]>(session.confirmed);
  const [newName, setNewName] = useState("");

  // keep local list in sync if the session loads after mount
  useEffect(() => {
    if (session.confirmed.length && items.length === 0)
      setItems(session.confirmed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.confirmed]);

  function commit(next: ConfirmedIngredient[]) {
    setItems(next);
    setConfirmed(next);
  }
  const patch = (id: string, p: Partial<ConfirmedIngredient>) =>
    commit(items.map((i) => (i.id === id ? { ...i, ...p } : i)));
  const remove = (id: string) => commit(items.filter((i) => i.id !== id));

  function addManual() {
    const name = newName.trim();
    if (!name) return;
    commit([
      ...items,
      {
        id: `m-${Date.now()}`,
        name,
        category: "other",
        state: "unknown",
        useFirst: false,
        available: true,
        source: "manual",
      },
    ]);
    setNewName("");
  }

  function toggleStaple(s: string) {
    const on = session.staples.includes(s);
    setStaples(on ? session.staples.filter((x) => x !== s) : [...session.staples, s]);
  }

  function onContinue() {
    const available = items.filter((i) => i.available);
    track("ingredients_confirmed", { count: available.length });
    setConfirmed(items);
    router.push("/preferences");
  }

  const availableCount = items.filter((i) => i.available).length;

  if (session.confirmed.length === 0 && items.length === 0) {
    return (
      <EmptyConfirm />
    );
  }

  return (
    <>
      <header className="border-b border-line">
        <Container className="flex items-center justify-between py-4">
          <Link href="/" aria-label="Mealhack home">
            <Logo className="text-xl" />
          </Link>
          <Link href="/scan" className="text-sm font-600 text-basil hover:text-basil-strong">
            ↻ Rescan
          </Link>
        </Container>
      </header>

      <main className="flex-1 pb-32">
        <Container className="pt-6">
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-700 text-ink">
            Check your ingredients
          </h1>
          <p className="mt-1 text-ink-soft">
            Here&rsquo;s what Mealhack thinks you have. Fix anything before we
            cook — tap to edit, mark what to use first, or add what we missed.
          </p>

          {/* ingredient list */}
          <ul className="mt-5 space-y-2">
            {items.map((it) => {
              const low = it.confidence != null && it.confidence < 0.6;
              return (
                <li
                  key={it.id}
                  className={`rounded-2xl bg-paper p-3 ring-1 ${
                    it.available ? "ring-line" : "ring-line opacity-60"
                  } ${low ? "ring-tomato/40" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl" aria-hidden>
                      {CATEGORY_EMOJI[it.category]}
                    </span>
                    <input
                      value={it.name}
                      onChange={(e) => patch(it.id, { name: e.target.value })}
                      aria-label="Ingredient name"
                      className="min-w-0 flex-1 bg-transparent text-ink font-600 outline-none"
                    />
                    <button
                      onClick={() => remove(it.id)}
                      aria-label={`Remove ${it.name}`}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-faint hover:bg-paper-sunk hover:text-tomato"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 pl-9 text-sm">
                    {low && (
                      <span className="rounded-full bg-tomato/10 px-2 py-0.5 text-xs font-700 text-tomato">
                        Check this
                      </span>
                    )}
                    <select
                      value={it.state}
                      onChange={(e) =>
                        patch(it.id, { state: e.target.value as IngredientState })
                      }
                      aria-label="State"
                      className="rounded-full bg-paper-sunk px-2 py-1 text-ink-soft"
                    >
                      {STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => patch(it.id, { useFirst: !it.useFirst })}
                      className={`rounded-full px-2.5 py-1 font-600 ring-1 ${
                        it.useFirst
                          ? "bg-ember/15 text-ember ring-ember/30"
                          : "text-ink-soft ring-line"
                      }`}
                    >
                      ⏳ Use first
                    </button>
                    <button
                      onClick={() => patch(it.id, { available: !it.available })}
                      className={`rounded-full px-2.5 py-1 font-600 ring-1 ${
                        it.available
                          ? "text-ink-soft ring-line"
                          : "bg-paper-sunk text-ink-faint ring-line"
                      }`}
                    >
                      {it.available ? "Available" : "Unavailable"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* add manual */}
          <div className="mt-3 flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addManual()}
              placeholder="Add an ingredient…"
              aria-label="Add an ingredient"
              className="min-h-11 flex-1 rounded-full bg-paper px-4 text-ink ring-1 ring-line outline-none placeholder:text-ink-faint"
            />
            <Button variant="soft" onClick={addManual} disabled={!newName.trim()}>
              Add
            </Button>
          </div>

          {/* pantry staples */}
          <div className="mt-8">
            <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-600 text-ink">
              Pantry staples
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              We always assume you have{" "}
              <span className="text-ink">{DEFAULT_STAPLES.join(", ")}</span>. Tap
              any others you keep on hand.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {OPTIONAL_STAPLES.map((s) => {
                const on = session.staples.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleStaple(s)}
                    aria-pressed={on}
                    className={`rounded-full px-3 py-1.5 text-sm font-600 ring-1 ${
                      on
                        ? "bg-basil text-white ring-basil"
                        : "bg-paper text-ink-soft ring-line hover:bg-paper-sunk"
                    }`}
                  >
                    {on ? "✓ " : "+ "}
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </Container>
      </main>

      {/* sticky continue */}
      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-salt/90 backdrop-blur">
        <Container className="py-4">
          <Button
            className="w-full"
            disabled={availableCount === 0}
            onClick={onContinue}
          >
            Continue with {availableCount} ingredient
            {availableCount === 1 ? "" : "s"} →
          </Button>
        </Container>
      </div>
    </>
  );
}

function EmptyConfirm() {
  return (
    <>
      <header className="border-b border-line">
        <Container className="flex items-center justify-between py-4">
          <Link href="/" aria-label="Mealhack home">
            <Logo className="text-xl" />
          </Link>
        </Container>
      </header>
      <main className="flex flex-1 items-center justify-center py-16">
        <Container className="text-center">
          <div className="text-4xl">📷</div>
          <h1 className="mt-3 font-[family-name:var(--font-fraunces)] text-2xl font-700 text-ink">
            Nothing to confirm yet
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-ink-soft">
            Scan some ingredients first and we&rsquo;ll list what we find.
          </p>
          <div className="mt-6">
            <Link
              href="/scan"
              className="inline-flex min-h-12 items-center rounded-full bg-basil px-6 font-600 text-white"
            >
              📷 Scan ingredients
            </Link>
          </div>
        </Container>
      </main>
    </>
  );
}
