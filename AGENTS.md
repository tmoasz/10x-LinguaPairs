# Repository Guidelines

This guide helps contributors work effectively in 10x‑LinguaPairs.

## Project Structure & Module Organization

- App code lives in `src/`:
  - `src/pages/` (Astro pages and API routes, e.g. `src/pages/api/decks/index.ts`).
  - `src/components/`, `src/layouts/`, `src/styles/` for UI.
  - `src/lib/` for domain logic: `services/`, `validation/`, `errors/`.
  - `src/db/` for Supabase client and generated types.
  - Shared DTOs live in `src/types.ts`.
- Path alias: use `@/*` (configured in `tsconfig.json`) instead of long relatives.

## Build, Test, and Development Commands

- `bun dev` — Start the Astro dev server.
- `bun run build` — Production build to `dist/`.
- `bun run preview` — Preview the production build locally.
- `bun run lint` — Run ESLint across the repo.
- `bun run lint:fix` — Auto‑fix lint issues.
- `bun run format` — Format files with Prettier.

## Coding Style & Naming Conventions

- TypeScript, Astro, and React 19.
- Formatting: Prettier defaults (no local config). Indentation: 2 spaces; single quotes not enforced; trailing commas as Prettier decides.
- Linting: ESLint flat config (`eslint.config.js`) with plugins for TypeScript, Astro, React, a11y.
- Import aliases: prefer `@/…`.
- Supabase types: import `SupabaseClient` from `src/db/supabase.client.ts` (not from `@supabase/supabase-js`).

## Testing Guidelines

- No test harness yet. If adding tests, prefer Vitest and colocate as `*.test.ts` under the feature folder (e.g., `src/lib/services/deck.service.test.ts`). Keep units pure and mock Supabase.

## Commit & Pull Request Guidelines

- Keep PRs focused and small. Include:
  - Purpose, linked issue, and a brief test plan.
  - API or schema changes and migration notes (if any).
- Commit messages: imperative mood, scope in brackets when useful (e.g., `feat(decks): create deck service`).
- Ensure `bun run lint:fix` and `bun run format` pass before pushing.
- Pre‑commit: Husky runs `lint-staged` to auto‑fix staged files.

## Security & Configuration Tips

- Configure Supabase via env vars: `SUPABASE_URL`, `SUPABASE_KEY`.
- Never commit secrets; use `.env` files excluded by `.gitignore`.
- Use the provided client in `src/db/supabase.client.ts` for typed access to the database.

## Supabase Migrations

- Location: `supabase/migrations/` (managed by Supabase CLI).
- Canonical tool: use Supabase CLI directly (not Bun) for schema changes.
- Local dev (Docker required): `./node_modules/.bin/supabase db reset` – resets and applies all migrations.
- Remote (linked project):
  - Dry run: `./node_modules/.bin/supabase db push --dry-run`
  - Apply: `supabase db push`
  - Link project (once): `./node_modules/.bin/supabase link --project-ref <PROJECT_REF>`
- Alternative: pass a DB URL instead of linking: `./node_modules/.bin/supabase db push --db-url "<postgres_url>"`.
- If you have a global CLI installation, you can use `supabase ...` instead of the local `./node_modules/.bin/supabase` path.
- Note: There are optional Bun scripts for convenience, but the CLI is the source of truth for running migrations.
