# API Endpoint Implementation Plan: Generations (AI-Powered)

## 1. Przegląd punktu końcowego

Punkty końcowe umożliwiają generowanie par słownictwa przy użyciu AI oraz zarządzanie procesem generacji na poziomie użytkownika i talii (decku). Implementacja realizuje wymagania specyfikacji (limity dzienne, parametry wejściowe, walidacja), zapisuje stan operacji w tabeli `public.generations`, a błędy w `public.pair_generation_errors`. Dla MVP wdrażamy tryb synchroniczny (201 Created + zwrócone pary) z możliwością łatwego przełączenia na tryb asynchroniczny w przyszłości.

Zakres obejmuje trzy endpointy tworzące generację oraz jeden statusowy:

- POST `/api/generate/from-topic` – generacja 30 par na podstawie tematu.
- POST `/api/generate/from-text` – generacja 30 par na podstawie opisu tekstowego.
- POST `/api/generate/extend` – generacja dodatkowych 10 par dla istniejącej talii (+10).
- GET `/api/decks/:deckId/generation` – odczyt aktywnej generacji (status; już istnieje w repo, zachowujemy).

## 2. Szczegóły żądania

- Metoda HTTP: POST (dla trzech punktów generacji), GET (status)
- Struktura URL:
  - `/api/generate/from-topic`
  - `/api/generate/from-text`
  - `/api/generate/extend`
  - `/api/decks/:deckId/generation` (status)
- Parametry i Request Body:
  - from-topic (wymagane): `topic_id` (enum 20 wartości), `deck_id` (UUID)
    - opcjonalne: `content_type` ("auto"|"words"|"phrases"|"mini-phrases"), `register` ("neutral"|"informal"|"formal"), `exclude_pairs?: string[]`
  - from-text (wymagane): `text` (1–5000 znaków), `deck_id` (UUID)
    - opcjonalne: `content_type`, `register`, `exclude_pairs?: string[]`
  - extend (wymagane): `deck_id` (UUID), `base_generation_id` (UUID istniejącej generacji)
    - opcjonalne: `content_type`, `register`
- Nagłówki: `Authorization: Bearer {access_token}` (docelowo), w MVP używany `DEFAULT_USER_ID` (z `.env`) po stronie serwera.

## 3. Wykorzystywane typy

- DTO (z `src/types.ts`):
  - `GenerateFromTopicDTO`, `GenerateFromTextDTO`, `GenerateExtendDTO`
  - `GenerationResponseDTO`, `GeneratedPairDTO`, `GenerationMetadataDTO`, `QuotaDTO`
  - Pomocniczo: `TagRefDTO`, `GenerationContentType`, `GenerationRegister`, `TopicID`
- Command/DB types:
  - `Database['public']['Tables']['generations']['Insert'|'Update'|'Row']` (z `src/db/database.types.ts`)
  - Dla par: istniejące typy `PairInsert` jeśli w przyszłości będziemy zapisywać wygenerowane pary

## 3. Szczegóły odpowiedzi

- Sukces 201 Created (synchroniczne generowanie): `GenerationResponseDTO`
  - Pola kluczowe: `generation_id`, `deck_id`, `pairs_generated` (30 lub 10), `pairs[]`, `metadata{ generation_time_ms, cache_hit, cost_usd?, prompt_hash? }`, `quota{ used_today, remaining }`
- Odczyt statusu 200 OK: aktywna generacja (`id`, `status`, `deck_id`, `pairs_requested`, `created_at`, `started_at`)
- Błędy:
  - 400 Bad Request (błędy biznesowe danych wejściowych)
  - 401 Unauthorized (brak użytkownika)
  - 403 Forbidden (limit dzienny, brak własności talii)
  - 404 Not Found (brak talii / base_generation)
  - 409 Conflict (aktywna generacja istnieje lub brak unikalnych par w extend)
  - 413 Payload Too Large (tekst > 5000)
  - 422 Unprocessable Entity (błędy schematu Zod – zgodnie ze stylem repo)
  - 500 Internal Server Error (błędy serwerowe)
  - 503 Service Unavailable (dostawca AI niedostępny)

## 4. Przepływ danych

- Wejście → Walidacja (Zod) → Walidacja biznesowa (własność talii, quota, brak aktywnej generacji) → Rejestr „generations” (status `running`) → Cache (opcjonalnie) → Wezwanie providera AI → Walidacja wyniku (liczność par, typ, długości, tokeny) → Utworzenie/zwrot par (MVP: zwróć bez zapisu do `pairs`, lub przygotuj hook do zapisu) → Aktualizacja `generations.status = 'succeeded'` + metadane → Zwrócenie 201
- Błędy na dowolnym etapie: aktualizacja `generations.status = 'failed'` + wpis do `pair_generation_errors`, zwrócenie odpowiedniego kodu HTTP i struktury błędu

