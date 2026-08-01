"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Container, Logo } from "@/components/ui";
import { OPTIONAL_STAPLES, useMealSession, DEFAULT_STAPLES } from "@/lib/session";
import type { ConfirmedIngredient } from "@/lib/schemas";
import { track } from "@/lib/analytics";

/** Split free text into clean, de-duplicated ingredient names. */
function parseIngredients(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[\n,;]+/)) {
    const name = raw.trim().replace(/^[-•*\d.)\s]+/, "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name.slice(0, 60));
    if (out.length >= 40) break;
  }
  return out;
}

export default function TypePage() {
  const router = useRouter();
  const { session, setConfirmed, setStaples } = useMealSession();
  const [text, setText] = useState("");
  const names = useMemo(() => parseIngredients(text), [text]);

  function toggleStaple(s: string) {
    const on = session.staples.includes(s);
    setStaples(on ? session.staples.filter((x) => x !== s) : [...session.staples, s]);
  }

  function onContinue() {
    const confirmed: ConfirmedIngredient[] = names.map((name, i) => ({
      id: `t-${i}-${Date.now()}`,
      name,
      category: "other",
      state: "unknown",
      useFirst: false,
      available: true,
      source: "manual",
    }));
    setConfirmed(confirmed);
    track("ingredients_confirmed", { count: confirmed.length, method: "text" });
    // Free text needs no confirmation step — go straight to preferences.
    router.push("/preferences");
  }

  return (
    <>
      <header className="border-b border-line">
        <Container className="flex items-center justify-between py-4">
          <Link href="/" aria-label="Mealhack home">
            <Logo className="text-xl" />
          </Link>
          <Link href="/scan" className="text-sm font-600 text-basil hover:text-basil-strong">
            📷 Use photos instead
          </Link>
        </Container>
      </header>

      <main className="flex-1 pb-32">
        <Container className="pt-6">
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-700 text-ink">
            Type what you have
          </h1>
          <p className="mt-1 text-ink-soft">
            List your ingredients — one per line, or separated by commas. No
            need to be exact.
          </p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            autoFocus
            placeholder={"chicken thighs\nbell pepper\nrice\nonion, garlic\nsoy sauce"}
            aria-label="Your ingredients"
            className="mt-5 w-full resize-y rounded-2xl bg-paper p-4 text-ink ring-1 ring-line outline-none placeholder:text-ink-faint"
          />

          {names.length > 0 && (
            <div className="mt-3">
              <div className="text-sm text-ink-soft">
                {names.length} ingredient{names.length === 1 ? "" : "s"}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {names.map((n) => (
                  <span
                    key={n}
                    className="rounded-full bg-basil-tint px-3 py-1 text-sm font-600 text-basil-strong"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* pantry staples */}
          <div className="mt-8">
            <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-600 text-ink">
              Pantry staples
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              We always assume{" "}
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

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-salt/90 backdrop-blur">
        <Container className="py-4">
          <Button className="w-full" disabled={names.length === 0} onClick={onContinue}>
            Continue with {names.length} ingredient{names.length === 1 ? "" : "s"} →
          </Button>
        </Container>
      </div>
    </>
  );
}
