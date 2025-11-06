# OpenRouter Service — Plan Wdrożenia

## 1. Opis usługi

Usługa OpenRouter jest cienką, bezpieczną i typowaną warstwą integracyjną nad API OpenRouter (Chat Completions), dostarczającą funkcje uzupełniania czatów LLM na potrzeby 10x‑LinguaPairs. Zapewnia:

- Wywołania synchroniczne i strumieniowe (SSE) dla czatów.
- Obsługę komunikatów `system` i `user`, zgodnych z OpenRouter.
- Ustrukturyzowane odpowiedzi przez `response_format` (JSON Schema z `strict: true`).
- Konfigurowalne modele i parametry inferencji per‑żądanie oraz domyślne.
- Spójne typy, retry/backoff, timeouts oraz mapowanie błędów.
- Telemetrię (opcjonalnie) z poszanowaniem prywatności (hashowanie treści).

Docelowe użycie: generacja i moderacja treści LLM w backendzie (Astro SSR/Node adapter), oraz serwowanie bezpiecznego API do frontendu bez ujawniania klucza.

—

## 2. Opis konstruktora

Sugestia lokalizacji: `src/lib/services/openrouter.service.ts` (TS, aliasy `@/…`).

```ts
export type ModelParams = {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  stop?: string[];
  seed?: number;
};

export type RetryOptions = { maxRetries: number; baseDelayMs: number; maxDelayMs: number };

export type OpenRouterServiceOptions = {
  apiKey: string; // wymagane
  baseUrl?: string; // domyślnie https://openrouter.ai/api/v1
  defaultModel?: string; // np. 'openrouter/anthropic/claude-3.5-sonnet'
  defaultParams?: ModelParams; // domyślne parametry modelu
  appTitle?: string; // X-Title — nazwa aplikacji
  siteUrl?: string; // HTTP-Referer — publiczny URL aplikacji
  timeoutMs?: number; // domyślnie 60_000
  retry?: RetryOptions; // domyślnie { maxRetries: 2, baseDelayMs: 500, maxDelayMs: 4000 }
  fetchImpl?: typeof fetch; // opcjonalnie custom fetch (Node/Bun)
  logger?: { debug?: Function; info?: Function; warn?: Function; error?: Function };
};
```

Rekomendowane zmienne środowiskowe (konfiguracja przez `import.meta.env` w SSR lub `process.env`):

- `OPENROUTER_API_KEY` — tajny klucz API (serwer‑only).
- `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1` — opcjonalny override.
- `OPENROUTER_DEFAULT_MODEL` — domyślny model.
- `OPENROUTER_TIMEOUT_MS=60000` — timeout.
- `OPENROUTER_APP_TITLE="10x-LinguaPairs"` — nagłówek identyfikujący aplikację (X-Title).
- `OPENROUTER_SITE_URL` — nagłówek referencyjny (HTTP-Referer/PUBLIC URL).

Wstrzyknięcie zależności: twórz instancję na warstwie serwerowej (np. singleton w SSR). Nie ujawniać klucza do klienta — komunikacja z frontem przez własne API (`src/pages/api/...`).

—

## 3. Publiczne metody i pola

```ts
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface JsonSchemaSpec {
  type: "json_schema";
  json_schema: { name: string; strict: true; schema: Record<string, unknown> };
}

export interface ChatRequest {
  messages: ChatMessage[]; // co najmniej jeden 'user'; opcjonalnie jeden 'system'
  model?: string; // override domyślnego modelu
  params?: ModelParams; // override domyślnych parametrów
  response_format?: JsonSchemaSpec; // wymuszenie JSON
  stream?: boolean; // tryb SSE
  abortSignal?: AbortSignal; // anulowanie żądania/strumienia
  metadata?: Record<string, string>; // opcjonalna telemetria
}

export interface ChatResponse {
  id: string;
  model: string;
  content: string; // scalona treść assistant (non-stream)
  finish_reason?: string; // np. 'stop', 'length', 'content_filter'
  raw: unknown; // surowa odpowiedź do debugowania
}

export class OpenRouterService {
  constructor(opts: OpenRouterServiceOptions);

  // 1) Wywołanie proste (non-stream)
  chat(req: ChatRequest): Promise<ChatResponse>;

  // 2) Wywołanie z ustrukturyzowanym JSON (response_format)
  chatJson<T>(
    req: Omit<ChatRequest, "response_format"> & {
      schemaName: string;
      schema: Record<string, unknown>; // JSON Schema draft-07-ish
    }
  ): Promise<{ data: T; raw: unknown; model: string; id: string }>;

  // 3) Wywołanie strumieniowe
  chatStream(
    req: ChatRequest & {
      onToken?: (chunk: string) => void; // kolejne tokeny/fragmenty
      onDone?: (finalText: string) => void; // końcowa agregacja
      onError?: (err: unknown) => void;
    }
  ): Promise<void>;

  // 4) Konfiguracja runtime
  setDefaults(input: { model?: string; params?: ModelParams }): void;
}
```