## 5. Względy bezpieczeństwa

- Supabase RLS: endpointy używają serwerowego service role key (SSR, po stronie serwera), nie ujawniamy do klienta. W produkcji: auth użytkownika + RLS, a service role tylko do operacji systemowych (tu: atomowe zmiany statusów, logi błędów).
- Autoryzacja: deck musi należeć do użytkownika (SELECT na `decks` z owner_user_id = userId). Brak dostępu → 403 lub 404 (wg polityki „nie ujawniaj istnienia”).
- Rate limiting / Abuse: minimalnie 1 aktywna generacja per user/deck egzekwowana przez unikalne indeksy; rozważ IP rate limit na reverse proxy.
- Walidacja wejścia (Zod) i wyjścia (post-processing kompromitujących treści, długości tokenów ≤ 8/strona – wg spec; sanitizacja whitespace; normowanie znaków przed deduplikacją gdy wdrożona).
- Ochrona promptów: nie logujemy pełnych promptów; przechowujemy tylko hash (`prompt_hash`, `prompt_sha256`).
- Konfiguracja: sekrety tylko w `.env`, nie commitujemy; dostęp przez `import.meta.env`.

## 6. Obsługa błędów

- Klasy błędów i mapowanie:
  - Walidacja schematu (Zod) → 422 + `ErrorResponseDTO`
  - Walidacja biznesowa (quota, brak własności, aktywna generacja) → 400/403/409/404
  - Błędy providera AI (timeout, limit, 5xx) → 503; log do `pair_generation_errors`
  - Nieoczekiwane błędy serwera → 500; log do `pair_generation_errors`
- Logowanie do DB (`pair_generation_errors`):
  - Pola: `deck_id`, `attempt`, `provider`, `model`, `prompt_sha256`, `request_params`, `error_code`, `error_message`, `error_details`, `http_status`, `retryable`, `duration_ms`, `cost_usd`, `cache_hit`
  - Insert z service role (RLS blokuje anon/auth)

## 7. Rozważania dotyczące wydajności

- Indeksy w `generations` (już w migracji): szybkie sprawdzanie aktywnej generacji per user/deck, pobieranie pending dla workerów.
- Cache wyników AI (klucz: hash wejścia + parametry) – etap opcjonalny, projekt interfejsu w serwisie; w MVP można pominąć.
- Minimalizacja rozmiaru odpowiedzi: `pairs` tylko potrzebne pola; brak nadmiarowych metadanych.
- Ewentualna asynchronizacja: łatwa zmiana ścieżki na 202 + Location przy dużych opóźnieniach/drogim modelu.

## 8. Kroki implementacji

1. Walidacja i typy

- Uzupełnij `src/lib/validation/generation.validation.ts`:
  - Dodaj `exclude_pairs?: z.array(z.string().uuid()).optional()` do schematów from-topic i from-text
  - Dodaj `generateExtendSchema = z.object({ deck_id: z.string().uuid(), base_generation_id: z.string().uuid(), content_type?: enum, register?: enum })`
- Zweryfikuj, że typy DTO w `src/types.ts` pokrywają parametry (są już zdefiniowane); brak zmian.

2. Serwisy domenowe

- Rozszerz `src/lib/services/generation.service.ts` o synchroniczne scenariusze:
  - `createAndRunFromTopic(supabase, userId, dto): Promise<GenerationResponseDTO>`
  - `createAndRunFromText(supabase, userId, dto): Promise<GenerationResponseDTO>`
  - `createAndRunExtend(supabase, userId, dto): Promise<GenerationResponseDTO>`
- Wspólne kroki (helpery):
  - `assertDeckOwnership(supabase, userId, deckId)`
  - `ensureQuotaAndNoActive(supabase, userId, deckId)` (limit 3/dzień + unikalne indeksy aktywności)
  - `insertGeneration(supabase, payload, status='running')` → zwraca `generation_id`
  - `callProviderAndValidate(params)` → AI provider wrapper (+ walidacja wyniku: liczba par, typy, limit tokenów na stronę ≤ 8)
  - `finalizeGenerationSuccess(supabase, generation_id, metadata)` → update `status='succeeded'`
  - `finalizeGenerationFailure(supabase, generation_id, err)` → update `status='failed'` + `logGenerationError(...)`
  - `computeQuota(supabase, userId)` – (jest już: `quota`)

3. Integracja z dostawcą AI

- Stwórz thin adapter `src/lib/services/ai.provider.ts` (interfejs + implementacja np. OpenAI) z metodami:
  - `generatePairsFromTopic(params): Promise<GeneratedPairDTO[]>`
  - `generatePairsFromText(params): Promise<GeneratedPairDTO[]>`
  - `extendPairs(params): Promise<GeneratedPairDTO[]>`
