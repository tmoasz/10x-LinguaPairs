# Smoke testy – 10x‑LinguaPairs

Katalog `smoke/` zawiera lekkie testy typu **smoke**, które szybko sprawdzają kluczowe integracje z zewnętrznymi usługami – bez pełnego pokrycia testami jednostkowymi lub E2E.

## OpenRouter – smoke test

- Plik: `smoke/smoke-openrouter.ts`
- Cel: szybkie sprawdzenie, czy integracja z OpenRouterem potrafi wygenerować pary językowe dla wybranego tematu lub tekstu.

### Wymagane zmienne środowiskowe

Przed uruchomieniem ustaw co najmniej:

- `OPENROUTER_API_KEY`

Opcjonalne zmienne konfiguracyjne:

- `OPENROUTER_BASE_URL`
- `OPENROUTER_DEFAULT_MODEL`
- `OPENROUTER_PAIR_MODEL`
- `OPENROUTER_PAIR_FALLBACK_MODEL`
- `OPENROUTER_TIMEOUT_MS`
- `OPENROUTER_APP_TITLE`
- `OPENROUTER_SITE_URL`

### Jak uruchomić smoke test

Standardowe uruchomienie (korzysta ze skryptu w `package.json`):

```bash
bun run smoke:openrouter
```

Możesz też uruchomić skrypt bezpośrednio:

```bash
bun smoke/smoke-openrouter.ts
```

### Parametry CLI

Smoke test obsługuje kilka parametrów przekazywanych jako flagi:

- `--count <n>` – liczba par do wygenerowania (1–50, domyślnie 5),
- `--topic <id>` – identyfikator tematu (np. `travel`),
- `--text "<treść>"` – tryb generowania z własnego tekstu,
- `--contentType <auto|words|phrases|mini-phrases>`,
- `--register <neutral|informal|formal>`,
- `--langA <kod>` / `--langB <kod>` – kody języków (np. `pl`, `en`).

Przykład:

```bash
OPENROUTER_API_KEY=... bun run smoke:openrouter -- --topic travel --count 10
```

> Uwaga: wszystko po `--` jest przekazywane jako argumenty do skryptu `smoke-openrouter.ts`.