Przykłady włączenia elementów wymaganych przez OpenRouter (dopasowane do API):

1. Komunikat systemowy

```ts
const system: ChatMessage = {
  role: "system",
  content: "Jesteś pomocnym asystentem dla aplikacji do nauki słownictwa. Odpowiadaj zwięźle i rzeczowo.",
};
```

2. Komunikat użytkownika

```ts
const user: ChatMessage = {
  role: "user",
  content: "Wygeneruj 3 pary PL↔EN z tematu: podróże. Każda para ≤ 8 tokenów.",
};
```

3. Ustrukturyzowana odpowiedź (response_format, JSON Schema)

```ts
const deckPairSchema = {
  type: "object",
  additionalProperties: false,
  required: ["pairs"],
  properties: {
    pairs: {
      type: "array",
      minItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["l1", "l2", "type", "register", "source"],
        properties: {
          l1: { type: "string", minLength: 1 },
          l2: { type: "string", minLength: 1 },
          type: { type: "string", enum: ["word", "phrase", "mini-phrase"] },
          register: { type: "string", enum: ["neutral", "informal", "formal"] },
          source: { type: "string" },
        },
      },
    },
  },
} as const;

const response_format = {
  type: "json_schema",
  json_schema: {
    name: "DeckPairs",
    strict: true,
    schema: deckPairSchema,
  },
} satisfies JsonSchemaSpec;
```

4. Nazwa modelu

```ts
const model = "openrouter/anthropic/claude-3.5-sonnet";
// Alternatywy: 'openrouter/openai/gpt-4o-mini', 'openrouter/google/gemini-1.5-pro'
```

5. Parametry modelu

```ts
const params: ModelParams = {
  temperature: 0.3,
  top_p: 0.9,
  max_tokens: 800,
  presence_penalty: 0,
  frequency_penalty: 0,
  seed: 42,
};
```

Przykładowe wywołanie metody:

```ts
const svc = new OpenRouterService({
  apiKey: process.env.OPENROUTER_API_KEY!,
  appTitle: process.env.OPENROUTER_APP_TITLE || "10x-LinguaPairs",
  siteUrl: process.env.OPENROUTER_SITE_URL,
  defaultModel: process.env.OPENROUTER_DEFAULT_MODEL || "openrouter/anthropic/claude-3.5-sonnet",
});

const res = await svc.chatJson<{ pairs: { l1: string; l2: string; type: string; register: string; source: string }[] }>(
  {
    messages: [system, user],
    model,
    params,
    schemaName: "DeckPairs",
    schema: deckPairSchema,
  }
);
```

—

## 4. Prywatne metody i pola

Proponowane elementy implementacyjne klasy (niewystawiane publicznie):

- `private readonly baseUrl: string` — bazowy URL (`/api/v1`).
- `private readonly apiKey: string` — klucz (serwer‑only).
- `private defaults: { model?: string; params: ModelParams }` — domyślne ustawienia.
- `private fetchImpl: typeof fetch` — wstrzykiwalny fetch.
- `private logger` — opcjonalny logger.
- `private retry: RetryOptions` — konfiguracja ponowień.

Metody pomocnicze:

