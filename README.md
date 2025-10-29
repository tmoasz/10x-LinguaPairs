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

10x-LinguaPairs provides an Astro 5 + React 19 boilerplate enhanced with TypeScript, Tailwind CSS and shadcn/ui. It is designed to help developers ship performant, accessible and SEO-friendly sites quickly. Although the template can be used for any kind of project, it is optimised for building language-learning tools such as flash-cards, vocabulary trainers or pair-matching games.

## Tech Stack

| Layer     | Technology                                                                                               |
| --------- | -------------------------------------------------------------------------------------------------------- |
| Framework | [Astro](https://astro.build/) 5                                                                          |
| UI        | [React](https://react.dev/) 19 & [shadcn/ui](https://ui.shadcn.com/)                                     |
| Language  | [TypeScript](https://www.typescriptlang.org/) 5                                                          |
| Styling   | [Tailwind CSS](https://tailwindcss.com/) 4 & [tw-animate-css](https://github.com/benface/tw-animate-css) |
| Icons     | [lucide-react](https://lucide.dev/)                                                                      |
| Tooling   | ESLint, Prettier, Husky & lint-staged                                                                    |

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
# Visit http://localhost:4321 in your browser
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

The current template includes:

- Pre-configured Astro + React + TS setup
- Tailwind CSS 4 with sensible defaults and theming
- shadcn/ui components ready to use
- Opinionated ESLint & Prettier configs with Husky hooks
- Sample layout, page and component structure

Planned future enhancements (see project board):

- Supabase integration for backend data storage
- Authentication scaffold
- Example language-learning features (flashcards, spaced repetition)
- Unit & end-to-end testing setup

## Project Status

🚧 **Work in progress** – Version `0.0.1` is an early preview. Breaking changes may occur while the core structure is being stabilised.

## License

This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.
