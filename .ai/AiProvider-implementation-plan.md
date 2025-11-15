# AIProvider — Plan implementacji (MVP)

Dokument opisuje wdrożenie AI Provider z OpenRouter z uwzględnieniem decyzji oraz restrykcji z PRD. Skupia się na strategii promptów, schemacie JSON, walidacjach, integracji z istniejącym `OpenRouterService` i punktach styku w backendzie.

## Zakres i decyzje (MVP)

- Kierunek językowy: w MVP przyjmujemy, że `lang_a = PL` (polski), a `term_a` odpowiada `lang_a`, `term_b` odpowiada `lang_b` (mapowanie zgodne z danymi talii). Frontend pozostaje gotowy na inne języki.
- Modele (OpenRouter):
  - Domyślny: `openai/gpt-5-mini`.
  - Fallback: `openai/gpt-5`.
- Dystrybucja „auto” (60/30/10): na etapie MVP tylko instruktujemy model (bez re‑promptu korekcyjnego przy odchyleniach). Jakość i ewentualne korekty podejmiemy po testach.
- Banlist dla „+10”: przekazujemy do promptu znormalizowaną listę (limit ~100–120 pozycji); dodatkowe odrzucenia po stronie backendu.
- Output modelu: tylko `{ term_a, term_b, type, register }`. Pola `id`, `source`, `tags` (na razie puste) dodajemy lokalnie.

## Rezultaty prac (deliverables)

- Nowe pliki:
  - `src/lib/prompts/generation.ts` — budowanie wiadomości systemowej i użytkownika (topic/text/extend) z parametrami.
  - `src/lib/schemas/pair-generation.schema.ts` — JSON Schema dla `response_format` (strict) oraz eksport typu TS dla parsowania.
- Modyfikacje:
  - `src/lib/services/ai.provider.ts:1` — zastąpienie stubu adapterem do `OpenRouterService` (wywołania `chatJson`).
  - `src/lib/services/generation.service.ts` — pobranie języków talii (A/B) i zbudowanie banlisty dla „+10”; przekazanie parametrów do AIProvider.

## Strategia promptów (generyczne, parametryzowane)

### Wiadomość systemowa (template)

- Rola: dwujęzyczny leksykograf i nauczyciel. Generujesz pary tłumaczeń `{langA_name}` ↔ `{langB_name}` zgodnie z parametrami.
- Zwracaj wyłącznie JSON zgodny ze schematem (bez komentarzy, bez tekstu poza JSON).
- Zasady jakości i ograniczenia:
  - Każda strona pary ≤ 8 słów; usuń znaki specjalne, numerację, cudzysłowy; unikaj nazw własnych, chyba że temat ich wymaga.
  - `register` = `{register}` i `type` ∈ {`words`, `phrases`, `mini-phrases`} zgodnie z parametrem.
  - `auto` = 60% `words`, 30% `phrases`, 10% `mini-phrases` (instrukcja bez wymuszania re‑promptu w MVP).
  - Deduplikacja: unikaj duplikatów znaczeń, odmian i oczywistych synonimów.
  - Języki: `term_a` w `{langA_code}`, `term_b` w `{langB_code}`; nie mieszaj języków.
  - Finalna autokontrola: każdą pozycję skróć do ≤ 8 słów, zachowując sens i zgodność z `register` oraz `type`.

Przykładowy system message budowany w kodzie:

```
You are a bilingual lexicographer and teacher. Generate translation pairs {langA_name} ↔ {langB_name}.
Return ONLY JSON matching the provided schema. No prose, no comments.
Rules: per-side ≤ 8 words; no quotes or numbering; deduplicate meanings (including inflections/synonyms);
register={register}; type in {words|phrases|mini-phrases}; for auto use 60/30/10 distribution.
term_a in {langA_code}, term_b in {langB_code}.
```

### Wiadomość użytkownika — warianty

