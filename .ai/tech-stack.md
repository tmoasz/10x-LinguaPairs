# Tech Stack - 10x-LinguaPairs

## 1. Przegląd technologiczny

**10x-LinguaPairs** to aplikacja webowa (PWA) do nauki słownictwa. Stos technologiczny opiera się na Astro, React, TypeScript, Tailwind CSS i Supabase.

**Status**: 🚧 W trakcie rozwoju (MVP)

---

## 2. Frontend

- **Astro 5**: Główny framework do budowy stron i layoutów. Wykorzystuje Server-Side Rendering (SSR) z integracją dla React.
- **React 19**: Biblioteka do tworzenia interaktywnych komponentów UI.
- **TypeScript 5**: Zapewnia bezpieczeństwo typów w całym projekcie.

---

## 3. Stylowanie i UI

- **Tailwind CSS 4**: Framework CSS typu utility-first do szybkiego stylowania.
- **Shadcn/ui**: Zestaw reużywalnych komponentów UI opartych na Radix UI i Tailwind CSS.
- **Ikony**: `lucide-react`.

---

## 4. Backend i Baza Danych

- **Supabase**: Backend-as-a-Service (BaaS) oparty na PostgreSQL. Zapewnia autentykację, bazę danych i subskrypcje real-time. Migracje schematu bazy danych są zarządzane przez Supabase CLI.
- **Zod**: Biblioteka do walidacji danych po stronie serwera i klienta.

---

## 5. Narzędzia deweloperskie i Testowanie

- **Bun**: Szybki runtime i zarządca pakietów JavaScript.
- **ESLint & Prettier**: Narzędzia do lintowania i formatowania kodu.
- **Husky & lint-staged**: Git hooks do automatycznego uruchamiania linterów przed commitem.
- **Vitest**: Framework do testów jednostkowych i integracyjnych.
- **Playwright**: Framework do testów End-to-End (E2E).

Testowanie aplikacji opiera się na Vitest (testy jednostkowe/integracyjne, m.in. `test/README.md`) i Playwright (testy E2E, `e2e/README.md`).  
Smoke testy kluczowych integracji (np. OpenRouter) umieszczone są w katalogu `smoke/` z opisem w `smoke/README.md`.  
Skrócony, całościowy opis uruchamiania testów znajduje się w głównym pliku `TESTING.md` w katalogu projektu.

---

## 6. CI/CD i Hosting

- **GitHub Actions**: System CI/CD do automatyzacji testów (lint, unit, E2E) i budowania aplikacji dla każdego pull requesta i pusha do `master`.
- **Cloudflare Pages**: Platforma do hostingu aplikacji z globalnym CDN, automatycznymi wdrożeniami z GitHuba i obsługą SSR.

---

## 7. Licencja

- **Licencja**: MIT
- **Wersja**: 0.0.1 (preview)
