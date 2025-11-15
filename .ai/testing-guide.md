# Testing Guide – AI / Planning Reference

> Ten dokument łączy informacje z dawnych `.ai/TESTING.md` i `.ai/TESTING_SETUP.md`.  
> Skrócona instrukcja dla deweloperów znajduje się w głównym `TESTING.md` (root repo).

## 1. Cel i zakres

- Zebrane w jednym miejscu szczegóły dotyczące konfiguracji i procesu testowania 10x-LinguaPairs.
- Służy jako zaplecze projektowe – opisuje instalowane pakiety, strukturę katalogów, skrypty, konfiguracje oraz dobre praktyki.

## 2. Stos testowy i pakiety

| Warstwa          | Narzędzie / pakiet                         | Uwagi                                                                 |
|-----------------|---------------------------------------------|-----------------------------------------------------------------------|
| Runtime         | Bun                                         | Obsługuje `bun run <script>` dla wszystkich testów.                   |
| Testy unit/integration | `vitest`, `@vitest/ui`, `@vitest/coverage-v8` | jsdom, globalne API, raporty pokrycia.                                |
| React Testing   | `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` | Interakcje komponentów.                                               |
| DOM             | `jsdom`, `happy-dom`                        | Alternatywne implementacje DOM.                                      |
| Vite plugin     | `@vitejs/plugin-react`                      | Integracja z Vitest.                                                  |
| Testy E2E       | `@playwright/test`                          | Steruje Chromium desktop (instalowany przez `bunx playwright install`). |

## 3. Struktura katalogów testowych

```
10x-LinguaPairs/
├── test/                  # narzędzia, setup i zasoby dla Vitest
│   ├── setup.ts
│   ├── utils/
│   ├── mocks/
│   └── README.md
├── e2e/                   # scenariusze Playwright
│   ├── pages/             # (opcjonalnie) Page Object Models
│   ├── fixtures/
│   ├── example.spec.ts
│   └── README.md
├── smoke/                 # lekkie testy integracyjne (np. OpenRouter)
│   ├── smoke-openrouter.ts
│   └── README.md
└── src/
    ├── lib/utils/
    │   ├── string.utils.ts
    │   └── string.utils.test.ts
    └── components/ui/
        ├── button.tsx
        └── Button.test.tsx
```

Konfiguracje wspólne:

- `vitest.config.ts`, `vitest.d.ts`
- `playwright.config.ts`

Artefakty ignorowane w `.gitignore`: `coverage/`, `.vitest/`, `test-results/`, `playwright-report/`, `.playwright*`.

## 4. Skrypty Bun (`package.json`)

```jsonc
{
  "test": "vitest",
  "test:watch": "vitest --watch",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage",
  "test:e2e": "bun run build && playwright test",
  "test:e2e:ui": "bun run build && playwright test --ui",
  "test:e2e:debug": "bun run build && playwright test --debug",
  "test:e2e:codegen": "playwright codegen",
  "smoke:openrouter": "bun smoke/smoke-openrouter.ts"
}
```

## 5. Konfiguracje

### 5.1 Vitest (`vitest.config.ts`)

- `environment: 'jsdom'`
- `globals: true`
- `setupFiles: ['test/setup.ts']`
- Dostępne raporty pokrycia: HTML / text / LCOV (V8)
- Alias `@/*` zgodny z `tsconfig.json`

### 5.2 Playwright (`playwright.config.ts`)

- Przeglądarka: Chromium (Desktop Chrome)
- `baseURL: http://localhost:4321`
- Równoległość: włączona
- Retry: 2 w CI, 0 lokalnie
- Trace: na pierwszej próbie ponownej
- Screenshoty i video: zapisywane przy porażkach
- `webServer`: automatyczne uruchomienie `astro preview` (port 4321) przed testami

### 5.3 TypeScript (`tsconfig.json`)

- Włączone typy: `vitest/globals`, `@testing-library/jest-dom`
- Uwzględnia plik `vitest.d.ts`

