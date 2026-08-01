"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ButtonLink, Container } from "@/components/ui";
import { useMealSession } from "@/lib/session";
import type { GeneratedRecipe, RecipeStep } from "@/lib/schemas";
import { track } from "@/lib/analytics";

export default function CookPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useMealSession();
  const recipe = session.recipes.find((r) => r.id === id);
  const [idx, setIdx] = useState(0);
  const [finished, setFinished] = useState(false);

  useWakeLock(!finished);

  if (!recipe) {
    return (
      <main className="flex flex-1 items-center justify-center py-16">
        <Container className="text-center">
          <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-700 text-ink">
            Recipe not found
          </h1>
          <div className="mt-6">
            <ButtonLink href="/recipes">← Back to recipes</ButtonLink>
          </div>
        </Container>
      </main>
    );
  }

  if (finished) return <Feedback recipe={recipe} />;

  const steps = recipe.steps;
  const step = steps[idx];
  const isLast = idx === steps.length - 1;

  return (
    <div className="flex min-h-screen flex-col bg-salt">
      {/* top bar: exit + progress */}
      <div className="border-b border-line">
        <Container className="flex items-center gap-3 py-3">
          <ExitButton />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-600 text-ink-soft">
              {recipe.title}
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-sunk">
              <div
                className="h-full rounded-full bg-basil transition-[width]"
                style={{ width: `${((idx + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
          <span className="shrink-0 text-sm font-600 tabular-nums text-ink-soft">
            {idx + 1}/{steps.length}
          </span>
        </Container>
      </div>

      {/* step */}
      <main className="flex flex-1 flex-col justify-center py-8" aria-live="polite">
        <Container>
          <div className="text-sm font-700 uppercase tracking-wider text-basil">
            Step {step.number}
          </div>
          <p className="mt-3 font-[family-name:var(--font-fraunces)] text-3xl font-600 leading-snug text-ink sm:text-4xl">
            {step.instruction}
          </p>
          {step.safetyNote && (
            <p className="mt-4 rounded-2xl bg-tomato/8 px-4 py-3 font-600 text-tomato ring-1 ring-tomato/20">
              ⚠️ {step.safetyNote}
            </p>
          )}
          {(step.durationMinutes ?? 0) > 0 && (
            <StepTimer key={idx} minutes={step.durationMinutes!} />
          )}
        </Container>
      </main>

      {/* nav */}
      <div className="border-t border-line bg-salt">
        <Container className="grid grid-cols-2 gap-3 py-4">
          <button
            disabled={idx === 0}
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            className="min-h-14 rounded-full bg-paper text-lg font-600 text-ink ring-1 ring-line disabled:opacity-40"
          >
            ← Back
          </button>
          {isLast ? (
            <button
              onClick={() => setFinished(true)}
              className="min-h-14 rounded-full bg-basil text-lg font-700 text-white"
            >
              I&rsquo;m done 🎉
            </button>
          ) : (
            <button
              onClick={() => setIdx((i) => Math.min(steps.length - 1, i + 1))}
              className="min-h-14 rounded-full bg-basil text-lg font-700 text-white"
            >
              Next →
            </button>
          )}
        </Container>
      </div>
    </div>
  );
}

function ExitButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        if (confirm("Stop cooking and leave this recipe?")) router.back();
      }}
      aria-label="Exit cooking mode"
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper text-ink ring-1 ring-line"
    >
      ✕
    </button>
  );
}

function StepTimer({ minutes }: { minutes: number }) {
  const total = Math.round(minutes * 60);
  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    ref.current = window.setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          window.clearInterval(ref.current!);
          setRunning(false);
          setDone(true);
          beep();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (ref.current) window.clearInterval(ref.current);
    };
  }, [running]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div
      className={`mt-6 flex items-center gap-4 rounded-2xl p-4 ring-1 ${
        done ? "bg-ember/15 ring-ember/40" : "bg-paper ring-line"
      }`}
      aria-live="assertive"
    >
      <span className="font-[family-name:var(--font-fraunces)] text-3xl font-700 tabular-nums text-ink">
        {done ? "Time's up!" : `${mm}:${ss}`}
      </span>
      <div className="ml-auto flex gap-2">
        {done ? (
          <button
            onClick={() => {
              setRemaining(total);
              setDone(false);
            }}
            className="min-h-11 rounded-full bg-paper px-4 font-600 text-ink ring-1 ring-line"
          >
            Reset
          </button>
        ) : (
          <>
            <button
              onClick={() => setRunning((r) => !r)}
              className="min-h-11 rounded-full bg-ember px-5 font-700 text-white"
            >
              {running ? "Pause" : "Start timer"}
            </button>
            {remaining !== total && (
              <button
                onClick={() => {
                  setRunning(false);
                  setRemaining(total);
                }}
                className="min-h-11 rounded-full bg-paper px-4 font-600 text-ink ring-1 ring-line"
              >
                Reset
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Feedback({ recipe }: { recipe: GeneratedRecipe }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<string | null>(null);
  const [rating, setRating] = useState(0);

  function choose(o: string, cooked: boolean) {
    setOutcome(o);
    if (cooked) track("recipe_cooked", { role: recipe.role });
  }

  const OPTIONS: { key: string; label: string; cooked: boolean }[] = [
    { key: "again", label: "Yes — and I’d make it again", cooked: true },
    { key: "changes", label: "Yes — but it needs changes", cooked: true },
    { key: "abandoned", label: "No — I abandoned it", cooked: false },
    { key: "saved", label: "I saved it for later", cooked: false },
  ];

  return (
    <main className="flex flex-1 items-center justify-center py-12">
      <Container>
        {!outcome ? (
          <div className="text-center">
            <div className="text-5xl">🍽️</div>
            <h1 className="mt-3 font-[family-name:var(--font-fraunces)] text-3xl font-700 text-ink">
              Did this become dinner?
            </h1>
            <div className="mt-6 space-y-3">
              {OPTIONS.map((o) => (
                <button
                  key={o.key}
                  onClick={() => choose(o.key, o.cooked)}
                  className="min-h-14 w-full rounded-2xl bg-paper px-5 text-left text-lg font-600 text-ink ring-1 ring-line hover:bg-paper-sunk"
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-5xl">{outcome === "abandoned" ? "🤍" : "🎉"}</div>
            <h1 className="mt-3 font-[family-name:var(--font-fraunces)] text-2xl font-700 text-ink">
              {outcome === "abandoned"
                ? "Thanks for the honesty"
                : "Nice one — dinner sorted!"}
            </h1>
            <p className="mt-2 text-ink-soft">
              How was <span className="text-ink">{recipe.title}</span>?
            </p>
            <div className="mt-4 flex justify-center gap-1.5" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  aria-checked={rating === n}
                  role="radio"
                  onClick={() => {
                    setRating(n);
                    track("recipe_rated", { rating: n });
                  }}
                  className={`text-4xl ${n <= rating ? "text-ember" : "text-ink-faint/40"}`}
                >
                  ★
                </button>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3">
              <button
                onClick={() => router.push("/")}
                className="min-h-14 rounded-full bg-basil text-lg font-700 text-white"
              >
                Done
              </button>
              <button
                onClick={() => router.push("/scan")}
                className="min-h-12 rounded-full bg-paper font-600 text-ink ring-1 ring-line"
              >
                Cook something else
              </button>
            </div>
          </div>
        )}
      </Container>
    </main>
  );
}

/** Keep the screen awake while cooking (spec §6.11), re-acquiring after the tab
 * regains focus. Gracefully no-ops where unsupported. */
function useWakeLock(active: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null);
  const request = useCallback(async () => {
    try {
      if ("wakeLock" in navigator && active) {
        lockRef.current = await navigator.wakeLock.request("screen");
      }
    } catch {
      /* denied / unsupported */
    }
  }, [active]);

  useEffect(() => {
    if (!active) return;
    void request();
    const onVis = () => {
      if (document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      lockRef.current?.release().catch(() => {});
      lockRef.current = null;
    };
  }, [active, request]);
}

function beep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
    o.start();
    o.stop(ctx.currentTime + 0.7);
  } catch {
    /* audio unavailable */
  }
}