- `private buildHeaders()` — nagłówki: `Authorization: Bearer`, `Content-Type: application/json`, `HTTP-Referer`, `X-Title`.
- `private buildUrl(path: string)` — konkatenuje `baseUrl` i ścieżki (`/chat/completions`).
- `private withTimeout<T>(p: Promise<T>): Promise<T>` — opakowanie w timeout (`AbortController`).
- `private shouldRetry(status: number): boolean` — retry dla 429/5xx.
- `private backoff(attempt: number): number` — exponential backoff + jitter.
- `private normalizeResponse(json: any): ChatResponse` — wyciąga content/finish_reason/model/id.
- `private parseStream(reader, onToken)` — prosty parser SSE (`data: {...}\n\n`) agregujący `delta`/`content`.
- `private toOpenRouterPayload(req: ChatRequest)` — składa payload zgodny z OpenRouter.
- `private redactOrHash(input)` — ochrona prywatności w logach/telemetrii (np. SHA‑256).

—

## 5. Obsługa błędów

Scenariusze i zalecenia:

1. Brak/nieprawidłowy klucz (`401/403`)

- Działanie: rzuć `OpenRouterAuthError`; nie retry.
- Komunikat: „Błąd autoryzacji OpenRouter — sprawdź OPENROUTER_API_KEY”.

2. Limit zapytań (`429`)

- Działanie: do `retry.maxRetries` z backoffem; na koniec `OpenRouterRateLimitError`.
- Opcja: fallback do innego modelu (jeśli dostarczony `fallbackModel`).

3. Błąd dostawcy/serwera (`5xx`)

- Działanie: retry z backoffem; loguj `id`/`model` jeśli dostępne.

4. Błąd walidacji żądania (`400`)

- Działanie: `OpenRouterSchemaError` (np. niepoprawny `response_format` lub `messages`).
- Sugestia: dołącz fragment `payloadPreview` w błędzie (bez wrażliwych danych).

5. Przekroczony limit kontekstu / tokenów

- Działanie: `OpenRouterContextLengthError`; zasugeruj skrócenie promptu lub `max_tokens`.

6. Filtr treści (`finish_reason='content_filter'`)

- Działanie: `OpenRouterContentFilterError`; decyzja biznesowa: powtórka z innym promptem/parametrami lub komunikat do użytkownika.

7. Timeout / przerwane połączenie

- Działanie: `OpenRouterTimeoutError` lub `OpenRouterNetworkError` (w streamie — sygnalizuj `onError`).

8. Nieparsowalny JSON w trybie `response_format`

- Działanie: `OpenRouterParseError`; opcjonalnie zwróć surowy `content` w polu `raw`.

9. Błąd strumieniowania SSE

- Działanie: zakończ strumień, spróbuj dokończyć agregację, wywołaj `onError`.

Konwencja błędów (typy):

```ts
class OpenRouterError extends Error {
  code?: string;
  status?: number;
  cause?: unknown;
  details?: unknown;
}
class OpenRouterAuthError extends OpenRouterError {}
class OpenRouterRateLimitError extends OpenRouterError {}
class OpenRouterSchemaError extends OpenRouterError {}
class OpenRouterContextLengthError extends OpenRouterError {}
class OpenRouterContentFilterError extends OpenRouterError {}
class OpenRouterTimeoutError extends OpenRouterError {}
class OpenRouterNetworkError extends OpenRouterError {}
class OpenRouterParseError extends OpenRouterError {}
```

—

## 6. Kwestie bezpieczeństwa

- Klucz `OPENROUTER_API_KEY` wyłącznie po stronie serwera (SSR). Zakaz wywołań bezpośrednio z przeglądarki.
- Proxy API w Astro (`src/pages/api/openrouter/chat.ts`) — waliduj wejście Zodem, filtruj pola dozwolone.
- Ochrona przed nadużyciami: throttling/rate‑limit na własnym API (np. na IP/session).
- Redakcja logów: nie loguj pełnej treści promptów/odpowiedzi; loguj skrót (SHA‑256) i metadane (czas, model, koszt jeśli dostępny).
- Walidacja wejścia: schema Zod dla `messages`, `params`, `response_format` (np. whitelist pól; zakresy temperatury itp.).
- Bezpieczne domyślne parametry (np. `temperature <= 0.7`, sensowne `max_tokens`).
- CORS: tylko nasze originy dla endpointów serwerowych.
- Błędy: bez ujawniania wewnętrznych szczegółów; klasy błędów mapuj na HTTP (400/401/429/5xx).

