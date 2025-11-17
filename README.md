# 10x-LinguaPairs

Welcome to **10x-LinguaPairs**, a modern, accessible, web applications focused on language-learning tools.

## Table of Contents

1. [Project Description](#project-description)
2. [Tech Stack](#tech-stack)
3. [Getting Started Locally](#getting-started-locally)
4. [Available Scripts](#available-scripts)
5. [Project Scope](#project-scope)
6. [Project Status](#project-status)
7. [License](#license)

## Project Description

10x-LinguaPairs is a Supabase-backed Astro 5 + React 19 PWA that actually powers a complete vocabulary learning workflow. Logged-in users go through a three-step AI generation wizard to pick or create a deck, choose languages and a topic or free-form brief, and configure content type plus register filters before generating 50 new PL↔EN (and multilingual) term pairs that land in Supabase. Once a deck exists, the Deck Hub lets them review metadata, change visibility, flag or delete bad pairs, and keep track of the daily quota that limits three generations per day.

On top of generation, the app includes an in-browser Challenge mode: decks with at least 15 pairs feed a three-round matching grid with timers, mistake penalties and a leaderboard stored via `/api/challenge/*`. Guests can try a local preview on the landing page, while authenticated users can play against their own decks and automatically save results. Email-based authentication (login/register/reset) is already wired to Supabase, so the README mirrors the current, working product rather than a generic starter.

## Tech Stack

| Layer     | Technology                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------------- |
| Framework | [Astro](https://astro.build/) 5                                                                           |
| UI        | [React](https://react.dev/) 19 & [shadcn/ui](https://ui.shadcn.com/)                                      |
| Language  | [TypeScript](https://www.typescriptlang.org/) 5                                                           |
| Styling   | [Tailwind CSS](https://tailwindcss.com/) 4 & [tw-animate-css](https://github.com/benface/tw-animate-css)  |
| Icons     | [lucide-react](https://lucide.dev/)                                                                       |
| Testing   | [Vitest](https://vitest.dev/), [Playwright](https://playwright.dev/), [RTL](https://testing-library.com/) |
| Tooling   | ESLint, Prettier, Husky & lint-staged                                                                     |

## Getting Started Locally

### Prerequisites

- Node.js `22.21.0` (see `.nvmrc`)
- [Bun](https://bun.sh/) package manager – this project uses Bun instead of npm/yarn.
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) – required for Supabase local development
- [Supabase CLI](https://supabase.com/docs/guides/cli) – install with `bunx supabase --version`

### Installing Bun

If you don't have Bun installed yet, run one of the following commands:

macOS / Linux:

```bash
curl -fsSL https://bun.sh/install | bash
```

Windows (PowerShell):

```powershell
iwr https://bun.sh/install.ps1 -UseBasicParsing | iex
```

### Installation

```bash
# 1. Clone the repository
$ git clone https://github.com/tmoasz/10x-LinguaPairs.git
$ cd 10x-LinguaPairs

# 2. Install dependencies
$ bun install

# 3. Start the development server
$ bun run dev

# 4. Open the project
# Visit http://localhost:3000 in your browser
```

### Building for Production

```bash
# Generate an optimised production build
$ bun run build

# Preview the built site locally
$ bun run preview
```

## Available Scripts

| Script             | What it does                                      |
| ------------------ | ------------------------------------------------- |
| `bun run dev`      | Start the development server with hot-reload      |
| `bun run build`    | Build the site for production (output in `dist/`) |
| `bun run preview`  | Preview the production build locally              |
| `bun run lint`     | Run ESLint over all source files                  |
| `bun run lint:fix` | Automatically fix lint issues                     |
| `bun run format`   | Format files using Prettier                       |

## Project Scope

What is already live:

- AI generation wizard with deck picker/creator, topic or free-form prompts, register + content-type filters, quota enforcement and Supabase persistence (see `src/pages/generate.astro` and `src/components/generate/*`).
- Deck Hub with metadata editing, visibility controls, pagination of generated pairs, reporting/flagging flows, and Supabase-backed APIs under `src/pages/api/decks/*` that power the React management views.
- Challenge gameplay loop with three timed rounds, anti-cheat penalties, leaderboard storage, and guest preview embedded on the landing page (`src/components/challenge/*` and `/api/challenge/*` routes).
- Email/password auth plus login/register/reset UIs connected to Supabase Auth middleware, protecting generation, deck and challenge routes.
- Daily quota endpoint (`/api/users/me/quota`) and rate limiting that gates generation to three successful runs per day.

Coming up next (tracked in backlog):

- Leitner learning mode with spaced repetition buckets.
- Offline caching of the last 10 decks for guest play and PWA installability polish.
- Manual pair editing plus “+10” regeneration flow across all decks.
- Telemetry dashboards and richer moderation tooling for flagged content.

## Project Status

🚧 **Work in progress** – Version `0.0.1` is an early preview. Breaking changes may occur while the core structure is being stabilised.

## License

This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.
