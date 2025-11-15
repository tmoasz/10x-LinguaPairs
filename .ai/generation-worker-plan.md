# Generation Worker – Plan działania

## 1. Kontekst

- Aktualna implementacja generacji par działa synchronicznie w API Astro.
- Generowanie 50 par trwa kilkadziesiąt sekund → długie requesty HTTP, brak UX dla „w trakcie”.
- Status `generations` od razu przechodzi na `succeeded`, bo odpowiadamy do klienta jeszcze przed zapisaniem par w db.
- Potrzebujemy:
  - asynchronicznej kolejki (zwiększenie UX, kontrola równoległości),
  - miejsca, które wykonuje ciężkie połączenia z OpenRouterem (limitowanie liczby równoległych żądań),
  - spójnego pipeline: pending → running → zapis par → succeeded/failed.

## 2. Wymagania techniczne

1. **Kolejka jobów** – źródło prawdy (tabela `generations` lub nowa `generation_jobs`).
2. **Worker** – proces niezależny od requestu HTTP, który:
   - bierze job w statusie `pending`,
   - zmienia na `running`, wywołuje `aiProvider` (z banlistą, parametrami),
   - wstawia wygenerowane pary do `pairs`,
   - aktualizuje status `generations` (czas startu, zakończenia, liczba par),
   - obsługuje błędy (status `failed`, wpis do `pair_generation_errors`).
3. **Kontrola równoległości** – worker pracuje np. na 1–2 jobach na raz; limit wynikający z kosztów/tokenów.
4. **UX** – front dostaje `generation_id` i pollowanie endpointu statusowego (`GET /api/decks/:deckId/generation`). W momencie `succeeded` deck jest zasilony parami.

## 3. Opcje wdrożenia workera

### 3.1. Node/Bun Job (odrębny proces)

- **Opis**: dedykowany proces (np. Bun lub Node) uruchamiany w ramach infrastruktury (serwer/batch/PM2). Łączy się z Supabase i wykonuje joby.
- **Infrastruktura**: wymaga miejsca, gdzie możemy stale utrzymywać proces (np. mały VPS / serverless worker Cron itd.).

**SWOT**

- **S (Strengths)**:
  - Pełna kontrola nad runtime, możliwością użycia istniejącego kodu (Bun).
  - Możliwość zaawansowanego schedulerowania (Batch, PM2, cron).
  - Prostsze debugowanie, bo to zwykły program Node/Bun.
- **W (Weaknesses)**:
  - Cloudflare Pages (nasz hosting) nie zapewnia natywnego środowiska do długotrwałych workerów → trzeba utrzymać oddzielny serwis (np. mały serwer).
  - Dodatkowe koszty i DevOps (monitoring, restart, logi).
- **O (Opportunities)**:
  - Możliwość łatwego skalowania / limitowania (np. kolejka w Redisie lub w samej DB).
  - Mamy pełny dostęp do NPM/Bun ekosystemu (retry, concurrency control).
- **T (Threats)**:
  - Brak natywnego wsparcia na Cloudflare Pages – konieczny inny runtime może komplikować architekturę.
  - Potencjalne ryzyko braku HA, jeśli proces padnie (trzeba monitorować).

### 3.2. Supabase Edge Functions z background tasks

