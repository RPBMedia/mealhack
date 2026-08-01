"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Container, Logo } from "@/components/ui";
import { useMealSession } from "@/lib/session";
import {
  DEFAULT_PREFERENCES,
  GenerateRecipesResponse,
  type Effort,
  type MissingAllowance,
  type Preferences,
} from "@/lib/schemas";
import { track } from "@/lib/analytics";

const TIMES: { label: string; value: number | null }[] = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
  { label: "No limit", value: null },
];
const EFFORTS: { value: Effort; title: string; desc: string }[] = [
  { value: "bare", title: "Bare minimum", desc: "Simple, low-mess, few steps" },
  { value: "normal", title: "Normal dinner", desc: "Ordinary home cooking" },
  { value: "great", title: "Make something great", desc: "More prep is fine" },
];
const MISSING: { value: MissingAllowance; label: string }[] = [
  { value: "none", label: "Only what I have" },
  { value: "one", label: "Allow one missing" },
  { value: "few", label: "A few common extras" },
];
const DIETS = ["Vegetarian", "Vegan", "Pescatarian", "Gluten-free", "Dairy-free", "Halal", "Kosher"];
const ALLERGENS = ["Peanuts", "Tree nuts", "Milk", "Eggs", "Fish", "Shellfish", "Soy", "Gluten", "Sesame"];

