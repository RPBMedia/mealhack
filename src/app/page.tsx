import { ButtonLink, Card, Container, Eyebrow, Logo } from "@/components/ui";

export default function Home() {
  return (
    <>
      <header className="border-b border-line">
        <Container className="flex items-center justify-between py-4">
          <Logo className="text-2xl" />
          <a
            href="#how"
            className="text-sm font-600 text-ink-soft hover:text-ink"
          >
            How it works
          </a>
        </Container>
      </header>

      <main className="flex-1">
        {/* hero */}
        <section className="pt-10 pb-8 sm:pt-16">
          <Container className="text-center">
            <Eyebrow>Dinner, sorted</Eyebrow>
            <h1 className="mt-4 font-[family-name:var(--font-fraunces)] text-[2.6rem] font-700 leading-[1.05] tracking-tight text-ink sm:text-6xl">
              Hack dinner with
              <br />
              what you have.
            </h1>
            <p className="mx-auto mt-5 max-w-md text-lg text-ink-soft">
              Take a photo of your ingredients. Mealhack turns what you have
              into a practical dinner you can actually cook tonight.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <ButtonLink href="/scan" className="w-full sm:w-auto">
                📷 Scan ingredients
              </ButtonLink>
              <ButtonLink href="/type" variant="soft" className="w-full sm:w-auto">
                ⌨️ Type what you have
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-ink-faint">
              No account needed. Your photos stay private.
            </p>
          </Container>
        </section>

        {/* example: scan → ingredients → recipes (illustrative, not real photos) */}
        <section className="pb-12">
          <Container>
            <Card className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-600 text-ink-soft">
                  We spotted
                </span>
                {["🍅 Tomatoes", "🧅 Onion", "🥚 Eggs", "🧀 Feta", "🌿 Basil"].map(
                  (c) => (
                    <span
                      key={c}
                      className="rounded-full bg-basil-tint px-3 py-1 text-sm font-600 text-basil-strong"
                    >
                      {c}
                    </span>
                  ),
                )}
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { t: "Baked feta pasta", m: "25 min", tag: "Fastest" },
                  { t: "Shakshuka", m: "30 min", tag: "Best match" },
                  { t: "Tomato & basil frittata", m: "20 min", tag: "Something different" },
                ].map((r) => (
                  <div
                    key={r.t}
                    className="rounded-xl bg-paper-sunk p-4 ring-1 ring-line"
                  >
                    <div className="text-xs font-700 uppercase tracking-wider text-ember">
                      {r.tag}
                    </div>
                    <div className="mt-1 font-[family-name:var(--font-fraunces)] text-lg font-600 text-ink">
                      {r.t}
                    </div>
                    <div className="mt-1 text-sm text-ink-soft">⏱️ {r.m}</div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center text-xs text-ink-faint">
                Example — your recipes are generated from your ingredients.
              </p>
            </Card>
          </Container>
        </section>

        {/* how it works */}
        <section id="how" className="border-t border-line bg-paper py-12">
          <Container>
            <h2 className="text-center font-[family-name:var(--font-fraunces)] text-3xl font-700 text-ink">
              Three steps to dinner
            </h2>
            <ol className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {[
                { n: "1", t: "Snap your ingredients", d: "Photograph your fridge, counter or pantry — a few photos is fine." },
                { n: "2", t: "Confirm what we found", d: "Check the list and fix anything. You're always in control." },
                { n: "3", t: "Cook one of three", d: "Get three practical recipes and follow guided, one-step-at-a-time cooking." },
              ].map((s) => (
                <li key={s.n} className="text-center">
                  <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-basil text-lg font-700 text-white">
                    {s.n}
                  </div>
                  <h3 className="mt-3 font-[family-name:var(--font-fraunces)] text-xl font-600 text-ink">
                    {s.t}
                  </h3>
                  <p className="mt-1 text-sm text-ink-soft">{s.d}</p>
                </li>
              ))}
            </ol>
            <div className="mt-10 text-center">
              <ButtonLink href="/scan">📷 Scan ingredients</ButtonLink>
            </div>
          </Container>
        </section>

        {/* privacy reassurance */}
        <section className="py-12">
          <Container>
            <Card className="p-6 text-center">
              <div className="text-2xl">🔒</div>
              <h2 className="mt-2 font-[family-name:var(--font-fraunces)] text-xl font-600 text-ink">
                Your kitchen stays yours
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
                Photos are private and used only to spot your ingredients. We
                strip location data, and anonymous scans are deleted
                automatically. An AI service processes images to recognise food.
              </p>
            </Card>
          </Container>
        </section>
      </main>

      <footer className="border-t border-line py-8 text-center text-sm text-ink-faint">
        <Container>
          <Logo className="text-base" /> — hack dinner with what you have.
        </Container>
      </footer>
    </>
  );
}