- Z tematu (topic):
  - `Topic: {topic_id} — {topic_label}` (etykieta z `src/components/generate/types.ts`)
  - `content_type={content_type}, register={register}, count={count}`
  - `A={langA_code}, B={langB_code}`
  - (opcjonalnie) `Avoid: {banlist_norm_joined}` — lista do ~100–120 haseł/znaczeń po normalizacji

- Z tekstu (free-form):
  - `Context: {text_excerpt}` (Tekst przekazany przez użytkownika; pełny tekst hashowany do telemetrii)
  - pozostałe pola jak wyżej

- „+10” (extend):
  - ten sam kontekst, ale nacisk na „avoid” z banlist (istniejące + flagged/known)

Uwagi dot. prompt engineering:

- Podajmy przykłady few‑shot (warte poniesienia kosztu). Jeśli JSON będzie niestabilny, wykonamy fallback do lepszego modelu.
- Minimalny payload „user” (krótkie, bez JSON-u narzędziowego), by ograniczyć tokeny.

## JSON Schema (response_format strict)

- Root: `{ pairs: PairItem[] }` z `minItems = maxItems = count`.
- PairItem:
  - `term_a`: string (1..64)
  - `term_b`: string (1..64)
  - `type`: enum(`words`, `phrases`, `mini-phrases`)
  - `register`: enum(`neutral`, `informal`, `formal`)
- `additionalProperties: false` (root i itemy).
- Implementacja w `src/lib/schemas/pair-generation.schema.ts` + eksport typu TS (np. `PairGenerationSchemaOut`).

## Banlist i normalizacja

- Źródła banlisty:
  - „+10”: istniejące pary w talii (bieżące + flagged + znane) → znormalizowane `term_a` i `term_b`.
  - `exclude_pairs` z API (UUID → lookup w DB i pobranie tekstów do normalizacji).
- Normalizacja dla porównań:
  - `trim`, redukcja spacji, lowercasing, uproszczenie diakrytyków (tylko do porównań), opcjonalnie prosty lemat, usunięcie znaków specjalnych.
- Limit długości w prompt: max ~200–240 wpisów (reszta odrzucana post‑hoc).

## Walidacje i post‑processing po stronie backendu

- Walidacja JSON względem schematu (Zod/TS + schema strict z OpenRouter).
- Limit ≤ 8 słów/stronę: twarde egzekwowanie (cięcie „z sensem”: ucięcie po 8 tokenach z zachowaniem spójności interpunkcji; jeśli puste → odrzucenie pozycji).
- Deduplikacja: porównania po normalizacji `term_a` i `term_b` z banlistą i w ramach batcha; odrzucenie duplikatów.
- Dystrybucja „auto”: w MVP brak re‑promptu; metrykuj odchylenie (telemetria).
- Uzupełnienia braków („+10”): w MVP bez re‑promptu; zwracamy mniej elementów tylko jeśli po odrzuceniach zabraknie (logujemy zdarzenie).

## Integracja w kodzie

- `src/lib/services/openrouter.service.ts:1` — gotowy klient; używamy `chatJson<T>()` z `response_format`.
- `src/lib/services/ai.provider.ts:1` — adapter:
  - `generateFromTopic({ deck_id, topic_id, content_type, register, count, exclude_pairs })`
  - `generateFromText({ deck_id, text, content_type, register, count, exclude_pairs })`
  - `extend({ deck_id, base_generation_id, content_type, register, count })`
  - Każda metoda:
    1. Pobiera z DB języki talii (A/B). W MVP `lang_a` ustawiamy na PL; `term_a` = PL.
    2. Buduje banlistę (w „+10” dodatkowo flagged/known dla talii). Limit do ~100–120.
    3. Buduje prompty (system + user) i woła `chatJson` z powyższym schematem.
    4. Waliduje wynik, normalizuje, deduplikuje, tnie tokeny >8; dodaje `id`, `source="ai_generated"`, `tags: []`.
    5. Zwraca `pairs` + `metadata` (`generation_time_ms`, `cache_hit`, `prompt_hash`, opcj. `cost_usd`).