export default function PreferencesPage() {
  const router = useRouter();
  const { session, setPreferences, setRecipes } = useMealSession();
  const [p, setP] = useState<Preferences>(session.preferences ?? DEFAULT_PREFERENCES);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<Preferences>) => setP((cur) => ({ ...cur, ...patch }));
  const toggle = (key: "diet" | "allergies", v: string) =>
    set({ [key]: p[key].includes(v) ? p[key].filter((x) => x !== v) : [...p[key], v] } as Partial<Preferences>);

  async function generate() {
    const available = session.confirmed
      .filter((i) => i.available)
      .map((i) => ({ name: i.name, useFirst: i.useFirst }));
    if (available.length === 0) {
      setError("Add some ingredients first.");
      return;
    }
    setError(null);
    setGenerating(true);
    setPreferences(p);
    track("recipe_generation_started", { servings: p.servings, effort: p.effort });
    try {
      const res = await fetch("/api/recipes/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ available, staples: session.staples, preferences: p }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Generation failed.");
      const parsed = GenerateRecipesResponse.parse(json);
      setRecipes(parsed.recipes);
      track("recipes_generated", { count: parsed.recipes.length });
      router.push("/recipes");
    } catch (e) {
      setGenerating(false);
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <>
      <header className="border-b border-line">
        <Container className="flex items-center justify-between py-4">
          <Link href="/" aria-label="Mealhack home">
            <Logo className="text-xl" />
          </Link>
          <Link href="/scan/confirm" className="text-sm font-600 text-ink-soft hover:text-ink">
            ← Back
          </Link>
        </Container>
      </header>

      <main className="flex-1 pb-32">
        <Container className="pt-6">
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-700 text-ink">
            How should we cook?
          </h1>
          <p className="mt-1 text-ink-soft">Just the essentials — you can tweak the rest.</p>

          {/* servings */}
          <Field label="Servings">
            <div className="flex items-center gap-4">
              <Stepper
                value={p.servings}
                min={1}
                max={12}
                onChange={(v) => set({ servings: v })}
              />
            </div>
          </Field>

          {/* time */}
          <Field label="Maximum time">
            <ChipRow>
              {TIMES.map((t) => (
                <Chip key={t.label} on={p.maxMinutes === t.value} onClick={() => set({ maxMinutes: t.value })}>
                  {t.label}
                </Chip>
              ))}
            </ChipRow>
          </Field>

          {/* effort */}
          <Field label="Effort">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {EFFORTS.map((e) => (
                <button
                  key={e.value}
                  onClick={() => set({ effort: e.value })}
                  aria-pressed={p.effort === e.value}
                  className={`rounded-2xl p-3 text-left ring-1 ${
                    p.effort === e.value ? "bg-basil-tint ring-basil" : "bg-paper ring-line hover:bg-paper-sunk"
                  }`}
                >
                  <div className="font-600 text-ink">{e.title}</div>
                  <div className="text-sm text-ink-soft">{e.desc}</div>
                </button>
              ))}
            </div>
          </Field>

          {/* missing */}
          <Field label="Missing ingredients">
            <ChipRow>
              {MISSING.map((m) => (
                <Chip key={m.value} on={p.missing === m.value} onClick={() => set({ missing: m.value })}>
                  {m.label}
                </Chip>
              ))}
            </ChipRow>
          </Field>

          {/* diet */}
          <Field label="Dietary preferences" optional>
            <ChipRow>
              {DIETS.map((d) => (
                <Chip key={d} on={p.diet.includes(d.toLowerCase())} onClick={() => toggle("diet", d.toLowerCase())}>
                  {d}
                </Chip>
              ))}
            </ChipRow>
          </Field>

          {/* allergies — prominent */}
          <Field label="Allergies" optional>
            <p className="-mt-1 mb-2 text-sm text-tomato">
              We&rsquo;ll keep these out of every recipe. Always double-check
              packaging yourself.
            </p>
            <ChipRow>
              {ALLERGENS.map((a) => (
                <Chip key={a} tone="alert" on={p.allergies.includes(a.toLowerCase())} onClick={() => toggle("allergies", a.toLowerCase())}>
                  {a}
                </Chip>
              ))}
            </ChipRow>
          </Field>

          {/* child-friendly */}
          <Field label="Family" optional>
            <button
              onClick={() => set({ childFriendly: !p.childFriendly })}
              aria-pressed={p.childFriendly}
              className={`flex w-full items-center justify-between rounded-2xl p-4 ring-1 ${
                p.childFriendly ? "bg-basil-tint ring-basil" : "bg-paper ring-line"
              }`}
            >
              <span className="text-left">
                <span className="block font-600 text-ink">👶 Child-friendly</span>
                <span className="block text-sm text-ink-soft">Milder seasoning + a set-aside child portion</span>
              </span>
              <span className={`h-6 w-11 rounded-full p-0.5 transition-colors ${p.childFriendly ? "bg-basil" : "bg-paper-sunk"}`}>
                <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${p.childFriendly ? "translate-x-5" : ""}`} />
              </span>
            </button>
          </Field>

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-tomato/10 px-4 py-3 text-sm font-600 text-tomato">
              {error}
            </p>
          )}
        </Container>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-salt/90 backdrop-blur">
        <Container className="py-4">
          <Button className="w-full" disabled={generating} onClick={generate}>
            {generating ? "Cooking up ideas…" : "Generate 3 recipes"}
          </Button>
        </Container>
      </div>

      {generating && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-salt/95 backdrop-blur">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-basil/30 border-t-basil" />
            <p className="mt-4 font-[family-name:var(--font-fraunces)] text-xl font-600 text-ink">
              Cooking up three ideas…
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="text-sm font-700 uppercase tracking-wider text-ink-soft">
        {label}
        {optional && <span className="ml-2 font-500 normal-case text-ink-faint">optional</span>}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function Chip({ on, onClick, tone = "basil", children }: { on: boolean; onClick: () => void; tone?: "basil" | "alert"; children: React.ReactNode }) {
  const active = tone === "alert" ? "bg-tomato text-white ring-tomato" : "bg-basil text-white ring-basil";
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`min-h-10 rounded-full px-3.5 text-sm font-600 ring-1 ${on ? active : "bg-paper text-ink-soft ring-line hover:bg-paper-sunk"}`}
    >
      {children}
    </button>
  );
}

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Fewer servings"
        className="grid h-11 w-11 place-items-center rounded-full bg-paper text-xl font-700 text-ink ring-1 ring-line"
      >
        −
      </button>
      <span className="w-10 text-center font-[family-name:var(--font-fraunces)] text-2xl font-700 text-ink tabular-nums">
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="More servings"
        className="grid h-11 w-11 place-items-center rounded-full bg-paper text-xl font-700 text-ink ring-1 ring-line"
      >
        +
      </button>
    </div>
  );
}
