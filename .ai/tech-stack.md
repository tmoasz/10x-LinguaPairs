# Tech Stack - 10x-LinguaPairs

## Dokumentacja techniczna projektu

Dokument opisuje szczegółowy stos technologiczny projektu **10x-LinguaPairs**, bazując na analizie PRD, reguł deweloperskich i konfiguracji projektu.

---

## 1. Przegląd technologiczny

**10x-LinguaPairs** to aplikacja webowa (PWA) wykorzystująca nowoczesny stos technologiczny do wspierania nauki słownictwa. Projekt bazuje na Astro 5 + React 19 z TypeScript, Tailwind CSS 4, Shadcn/ui oraz Supabase jako backend.

**Status**: 🚧 W trakcie rozwoju (MVP)

---

## 2. Frontend Framework & Rendering

### Astro 5

- **Wersja**: 5.15.1
- **Rola**: Główny framework dla statycznych stron i layoutów
- **Integracje**:
  - `@astrojs/react` (4.4.0) – integracja React
  - `@astrojs/sitemap` (3.6.0) – automatyczne generowanie sitemap
  - `@astrojs/node` (9.5.0) – adapter dla Node.js (SSR)
- **Renderowanie**: Server-side (SSR) z hybrid rendering
- **Wydajność**: Prerendering dla statycznych treści, View Transitions API dla płynnych przejść

### React 19

- **Wersja**: 19.2.0
- **Rola**: Komponenty interaktywne (dynamiczne UI, minigra łączenia)
- **Pakiety**: `react`, `react-dom`, `@types/react`, `@types/react-dom`
- **Wzorce**: Functional components z hooks, React.memo dla optymalizacji

---

## 3. Język & TypeScript

### TypeScript 5

- **Wersja**: 5.x
- **Rola**: Type-safe development
- **Konfiguracja**: `tsconfig.json`
- **Funkcje**: Strict mode, path aliases (`@/`)

---

## 4. Stylowanie

### Tailwind CSS 4

- **Wersja**: 4.1.16
- **Plugin**: `@tailwindcss/vite` (4.1.16)
- **Konfiguracja**: Vite plugin
- **Funkcje**:
  - Responsive variants (sm:, md:, lg:, etc.)
  - Dark mode z `dark:` variant
  - Arbitrary values z nawiasami kwadratowymi
  - State variants (hover:, focus-visible:, active:)

### tw-animate-css

- **Wersja**: 1.4.0
- **Rola**: Animacje CSS w Tailwind

### class-variance-authority (CVA)

- **Wersja**: 0.7.1
- **Rola**: Zarządzanie wariantami komponentów

### clsx & tailwind-merge

- **Wersje**: `clsx@^2.1.1`, `tailwind-merge@^3.3.1`
- **Rola**: Łączenie klas CSS z logiką

---

## 5. UI Components

### Shadcn/ui

- **Rola**: Biblioteka komponentów dostępnych (accessible)
- **Styl**: "new-york" variant z kolorem bazowym "neutral"
- **Lokalizacja**: `src/components/ui/`
- **Konfiguracja**: `components.json`
- **Zainstalowane komponenty**:
  - Button (z Radix UI)
- **Ikony**: lucide-react@^0.487.0

---

## 6. Backend & Database

### Supabase

- **Wersja**: 2.53.6
- **Rola**:
  - Authentication (e-mail + hasło)
  - Database (PostgreSQL)
  - Real-time subscriptions
- **Struktura**:
  - Client: `src/db/supabase.client.ts`
  - Middleware: `src/middleware/index.ts`
  - Types: `src/db/database.types.ts`
- **Przepływ danych**: Kontekst `context.locals.supabase` w Astro routes

### Migracje

- **System**: Supabase CLI migrations
- **Lokalizacja**: `supabase/migrations/`
- **Format**: `YYYYMMDDHHmmss_description.sql`
- **RLS**: Włączone Row Level Security dla wszystkich tabel

---

## 7. Walidacja danych

### Zod

- **Wykorzystanie**: Walidacja danych API oraz schematów Supabase
- **Zastosowanie**: Wszystkie formularze, endpointy API

---

## 8. Narzędzia deweloperskie

### Package Manager: Bun

- **Wersja**: 1.3.1
- **Rola**: Zarządzanie zależnościami
- **Komendy**:
  - `bun install` – instalacja zależności
  - `bun update` – aktualizacja pakietów
  - `bun run <script>` – uruchamianie skryptów
  - `bunx` – pakietów jednorazowych

### ESLint & Prettier

- **ESLint**: 9.23.0
  - `@eslint/compat` (1.2.7)
  - `@eslint/js` (9.23.0)
  - `@typescript-eslint/eslint-plugin` (8.28.0)
  - `@typescript-eslint/parser` (^8.46.2)
  - `eslint-plugin-astro` (1.3.1)
  - `eslint-plugin-import` (2.31.0)
  - `eslint-plugin-jsx-a11y` (6.10.2)
  - `eslint-plugin-prettier` (5.2.5)
  - `eslint-plugin-react` (7.37.4)
  - `eslint-plugin-react-compiler` (19.0.0-beta-aeaed83-20250323)
  - `eslint-plugin-react-hooks` (5.2.0)
  - `eslint-plugin-react-compiler` – React Compiler support