- `src/lib/services/generation.service.ts` — doposażyć:
  - Pobranie języków talii (A/B) i przekazanie do AIProvider.
  - Zbudowanie banlisty dla „+10” z istniejących/flagged/known.
  - Przekazywanie `exclude_pairs` jako część banlisty (po tekście, nie po UUID).

## Modele i parametry inferencji

- Domyślny model: `openai/gpt-5-mini`.
- Fallback: `openai/gpt-5` (przy błędach JSON/serwera/timeoutach według retry w `OpenRouterService`).
- Startowe parametry (bezpieczne): `temperature=0.4`, `top_p=0.9`, `max_tokens≈2048`.

## Błędy, retry, timeouty

- Korzystamy z wyjątków `OpenRouter*Error` i retry/backoff z `OpenRouterService` (429, 5xx, sieć, timeouty).
- Mapowanie błędów do API: `UNAUTHORIZED`, `VALIDATION_ERROR`, `CONFLICT`, `NOT_FOUND`, `FORBIDDEN`, `INTERNAL_ERROR`.

## Telemetria i koszt

- Zbieramy: `generation_time_ms`, `prompt_hash` (SHA z parametrów + hash tekstu), `model`, liczba prób, finish_reason, rozkład typów przy `auto`.
- Koszt (`cost_usd`) opcjonalny (model → stawka). Cel z PRD: ≤ $0.03 / 50 par.

## Kryteria akceptacji (MVP)

- Z tematów i z tekstu: 50 par w <15 s (p95 <20 s) — o ile provider/model pozwoli (bez sieciowych degradacji).
- Każda strona pary ≤ 8 słów; brak duplikatów po normalizacji; pola zgodne ze schematem.
- `auto` — dystrybucja instruowana, bez re‑promptu; odchylenie metrykujemy.
- „+10” — unika istniejących (banlista) i flagged/known; zwraca do 10 par (w MVP bez wymuszanego uzupełnienia, jeśli zabraknie po filtrach — logujemy).
- Output JSON bez prozy; zgodny z `response_format strict`.

## Plan wdrożenia (kroki)

1. Dodać `pair-generation.schema.ts` (schema strict + typy TS).
2. Dodać `prompts/generation.ts` (buildery system/user dla topic/text/extend + normalizacja banlisty + excerpt tekstu).
3. Zaimplementować adapter w `ai.provider.ts` (wywołanie `chatJson`, walidacje, normalizacja, dedup, limity tokenów, metryki).
4. Uzupełnić `generation.service.ts` o: pobieranie języków talii, budowę banlisty dla „+10”, przekazanie parametrów do provider’a.
5. Testy: jednostkowe (prompts, walidacje, dystrybucja liczenia), integracyjne (z kluczem — manualnie w DEV). Dostępny jest też smoke test: `bun run smoke:openrouter -- --topic travel --count 5` (wymaga `OPENROUTER_API_KEY` + opcjonalnie `OPENROUTER_PAIR_MODEL/FALLBACK_MODEL`).

## Odniesienia w repo (pomocne)

- Tematy: `src/types.ts:340` (enum TopicID), etykiety: `src/components/generate/types.ts:100`.
- Klient OpenRouter: `src/lib/services/openrouter.service.ts:1`.
- Walidacje requestów generate: `src/lib/validation/generation.validation.ts:1`.
- Stub do zastąpienia: `src/lib/services/ai.provider.ts:1`.
- Generation flow: `src/lib/services/generation.service.ts:1`.

## Poza zakresem (MVP)

- Re‑prompt dla korekty dystrybucji 60/30/10.
- Few‑shoty w promptach (chyba że JSON okaże się niestabilny w testach).
- Rozszerzona semantyczna deduplikacja (embeddingi, fuzzy matching poza prostą normalizacją).
