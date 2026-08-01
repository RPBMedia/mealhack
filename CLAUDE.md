@AGENTS.md

# Mealhack — project instructions

`MEALHACK_PRODUCT_SPEC.md` in this repo is the **source of truth** for the
product. Read it before making product decisions; follow its safety, privacy,
and AI-architecture requirements (all AI calls go through server routes, never
the client; validate every AI response with Zod; never expose secrets).

## Stack
Next.js (App Router) + TypeScript (strict), Tailwind v4, Supabase
(Postgres/Auth/Storage), Vercel. AI via Anthropic Claude behind a **provider
abstraction**, with **mock fixtures first** so the whole flow is testable
offline before real keys exist.

## Git workflow
- **Commit and push to `main`** after each completed change (feature/fix), with
  a clear message — automatically, without waiting to be asked.
- Repo: `git@github.com:RPBMedia/mealhack.git`. Commit as `RPBMedia` /
  `rui.palma.baiao@gmail.com`.
- Work directly on `main` unless a task explicitly asks for a branch. Run
  lint/typecheck/tests before committing; don't leave the tree broken.

## Definition of done (per spec §26)
Implementation + loading/error states + TypeScript passes + lint passes + tests
pass + mobile behaviour checked + accessibility basics + docs updated. No
placeholder logic presented as production behaviour.

## Scripts
`npm run dev`, `npm run build`, `npm run lint` (see package.json).