- **Prettier**:
  - `prettier-plugin-astro` (0.14.1)

### Git Hooks

- **Husky**: 9.1.7
- **lint-staged**: 15.5.0
- **Pre-commit**: Automatyczne lintowanie i formatowanie

---

## 9. Build Tools & Configuration

### Vite

- **Rola**: Build tool (używany przez Astro)
- **Plugin**: `@tailwindcss/vite` (Tailwind CSS 4)
- **Konfiguracja**: W `astro.config.mjs`

### TypeScript

- **Konfiguracja**: `tsconfig.json`
- **Features**: Strict mode, path aliases, module resolution

### ESLint Configuration

- **Config**: `eslint.config.js` (flat config)
- **Plugins**:
  - TypeScript support (`@typescript-eslint/*`)
  - React support (hooks, compiler)
  - Accessibilidade (`eslint-plugin-jsx-a11y`)
  - Import rules
  - Astro support

### Prettier

- **Config**: `.prettierrc.json`
- **Plugin**: `prettier-plugin-astro`
- **Integration**: Auto-format on pre-commit (lint-staged)

---

## 10. Deployment & Build Configuration

### Adapter

- **@astrojs/node**: 9.5.0 – Node.js adapter (SSR)
- **Mode**: standalone
- **Output**: `dist/` directory

### Environment Variables

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
```

---

## 11. Development Workflow

### Available Scripts

```bash
bun run dev        # Development server (port 3000)
bun run build      # Build for production
bun run preview    # Preview production build
bun run lint       # Run ESLint
bun run lint:fix   # Fix lint issues automatically
bun run format     # Format files with Prettier
```

### Git Hooks (Husky + lint-staged)

- **Husky**: 9.1.7 – Git hooks management
- **lint-staged**: 15.5.0 – Run linters on staged files
- **Pre-commit**: Auto-run ESLint + Prettier on staged files
  - `*.{ts,tsx,astro}` → ESLint fix
  - `*.{json,css,md}` → Prettier format

---

## 12. Zasoby i dokumentacja

### Oficjalne dokumentacje

- [Astro](https://astro.build/docs)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Shadcn/ui](https://ui.shadcn.com/)
- [Supabase](https://supabase.com/docs)
- [Bun](https://bun.sh/)

### Konfiguracje projektowe

- `.cursor/rules/` – AI development rules (8 plików MDC)
- `.nvmrc` – Node.js version (22.21.0)
- `.gitignore` – Ignored files (Bun, cache, logs, etc.)
- `components.json` – Shadcn/ui configuration
- `tsconfig.json` – TypeScript configuration
- `eslint.config.js` – ESLint flat config
- `.prettierrc.json` – Prettier configuration
- `astro.config.mjs` – Astro configuration

---

## 13. Pełna lista zależności

### Dependencies (Production)

```json
{
  "@astrojs/node": "9.5.0",
  "@astrojs/react": "4.4.0",
  "@astrojs/sitemap": "3.6.0",
  "@radix-ui/react-slot": "^1.2.3",
  "@tailwindcss/vite": "^4.1.16",
  "@types/react": "^19.2.2",
  "@types/react-dom": "^19.2.2",
  "astro": "5.15.1",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "lucide-react": "^0.487.0",
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "supabase": "^2.53.6",
  "tailwind-merge": "^3.3.1",
  "tailwindcss": "^4.1.16",
  "tw-animate-css": "^1.4.0"
}
```

### DevDependencies

```json
{
  "@eslint/compat": "1.2.7",
  "@eslint/js": "9.23.0",
  "@typescript-eslint/eslint-plugin": "8.28.0",
  "@typescript-eslint/parser": "^8.46.2",
  "eslint": "9.23.0",
  "eslint-config-prettier": "10.1.1",
  "eslint-import-resolver-typescript": "4.2.5",
  "eslint-plugin-astro": "1.3.1",
  "eslint-plugin-import": "2.31.0",
  "eslint-plugin-jsx-a11y": "6.10.2",
  "eslint-plugin-prettier": "5.2.5",
  "eslint-plugin-react": "7.37.4",
  "eslint-plugin-react-compiler": "19.0.0-beta-aeaed83-20250323",
  "eslint-plugin-react-hooks": "5.2.0",
  "husky": "9.1.7",
  "lint-staged": "15.5.0",
  "prettier-plugin-astro": "0.14.1",
  "typescript-eslint": "8.28.0"
}
```

---

## 14. License & Status

- **License**: MIT License
- **Version**: 0.0.1 (preview)
- **Status**: 🚧 Work in progress

---

_Ostatnia aktualizacja: 2025-01-XX_