## 6. Istniejące testy referencyjne

- **Unit**: `src/lib/utils/string.utils.test.ts` – funkcje `capitalize`, `truncate`, `isValidEmail`.
- **Component**: `src/components/ui/Button.test.tsx` – warianty, rozmiary, disabled, `asChild`.
- **E2E**: `e2e/example.spec.ts` – podstawowe flow (home page, nawigacja, screenshot, API check).
- **Smoke**: `smoke/smoke-openrouter.ts` – generacja par poprzez OpenRouter (temat lub tekst).

## 7. Uruchamianie testów

### 7.1 Vitest

```bash
bun run test          # pełny zestaw
bun run test:watch    # tryb developerski
bun run test:ui       # UI Vitest
bun run test:coverage # raport pokrycia
```

### 7.2 Playwright

```bash
bun run test:e2e
bun run test:e2e:ui
bun run test:e2e:debug
bun run test:e2e:codegen
```

> Wszystkie skrypty E2E przed startem wykonują `bun run build` i korzystają z `webServer`.

### 7.3 Smoke test (OpenRouter)

```bash
# wymagane: OPENROUTER_API_KEY
bun run smoke:openrouter -- --topic travel --count 10
```

Więcej przykładów: `smoke/README.md`.

## 8. Pisanie testów – wytyczne

### 8.1 Zasady ogólne

1. Nazwy testów opisują zachowanie (`it('should ...')`).
2. Stosujemy wzorzec AAA (Arrange, Act, Assert) oraz uniezależniamy testy od siebie.
3. Mockujemy zewnętrzne zależności (Supabase, AI provider) w testach jednostkowych.
4. Pokrycie kodu traktujemy jako narzędzie lokalizacji brakujących testów, nie cel sam w sobie.

### 8.2 Testy unit/integration

- Testy kolokujemy (`*.test.ts(x)` obok kodu).
- Używamy `@testing-library/*` do interakcji z komponentami.
- Preferujemy semantyczne selektory (`getByRole`, `getByLabel`).
- W testach logiki mockujemy warstwy usług (`src/lib/services/**`).

### 8.3 Testy E2E

- Możemy stosować Page Object Model (`e2e/pages/**`) dla złożonych flow.
- Testujemy kluczowe ścieżki użytkownika (generowanie par, nauka, logowanie itp.).
- Zapewniamy stabilność: czekamy na stan UI, unikamy `waitForTimeout`.
- Śledzimy screenshoty/trace w raportach Playwright, szczególnie w CI.

## 9. Integracja z CI/CD

Przykładowy workflow (GitHub Actions):

```yaml
jobs:
  unit-tests:
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run test

  e2e-tests:
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bunx playwright install --with-deps chromium
      - run: bun run test:e2e
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

Pipeline repo (CI PR) wykonuje kolejno: lint → unit+coverage → E2E.

## 10. Utrzymanie i aktualizacje

- Aktualizacja Vitest: `bun update vitest @vitest/ui @vitest/coverage-v8`
- Aktualizacja Playwright: `bun update @playwright/test && bunx playwright install chromium`
- Aktualizacja Testing Library: `bun update @testing-library/react @testing-library/jest-dom`
- Po aktualizacjach uruchamiamy `bun run test` oraz `bun run test:e2e` w celu walidacji.

## 11. Materiały referencyjne

- `TESTING.md` – skrócony przewodnik dla devów.
- `test/README.md`, `e2e/README.md`, `smoke/README.md` – detale narzędziowe.
- `.cursor/rules/testing-quick-ref.mdc` – podsumowanie zasad testów.
- Oficjalna dokumentacja:
  - [Vitest](https://vitest.dev/)
  - [Playwright](https://playwright.dev/)
  - [Testing Library](https://testing-library.com/)

---

_Status przygotowania środowiska: ✅ (aktualizacja z 2025-11-10)_