- **Opis**: używamy `supabase/functions` (Deno runtime) i mechanizmu `EdgeRuntime.waitUntil(...)` (por. https://supabase.com/docs/guides/functions/background-tasks). Funkcja przyjmuje request, tworzy rekord w `generations`, wywołuje `EdgeRuntime.waitUntil(runGeneration(id))`, a `runGeneration` asynchronicznie woła OpenRoutera, zapisuje pary i aktualizuje status. Klient dostaje `202` z `generation_id` i pollowanie po API.

**SWOT**

- **S**:
  - Zero dodatkowego vendor lock-in poza Supabase (i tak już ją używamy).
  - Background task utrzymuje się po wysłaniu odpowiedzi (ważne: nie `await` na `waitUntil`).
  - Naturalny dostęp do Supabase (service role w Edge function).
- **W**:
  - Limit czasu Edge Functions (ok. 60s CPU/runtime) – musimy się w nim zmieścić (jak generacja trwa 30-40s, ok).
  - Trzeba uważać przy równoległych uruchomieniach, by dwa wywołania nie pobrały tego samego joba (np. status `pending` -> `running`).
- **O**:
  - Można w przyszłości dodać scheduler (np. "retry failed" wywoływany z innej funkcji).
  - Bez dopisywania nowej infrastruktury uzyskujemy async pipeline (create → run → save → status).
- **T**:
  - Jeśli w praktyce generacja > 60s, background task zostanie ubity – trzeba dodać retry/timeout.
  - Edge runtime to Deno: brak pełnego Node API — trzeba korzystać z fetch/crypto/innych natywnych funkcji.

### 3.3. Kontynuacja modelu synchronicznego (stan obecny)

- **Opis**: zostajemy przy długich requestach w Astro API i nie budujemy workera.

**SWOT**

- **S**:
  - Zero dodatkowych komponentów.
  - Kod już działa (póki co) – nie trzeba nic zmieniać.
- **W**:
  - Fatalne UX (długie requesty).
  - Brak kontroli nad liczbą równoległych wywołań (każdy request to od razu call do OpenRoutera).
  - Status `succeeded` nie oznacza zapisanych danych.
- **O**:
  - Można łatwo zaobserwować minimalne MVP i zebrać feedback.
- **T**:
  - Mogą pojawić się time-outy, problemy z RPO/RTO (w razie restartu request przepada).
  - Nie skalowalne – każda generacja to request trzymający worker SSR.

## 4. Rekomendacja i kolejne kroki

1. **Wybrać docelową platformę**:
   - Jeśli mamy możliwość utrzymania małego procesu (np. mały VPS), Node/Bun worker daje największą elastyczność.
   - Jeśli chcemy pozostać w ekosystemie Supabase bez dodatkowego hostingu, Edge Function + `waitUntil` jest bardzo realnym wariantem (ver. 3.2). **Cloudflare Workers nie rozważamy, by uniknąć dodatkowego vendor lock-in.**
   - Niezależnie od wariantu warto rozdzielić „planowanie” od „wykonania” poprzez tabelę `generation_jobs` (lub nowe kolumny w `generations`). Backend zapisuje pełny `prompt_payload` (JSON), preferowany model, banlistę, itp., a worker po prostu używa tych danych do wywołania OpenRoutera. Możemy też logować `model_used`, `token_usage`, `cost_usd`, `attempts`.

2. **Plan operacyjny dla Node/Bun job** (opcja A: dedykowany proces):
   - zdefiniować tabelę `generation_jobs` (lub użyć istniejącej `generations` z dodatkową kolumną `payload` + `retry_count`),
   - worker:
     1. Pobiera kolejny `pending` (SELECT FOR UPDATE SKIP LOCKED),
     2. Ustawia `status = running`, `started_at = now`,
     3. Wywołuje `aiProvider` → zapisuje pary do `pairs`,
     4. `status = succeeded`, `finished_at = now`, zapisuje liczbę par,
     5. Loguje błąd w razie wyjątku + `status = failed`.
   - Endpointy API:
     - `POST /api/generate/*` tylko wstawiają job + zwracają `generation_id`,
     - UI pollowa `/api/decks/:deckId/generation` lub dedykowany endpoint, aż status = succeeded.
   - Kontrola limitu tokenów: worker ma globalny semafor (np. w DB) i obsługuje max N jobów na raz.
   - Monitoring: logowanie w Supabase + np. Slack webhook przy failu.

3. **Plan operacyjny dla Supabase Edge Function** (opcja B: background tasks):
   - Endpoint (np. `supabase/functions/generate_pairs`) przyjmuje minimalny request (np. `generation_id`), bo cała logika budowania promptu pozostaje w backendzie i zapisuje się w `generation_jobs.prompt_payload`.
   - `runGeneration(generation_id)`:
     1. Pobiera rekord `generations` i `generation_jobs` (zawierający payload, banlist, preferowany model).
     2. Ustawia `status = running`, `started_at = now`.
     3. Wywołuje OpenRouter z `prompt_payload` (obsługa fallback). Po sukcesie loguje `model_used`, `token_usage`, `cost_usd` w `generation_jobs`.
     4. Normalizuje pary (może korzystać z tego samego schematu/validatora, co obecny `aiProvider`).
     5. Zapisuje pary do `pairs`.
     6. Aktualizuje `generations` (`status = succeeded`, `finished_at`, `pairs_generated`). Błąd → `failed` + wpis do `pair_generation_errors`.
   - Endpoint od razu zwraca `202` i `generation_id`; UI pollowa status jak dotychczas.
   - Limit czasu: jeśli generacja > 60s, job zostaje np. `pending` i worker spróbuje ponownie (retry/backoff).

4. **Zdefiniować API statusowe**:
   - `GET /api/generations/:id` lub obecny `GET /api/decks/:deckId/generation`.
   - Po `succeeded` – UI robi `GET /api/decks/:deckId/pairs` i widzi nowe pozycje.

5. **Zmiana logiki statusu**:
   - `succeeded` dopiero po wstawieniu par do DB (worker),
   - `failed` – w workerze, gdy call do OpenRoutera padnie (z retries?) albo zapis do DB się nie powiedzie.

## 5. Otwarte pytania

- Jak hostujemy worker (czy mamy serwer lub platformę do utrzymania Node/Bun procesu 24/7)?
- Jakie są realne limity Cloudflare dla długich requestów w workerach (czy 50 par da się wygenerować w 1 wywołaniu)?
- Jak duże jest ryzyko wzrostu kosztów przy braku throttlingu (ile jobów równolegle chcemy pozwolić)?
- Czy docelowo deck ma mieć wersjonowanie/test A-B (wtedy worker powinien wspierać bardziej rozbudowane pipeline’y)?

## 6. Podsumowanie

- **Największa wartość**: worker oddziela UI od czasu generacji i daje kontrolę nad kosztami OpenRoutera.
- **Najbardziej uniwersalna opcja**: odrębny Node/Bun proces (albo mały kontener) kontrolujący kolejkę w bazie; wymaga jednak dodatkowej infrastruktury spoza Cloudflare Pages.
- **Alternatywa w ekosystemie Supabase**: Edge Function z background tasks i zapisanym wcześniej `prompt_payload` + metadany, aby worker tylko wykonywał zadanie.
- **MVP fallback**: dopóki nie wdrożymy workera, zostajemy przy obecnym modelu synchronicznym (łatwiejsza prezentacja). Dokument ten traktujemy jako plan na kolejną iterację.

Warto przygotować PoC (np. worker w Node lub Supabase Edge), który korzysta z tabeli `generation_jobs`, zapisuje `model_used`, `token_usage`, `pairs_generated`, i sprawdzić czasy dla 50 par. Dzięki temu określimy limity concurrency i/lub retry oraz wprowadzimy bardziej skalowalny pipeline.\*\*\*
