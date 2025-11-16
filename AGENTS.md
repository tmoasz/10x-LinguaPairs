# Repository Guidelines

This guide helps contributors work effectively in 10x‑LinguaPairs.

## Tech Stack

- Frontend: `Astro 5` (SSR) with `React 19`, `TypeScript 5`.
- UI: `Tailwind CSS 4`, `shadcn/ui` components, icons via `lucide-react`.
- Backend: `Supabase` (Postgres, Auth, RLS); validation with `zod`.
- Tooling: `Bun` package runner; `ESLint` + `Prettier`; `Husky` + `lint-staged`.
- Testing: `Vitest` (unit/coverage/UI) and `Playwright` (E2E).
- CI/CD & Hosting: GitHub Actions pipelines; deploy to Cloudflare Pages (SSR). Local SSR uses Node adapter.
- License/version: MIT, version `0.0.1` (preview).

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
- `bun run test` — Run unit tests with Vitest.
- `bun run test:coverage` — Unit tests with coverage.
- `bun run test:e2e` — Build and run Playwright E2E tests.
- `bun run preview:test` — Preview server on port 4321 (E2E friendly).
  - See `TESTING.md`, `.ai/TESTING_SETUP.md`, and `test-plan.md` for details.

## Coding Style & Naming Conventions

- TypeScript, Astro, and React 19.
- Formatting: Prettier defaults (no local config). Indentation: 2 spaces; single quotes not enforced; trailing commas as Prettier decides.
- Linting: ESLint flat config (`eslint.config.js`) with plugins for TypeScript, Astro, React, a11y.
- Import aliases: prefer `@/…`.
- Supabase types: import `SupabaseClient` from `src/db/supabase.client.ts` (not from `@supabase/supabase-js`).
- Validation: use `zod` schemas under `src/lib/validation/` for API payloads.
- Error responses: return `ErrorResponseDTO` shape from `src/types.ts` with appropriate HTTP status.

## Testing Guidelines

- Unit tests: `Vitest` with `happy-dom`/`jsdom`; colocate as `*.test.ts` within feature folders.
- E2E: `Playwright` under `e2e/`; use `bun run preview:test` for stable localhost port during runs.
- Coverage: use `bun run test:coverage` for PR gating; artifacts uploaded in CI.
- Mock external deps (Supabase, AI provider) in unit tests; keep units pure.
- See `TESTING.md` for patterns and utilities.

## Commit & Pull Request Guidelines

- Keep PRs focused and small. Include:
  - Purpose, linked issue, and a brief test plan.
  - API or schema changes and migration notes (if any).
- Commit messages: imperative mood, scope in brackets when useful (e.g., `feat(decks): create deck service`).
- Ensure `bun run lint:fix` and `bun run format` pass before pushing.
- Pre‑commit: Husky runs `lint-staged` to auto‑fix staged files.

## Security & Configuration Tips

- Configure Supabase via env vars: `SUPABASE_URL`, `SUPABASE_KEY`.
- Astro SSR adapter switches by env: set `PUBLIC_ENV_NAME=production` to use Cloudflare adapter; otherwise Node standalone.
- Never commit secrets; use `.env` files excluded by `.gitignore`.
- Use the provided client in `src/db/supabase.client.ts` for typed access to the database.
- Auth & SSR: `src/middleware/` injects `locals.supabase` and `locals.user`; protect non‑public routes via middleware.

## Cloudflare Workers & Request Handling

**IMPORTANT**: When working with `Request` objects in API endpoints deployed to Cloudflare Pages/Workers, always use safe request utilities to prevent "Illegal invocation" errors.

### Rule: Never call `request.json()` directly

- **DO NOT**: `await context.request.json()` or `await request.json()`
- **DO**: `await safeRequestJson(context.request)` or `await safeRequestJson(request)`
- Import from: `@/lib/utils/request.utils`

### Why this matters

In Cloudflare Workers runtime, Request methods (`json()`, `text()`, etc.) can lose their `this` context when called directly, especially during:

- Long-running operations (>5 seconds)
- Async operations that span multiple event loop ticks
- When Request objects are passed through multiple function calls

