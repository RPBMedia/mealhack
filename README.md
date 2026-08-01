# Mealhack

**Hack dinner with what you have.** Photograph the ingredients in your fridge or
pantry, confirm what was detected, and get three practical recipes you can
genuinely cook tonight.

Mobile-first **PWA** built with Next.js. `MEALHACK_PRODUCT_SPEC.md` is the
product source of truth.

## Status — Milestone 1 (MVP)

The complete **anonymous** journey works end-to-end:

`landing → scan → analyse → confirm → preferences → 3 recipes → cook → feedback`

- 📷 Multi-photo capture/upload with client-side compression + EXIF stripping
- 🧠 AI ingredient recognition behind a **server-side provider abstraction**
- ✅ Mandatory, editable ingredient confirmation + pantry staples
- 🍳 Preferences (servings / time / effort / diet / **allergies** / child-friendly)
- 🍽️ Exactly **three** validated recipes (fastest / best / different), with a
  programmatic validation + one repair attempt before anything is shown
- 👩‍🍳 Guided cooking mode (one step at a time, timers, screen wake-lock)
- 📊 Analytics funnel events incl. the north-star `recipe_cooked`

**Runs with zero keys** on a deterministic mock. Set `ANTHROPIC_API_KEY` to use
real Claude — no UI changes.

## Stack

Next.js (App Router) · TypeScript (strict) · Tailwind v4 · Zod · Anthropic
Claude (multimodal, server-only) · Vercel. Playwright (e2e) + Vitest (unit).

## Getting started

```bash
npm install
cp .env.example .env.local   # optional — app runs on mock AI with none set
npm run dev                  # http://localhost:3000
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |
| `npm run test:e2e` | Playwright end-to-end (uses installed Chrome) |

## AI architecture

All AI runs **server-side** through `src/ai/provider.ts`:

- `getProvider()` returns the **mock** unless `ANTHROPIC_API_KEY` is set (and
  `MEALHACK_AI !== "mock"`), in which case it returns the Anthropic provider.
- Prompts are version-controlled in `src/ai/prompts/`.
- Every model response is parsed and **Zod-validated**; recipes additionally go
  through `validateRecipeSet` with one repair attempt.
- Image text is treated as untrusted (prompt-injection resistance).

Routes: `POST /api/analyze`, `POST /api/recipes/generate`.

## Environment variables

See `.env.example`. None are required for the mock experience. `ANTHROPIC_API_KEY`
enables real AI; Supabase/PostHog/Sentry/Upstash arrive with later milestones.

## Roadmap

Milestones 1–6 (MVP → accounts → family mode → waste reduction → validation →
native). See `MEALHACK_PRODUCT_SPEC.md`.