—

## 7. Plan wdrożenia krok po kroku

1. Zmienne środowiskowe

- Dodaj do `.env` (bez commitowania sekretów):
  - `OPENROUTER_API_KEY=`
  - `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1`
  - `OPENROUTER_DEFAULT_MODEL=openrouter/anthropic/claude-3.5-sonnet`
  - `OPENROUTER_TIMEOUT_MS=60000`
  - `OPENROUTER_APP_TITLE=10x-LinguaPairs`
  - `OPENROUTER_SITE_URL=https://twoja-domena.example`

2. Struktura plików (zgodnie z projektem)

- `src/lib/services/openrouter.service.ts` — implementacja klasy.
- `src/lib/services/openrouter.errors.ts` — definicje błędów.
- `src/lib/services/openrouter.types.ts` — typy i interfejsy.
- `src/validation/openrouter.schemas.ts` — Zod dla wejścia API (opcjonalnie).
- `src/pages/api/openrouter/chat.ts` — endpoint proxy (Astro API route) ukrywający klucz.

3. Implementacja `OpenRouterService`

- Konstruktorem ustaw `baseUrl`, `headers` (Authorization, Content-Type, X-Title, HTTP-Referer), `timeout`, `retry`, `defaults`.
- `chat()` — non‑stream: POST `/chat/completions`, agreguj `choices[0]` do `content`.
- `chatJson()` — ustaw `response_format` wg wzorca; po odpowiedzi bezpiecznie `JSON.parse` i zwracaj typowane `T`.
- `chatStream()` — POST z `stream: true`; czytaj `ReadableStream`/SSE; wysyłaj tokeny przez `onToken`; agreguj do `onDone`.

4. Parser SSE (minimalny)

- Buforuj `Uint8Array` → `TextDecoder` → linie `\n\n`.
- Tylko linie rozpoczynające się od `data: `; sprawdzaj `[DONE]`.
- Dla JSON‑owych porcji wybieraj `delta.content`/`text` i emituj do `onToken`.

5. Retry/Timeout

- `shouldRetry(429/5xx)`; backoff z jitterem; `AbortController` dla timeoutu (`Promise.race`).

6. Walidacja wejścia (API route)

- Zod schema: `messages` (role in ['system','user','assistant'], content string), `model` string, `params` zakresy, opcjonalny `response_format`.
- Odrzuć pola nieznane; limit długości `content`/liczby wiadomości.

7. Telemetria (opcjonalnie)

- Loguj: `requestId`, `model`, `latencyMs`, `cacheHit?` (jeśli wprowadzisz), `finish_reason`.
- Treści: przechowuj jedynie skróty SHA‑256.

8. Integracja z funkcjami domenowymi

- Przykład: generator par (PL↔EN) korzysta z `chatJson()` z `DeckPairs` schema.
- Anty‑duplikacja i reguły PRD realizowane poza usługą OpenRouter (warstwa domenowa).

9. Test ręczny i sanity checks

- Uruchom `bun dev`; dodaj tymczasowy endpoint testowy w `src/pages/api/openrouter/chat.ts`.
- cURL przykład:

```bash
curl -X POST http://localhost:3000/api/openrouter/chat \
  -H 'content-type: application/json' \
  -d '{
    "messages": [
      {"role":"system","content":"Jesteś asystentem…"},
      {"role":"user","content":"Wygeneruj 3 pary…"}
    ],
    "model":"openrouter/anthropic/claude-3.5-sonnet",
    "params": {"temperature":0.3,"max_tokens":400},
    "response_format": {
      "type":"json_schema",
      "json_schema": {"name":"DeckPairs","strict":true, "schema": {"type":"object","properties":{"pairs":{"type":"array"}}}}
    }
  }'
```

## Załącznik: kształt payloadu do OpenRouter

Minimalny payload non‑stream:

```jsonc
{
  "model": "openrouter/anthropic/claude-3.5-sonnet",
  "messages": [
    { "role": "system", "content": "…" },
    { "role": "user", "content": "…" },
  ],
  "temperature": 0.3,
  "top_p": 0.9,
  "max_tokens": 800,
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "DeckPairs",
      "strict": true,
      "schema": {
        /* JSON Schema */
      },
    },
  },
}
```