This causes `TypeError: Illegal invocation: function called with incorrect this reference`.

### Solution

The `safeRequestJson()` utility uses `Request.prototype.json.call(request)` to explicitly preserve the `this` context, preventing the error.

### When to apply

- **All API endpoints** that parse request bodies (POST, PUT, PATCH)
- **Especially critical** for endpoints with long execution times (e.g., AI generation)
- **Best practice**: Use `safeRequestJson()` everywhere instead of `request.json()` for consistency

See: https://developers.cloudflare.com/workers/observability/errors/#illegal-invocation-errors

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

## Product Scope (MVP) — Key Rules from PRD

- Generation
  - 50 pairs per generation (topic or text). Extend with “+10” that excludes flagged/known pairs.
  - Content types: `auto | words | phrases | mini-phrases`; Register: `neutral | informal | formal`.
  - Enforce deduplication and ≤ 8 tokens per side; store register in pair metadata.
  - Manual add: allow adding one side and auto‑translate the other (post‑MVP enhancements tbd).
- Pair data contract (PRD): `{ l1, l2, type, register, source }`.
  - Internal types use `term_a/term_b` and `GeneratedPairDTO` in `src/types.ts` — follow internal naming (do not rename to l1/l2).
- Review & flags
  - List view of generated pairs with “Report error” marks a pair as flagged.
- Learning UI
  - Matching grid: two columns (L1/L2). Start 2×3 rows; “Show more” increments rows up to 10.
  - Columns shuffle independently. Anti‑cheat: on mistake hide one correct pair and add a decoy.
- Challenge mode
  - 3 rounds × 2×5 rows. Score impacts Leitner progress.
- Leitner SRS
  - 3 buckets: New → Learning → Known. Track accuracy per set and per pair.
- Access & limits
  - Guest: curated sets only. Authenticated users: generation requires login. Daily limit = 3 successful generations.
- Offline & cache
  - PWA caches last 10 sets for offline use. Backend cache keys include `topic_id/text_hash + params`.
- Telemetry & logging
  - Record generation time, cache-hit, flags count, and cost per 50 pairs. Save prompt/context hash (not raw text) where applicable.

## Performance Targets (from PRD)

- 95% generate full 50 pairs in < 15s; p95 < 20s; average < 12s.
- “+10” produces 10 new unique pairs 99% of the time.
- Leitner calculations ≥ 99% correctness (auditable).
- PWA cached set opens offline in < 2s.
- Cost target ≤ $0.03 per 50 pairs when using real AI provider.

## MVP Boundaries (Out of Scope)

- No automatic QA‑gate/similarity merge via embeddings.
- No UK/US variants; no export; CSV import after MVP.
- No prompt versioning; advanced A11y/i18n and extended stats deferred.
- Moderation/PII and full GDPR to be refined post‑MVP.
- OAuth variants and password reset flows beyond basic email+password are out of MVP.

## API & Validation Guidelines

- Place endpoints under `src/pages/api/*` (Astro API routes). Return JSON with correct status codes.
- Validate all inputs with `zod` schemas in `src/lib/validation/*` and map to DTOs in `src/types.ts`.
- Use `context.locals.supabase` and `context.locals.user.id` (from middleware) for authenticated operations.
- For generation endpoints, include `quota` in responses and set `Location` header to the deck generation resource.
- Map error conditions to stable codes: `UNAUTHORIZED`, `VALIDATION_ERROR`, `QUOTA_EXCEEDED`, `CONFLICT`, `NOT_FOUND`, `FORBIDDEN`, `INTERNAL_ERROR`.

## UI & Components

- Style with Tailwind 4 utilities; use shadcn/ui where practical. Keep components in `src/components/` and prefer `@/…` imports.
- Icons via `lucide-react`. Keep global styles in `src/styles/global.css` (see `components.json`).

## Continuous Integration / Deployment

- PR pipeline: lint → unit (coverage) → E2E; see `.github/workflows/pull-request.yml`.
- Deployments: manual workflow to Cloudflare Pages from `master`; see `.github/workflows/deployment.yml`.
- Build adapter: Cloudflare for production (`PUBLIC_ENV_NAME=production`); Node standalone elsewhere.