- Zwracaj ujednolicony kształt `GeneratedPairDTO[]`. Loguj `ai_model`, policz czas, ustaw `prompt_hash`.

4. Logowanie błędów

- Dodaj util `src/lib/services/generation-telemetry.service.ts`:
  - `logGenerationError(supabaseService, payload)` – insert do `pair_generation_errors`
  - Funkcja przyjmuje `provider`, `model`, `prompt_sha256`, `request_params`, `error_code`, `error_message`, `error_details`, `http_status`, `retryable`, `duration_ms`, `cost_usd`, `cache_hit`

5. Endpointy API (Astro)

- Zaktualizuj istniejące:
  - `src/pages/api/generate/from-topic.ts` – użyj nowej metody `createAndRunFromTopic(...)`; zwróć 201 i `GenerationResponseDTO`
  - `src/pages/api/generate/from-text.ts` – analogicznie
- Dodaj nowy plik:
  - `src/pages/api/generate/extend.ts` – parse body Zod (`generateExtendSchema`), `createAndRunExtend(...)`, zwróć 201
- GET `/api/decks/:deckId/generation` – pozostaje do śledzenia statusu (dla przyszłego trybu 202), brak zmian.

6. Kody statusów i odpowiedzi

- Sukces: 201 Created (generacja zakończona synchronicznie; header `Location: /api/decks/:deckId/generation` – opcjonalnie)
- Walidacja schematu: 422; Walidacja biznesowa: 400/403/404/409; Provider: 503; Serwer: 500; Tekst > 5000: 413
- Zwracaj `ErrorResponseDTO` spójnie z istniejącym stylem w repo

7. Bezpieczeństwo i konfiguracja

- Klucze: używaj `SUPABASE_SERVICE_ROLE_KEY` tylko po stronie serwera; AI klucze z `.env`
- Typy: import `SupabaseClient` z `src/db/supabase.client.ts` (dla typów); aliasy `@/...`
- Zgodnie z Rules for AI: `.cursor/rules/shared.mdc`, `backend.mdc`, `astro.mdc` (Zod, extract to services, `prerender = false`)

8. E2E przepływ i kontrola jakości

- Scenariusze manualne:
  - from-topic: poprawny temat, poprawna talia, brak aktywnej generacji → 201
  - from-text: `text` 1–5000; `413` dla 5001; `403` przy wyczerpanym limicie
  - extend: brak duplikatów, `404` gdy `base_generation_id` nie istnieje lub nie należy do usera/decku
  - aktywna generacja: `409` przy próbie równoległej
- `bun run lint:fix` i `bun run format` przed PR

---

## Załącznik A. Specyficzne reguły walidacji i biznesowe

- Limit dzienny: 3/dzień/liczą się tylko `status='succeeded'`
- Unikalne indeksy (migracja) wymuszają 1 aktywną generację per user i per deck – obsłuż konflikt (SQL 23505) jako `409 Conflict`
- Pairs count: dokładnie 30 (topic/text) lub 10 (extend)
- Każda para: typ zgodny z `content_type`; dla `auto` dystrybucja (60/30/10) – best‑effort, w MVP dopuszczalne odchylenie, ale liczba = N
- Długość stron par: ≤ 8 tokenów (MVP: licz tokeny jako słowa rozdzielone whitespace)
- `exclude_pairs` (topic/text): nie zwracaj par o ID w tej liście; w extend dodatkowo wyklucz wszystkie istniejące pary decku (flagged/known)

## Załącznik B. Mapowanie błędów → kody HTTP

- Brak auth (w MVP brak `DEFAULT_USER_ID`): 401
- Brak własności decku / dostępu: 403 (lub 404, jeżeli policy „nie ujawniaj”)
- Limit dzienny: 403
- Aktywna generacja istnieje: 409
- Nieprawidłowe parametry biznesowo (np. `topic_id` spoza listy, `register` nieobsługiwany): 400
- Tekst > 5000: 413
- `base_generation_id` nie istnieje / niezgodne deck_id: 404
- Provider timeout/limit: 503
- Inne/nieoczekiwane: 500

## Załącznik C. Przykładowe miejsca w kodzie

- Walidacja: `src/lib/validation/generation.validation.ts`
- Serwis generacji: `src/lib/services/generation.service.ts` (+ `ai.provider.ts`, `generation-telemetry.service.ts`)
- Endpointy: `src/pages/api/generate/*.ts`, `src/pages/api/decks/[deckId]/generation.ts`
- Typy: `src/types.ts`, `src/db/database.types.ts`
- Migracje: `supabase/migrations/20251105122136_create_generations.sql`, `20251030120000_create_pair_generation_errors.sql`
