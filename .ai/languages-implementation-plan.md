# API Endpoint Implementation Plan: Languages Endpoints

## 1. Przegląd punktów końcowych

Niniejszy plan obejmuje implementację dwóch publicznych endpointów do zarządzania językami:

### 1.1 GET /api/languages

Endpoint umożliwia pobranie listy wszystkich aktywnych języków dostępnych w systemie. Jest wykorzystywany do wyświetlania użytkownikowi listy języków do wyboru podczas tworzenia talii. Obsługuje opcjonalne filtrowanie po statusie aktywności oraz sortowanie.

### 1.2 GET /api/languages/:id

Endpoint umożliwia pobranie szczegółowych informacji o konkretnym języku na podstawie jego UUID. Jest wykorzystywany do wyświetlania szczegółów języka w interfejsie użytkownika oraz do weryfikacji dostępności konkretnego języka.

**Wspólne cechy:**

- Oba endpointy są publiczne (dostępne dla użytkowników anonimowych i uwierzytelnionych)
- Zwracają dane zgodnie z zasadami Row Level Security (RLS)
- RLS automatycznie filtruje tylko aktywne języki (`is_active = true`) dla użytkowników anonimowych i uwierzytelnionych

## 2. Szczegóły żądania

### 2.1 GET /api/languages

- **HTTP Method:** `GET`
- **URL Pattern:** `/api/languages`
- **Headers:**
  - Brak wymaganych nagłówków (publiczny endpoint)
  - Opcjonalnie: `Authorization: Bearer <token>` (nie wymagane, ale obsługiwane)
- **Path Parameters:**
  - Brak
- **Query Parameters:**
  - `sort` (string, opcjonalne, domyślnie: `sort_order`) – pole do sortowania
- **Request Body:**
  - Brak (metoda GET)

### 2.2 GET /api/languages/:id

- **HTTP Method:** `GET`
- **URL Pattern:** `/api/languages/:id`
- **Headers:**
  - Brak wymaganych nagłówków (publiczny endpoint)
  - Opcjonalnie: `Authorization: Bearer <token>` (nie wymagane, ale obsługiwane)
- **Path Parameters:**
  - `id` (string, UUID) – **wymagany** – identyfikator języka w formacie UUID
- **Query Parameters:**
  - Brak parametrów zapytania
- **Request Body:**
  - Brak (metoda GET)

## 3. Wykorzystywane typy

### DTOs z `src/types.ts`:

- `LanguageDTO` – typ bazowy dla języka (zawiera: `id`, `code`, `name`, `name_native`, `flag_emoji`, `sort_order`) - bez `is_active` (zawsze aktywny, więc nie ma potrzeby przekazywać)
- `Language` (z `Tables<"languages">`) – pełny typ z bazy danych, zawierający również `created_at`

### Response Type:

Endpoint zwraca pełny obiekt `LanguageDTO` z dodatkowym polem `created_at`, co odpowiada pełnej strukturze z bazy danych. Można użyć bezpośrednio typu `Language` lub utworzyć rozszerzony DTO:

```typescript
// Możliwe podejście 1: Użycie typu Language bezpośrednio
type LanguageDetailDTO = Language;

// Możliwe podejście 2: Rozszerzenie LanguageDTO
type LanguageDetailDTO = LanguageDTO & {
  created_at: string;
};
```

### Validation Schema (Zod):

Należy utworzyć schematy walidacji dla obu endpointów:

```typescript
// src/lib/validation/language.validation.ts
import { z } from "zod";

// Schema dla query parameters listy języków
export const languagesListQuerySchema = z.object({
  sort: z.string().optional().default("sort_order"),
});

// Schema dla parametru ID w szczegółach języka
export const languageIdParamSchema = z.object({
  id: z.string().uuid("Invalid language ID format"),
});
```

## 4. Szczegóły odpowiedzi

### 4.1 GET /api/languages

#### Status 200 OK

**Response Body:**

```json
{
  "languages": [
    {
      "id": "uuid",
      "code": "pl",
      "name": "Polish",
      "name_native": "Polski",
      "flag_emoji": "🇵🇱",
      "sort_order": 1
    },
    {
      "id": "uuid",
      "code": "en-US",
      "name": "English (US)",
      "name_native": "English (US)",
      "flag_emoji": "🇺🇸",
      "sort_order": 2
    }
  ],
  "count": 6
}
```

**Headers:**

- `Content-Type: application/json`

#### Status 400 Bad Request

**Response Body (nieprawidłowe parametry zapytania):**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters",
    "details": [
      {
        "field": "sort",
        "message": "Invalid sort field"
      }
    ]
  }
}
```

#### Status 500 Internal Server Error

**Response Body:**

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

### 4.2 GET /api/languages/:id

#### Status 200 OK

**Response Body:**

```json
{
  "id": "uuid",
  "code": "pl",
  "name": "Polish",
  "name_native": "Polski",
  "flag_emoji": "🇵🇱",
  "sort_order": 1,
  "created_at": "2025-01-01T00:00:00Z"
}
```

**Headers:**

- `Content-Type: application/json`

#### Status 404 Not Found

**Response Body:**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Language not found"
  }
}
```

**Headers:**

- `Content-Type: application/json`

#### Status 400 Bad Request

**Response Body (nieprawidłowy format UUID):**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid language ID format",
    "details": [
      {
        "field": "id",
        "message": "Invalid UUID format"
      }
    ]
  }
}
```

#### Status 500 Internal Server Error

**Response Body:**

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## 5. Przepływ danych

### 5.1 GET /api/languages

#### Krok 1: Parsowanie parametrów zapytania

1. Pobranie parametrów z `context.url.searchParams`
2. Walidacja parametrów za pomocą Zod schema (`languagesListQuerySchema`)
3. Zwrócenie 400 w przypadku nieprawidłowych parametrów

#### Krok 2: Pobranie danych z bazy danych

1. Wywołanie serwisu `languageService.getLanguages(supabase, options)`
2. Serwis wykonuje zapytanie **zawsze z filtrem `is_active = true`**:

   ```typescript
   let query = supabase.from("languages").select("*", { count: "exact" }).eq("is_active", true); // Business rule: zawsze tylko aktywne języki

   const sortField = options.sort || "sort_order";
   query = query.order(sortField, { ascending: true });

   const { data, error, count } = await query;
   ```

3. RLS dodatkowo zabezpiecza, że użytkownicy anonimowi i uwierzytelnieni widzą tylko aktywne języki
4. Transformacja do `LanguageDTO[]` (bez `created_at` dla listy)

#### Krok 3: Transformacja i odpowiedź

1. Zmapowanie wyników do `LanguageDTO[]`
2. Zwrócenie obiektu `LanguagesListDTO` z polami `languages` i `count` (status 200)
3. Obsługa błędów bazy danych → zwróć 500

#### Diagram przepływu:

```
Client Request (GET /api/languages?sort=sort_order)
    ↓
Astro API Route Handler
    ↓
[Parse & Validate Query Params] → 400 jeśli nieprawidłowe
    ↓
LanguageService.getLanguages()
    ↓
Supabase Query (is_active=true zawsze, z RLS, sortowanie)
    ↓
[Transform to DTOs]
    ↓
200 OK (return LanguagesListDTO)
```

### 5.2 GET /api/languages/:id

#### Krok 1: Parsowanie parametrów URL

1. Pobranie parametru `id` z `context.params.id`
2. Walidacja formatu UUID za pomocą Zod schema
3. Zwrócenie 400 w przypadku nieprawidłowego formatu

#### Krok 2: Pobranie danych z bazy danych

1. Wywołanie serwisu `languageService.getLanguageById(supabase, id)`
2. Serwis wykonuje zapytanie:
   ```typescript
   const { data, error } = await supabase.from("languages").select("*").eq("id", id).single();
   ```
3. RLS automatycznie filtruje tylko aktywne języki (`is_active = true`) dla użytkowników anonimowych i uwierzytelnionych
4. Sprawdzenie czy rekord został znaleziony

#### Krok 3: Transformacja i odpowiedź

1. Jeśli język nie istnieje lub nie jest aktywny → zwróć 404
2. Jeśli język istnieje → zwróć pełny obiekt `Language` jako JSON (status 200)
3. Obsługa błędów bazy danych → zwróć 500

#### Diagram przepływu:

```
Client Request (GET /api/languages/:id)
    ↓
Astro API Route Handler
    ↓
[Parse & Validate UUID] → 400 jeśli nieprawidłowy
    ↓
LanguageService.getLanguageById()
    ↓
Supabase Query (z RLS)
    ↓
[Check Result]
    ├─ Found → 200 OK (return Language with created_at)
    ├─ Not Found → 404 Not Found
    └─ DB Error → 500 Internal Server Error
```

## 6. Względy bezpieczeństwa

### Row Level Security (RLS)

- Tabela `languages` ma włączone RLS
- Polityka `languages_select_anon` i `languages_select_authenticated` pozwalają na SELECT tylko dla aktywnych języków (`is_active = true`)
- Użytkownicy nie mogą modyfikować ani tworzyć języków (mutacje tylko dla service role)
- **Business Rule:** API zawsze zwraca tylko aktywne języki (`is_active = true`)
- **Implementacja:**
  - RLS jest egzekwowane przez Supabase (warstwa bazy danych)
  - Serwis dodatkowo filtruje po `is_active = true` (warstwa aplikacji)
  - Podwójna ochrona zapewnia, że nieaktywne języki nigdy nie trafią do odpowiedzi

### Walidacja danych wejściowych

- **UUID Validation:** Parametr `id` musi być poprawnym UUID (walidacja za pomocą Zod)
- **SQL Injection:** Supabase używa parametrówzowanych zapytań, co eliminuje ryzyko SQL injection
- **Path Traversal:** Astro automatycznie parsuje parametry URL, nie ma ryzyka path traversal

### Autoryzacja

- **Endpoint jest publiczny** – nie wymaga uwierzytelnienia
- Jednak RLS zapewnia, że zwracane są tylko aktywne języki
- Użytkownicy nie mogą modyfikować danych (tylko odczyt)

### Rate Limiting (Future)

- Obecnie nie implementowane w MVP
- W przyszłości rozważyć rate limiting dla publicznych endpointów (np. 100 requestów/minutę per IP)

## 7. Obsługa błędów

### Katalog błędów

| Kod błędu          | Status HTTP | Scenariusz                                                    | Wiadomość użytkownika          | Akcja systemu                          | Endpoint               |
| ------------------ | ----------- | ------------------------------------------------------------- | ------------------------------ | -------------------------------------- | ---------------------- |
| `VALIDATION_ERROR` | 400         | Nieprawidłowe parametry zapytania (`sort`)                    | "Invalid query parameters"     | Zwróć 400 z details                    | GET /api/languages     |
| `VALIDATION_ERROR` | 400         | Nieprawidłowy format UUID w parametrze `id`                   | "Invalid language ID format"   | Zwróć 400 z details wskazującymi pole  | GET /api/languages/:id |
| `NOT_FOUND`        | 404         | Język nie istnieje w bazie danych                             | "Language not found"           | Zwróć 404                              | GET /api/languages/:id |
| `NOT_FOUND`        | 404         | Język istnieje ale `is_active = false` (filtrowane przez RLS) | "Language not found"           | Zwróć 404 (RLS automatycznie filtruje) | GET /api/languages/:id |
| `INTERNAL_ERROR`   | 500         | Błąd połączenia z bazą danych                                 | "An unexpected error occurred" | Zwróć 500, zaloguj pełny stack trace   | Oba                    |
| `INTERNAL_ERROR`   | 500         | Nieoczekiwany wyjątek w kodzie                                | "An unexpected error occurred" | Zwróć 500, zaloguj pełny stack trace   | Oba                    |

### Strategia logowania błędów

#### Development

- Pełny stack trace w konsoli (`console.error`)
- Szczegóły błędów Supabase w logach
- Szczegóły parametrów zapytania dla debugowania

#### Production

- Generic error messages dla użytkownika końcowego
- Szczegółowe logi w systemie logowania (nie w response)
- Logowanie strukturyzowane (rozważyć w przyszłości)

### Error Handling Flow w kodzie

```typescript
// Przykład struktury w endpoint
export const GET: APIRoute = async (context) => {
  try {
    // 1. Walidacja parametru
    const validatedParams = languageIdParamSchema.parse({ id: context.params.id });

    // 2. Wywołanie serwisu
    const language = await languageService.getLanguageById(context.locals.supabase, validatedParams.id);

    // 3. Sprawdzenie czy znaleziono
    if (!language) {
      return errorResponse(404, "NOT_FOUND", "Language not found");
    }

    // 4. Zwrócenie sukcesu
    return new Response(JSON.stringify(language), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Obsługa różnych typów błędów
    if (error instanceof z.ZodError) {
      return errorResponse(400, "VALIDATION_ERROR", "Invalid language ID format", error.errors);
    }
    // ... inne typy błędów
  }
};
```

## 8. Rozważania dotyczące wydajności

### Optymalizacje zapytań

#### Indeksy bazy danych

- Tabela `languages` ma PRIMARY KEY na `id` (uuid), co zapewnia szybki lookup O(log n)
- Indeks częściowy `idx_languages_active` na `(is_active, sort_order)` dla aktywnych języków
- **Wniosek:** Zapytanie po `id` będzie bardzo szybkie dzięki PRIMARY KEY

#### Strategia cachowania (Future)

- Rozważyć cache w pamięci dla danych języków (rzadko się zmieniają)
- TTL: np. 1 godzina (języki są statyczne)
- Inwalidacja cache przy zmianie danych (tylko przez service role)

### Wydajność endpointu

#### Oczekiwany czas odpowiedzi

- **Query DB:** < 10ms (dzięki PRIMARY KEY na UUID)
- **Total response time:** < 50ms (w idealnych warunkach)
- **Threshold alert:** > 200ms (do rozważenia w przyszłości)

#### Potencjalne wąskie gardła

- **Brak wąskich gardeł w MVP** – endpoint jest prosty i wydajny
- W przyszłości przy wysokim ruchu rozważyć:
  - Redis cache dla danych języków
  - CDN caching dla publicznych endpointów

### Monitoring i metryki (Future)

#### Metryki do śledzenia

- Czas odpowiedzi endpointu (p50, p95, p99)
- Rate błędów 4xx i 5xx
- Liczba requestów per język
- Czas wykonania query DB

#### Alarmy (Future)

- p95 > 200ms
- Error rate > 1%
- DB connection pool exhaustion

### Limity i constraints

#### Rate limiting (Future, nie w MVP)

- Publiczne endpointy: 100 requestów/minutę per IP
- Authenticated users: 1000 requestów/minutę per user

## 9. Etapy wdrożenia

### Faza 1: Przygotowanie typów i walidacji

#### Krok 1.1: Weryfikacja typów DTO

- [ ] Sprawdzić czy `LanguageDTO` i `Language` są zdefiniowane w `src/types.ts`
- [ ] Utworzyć typ dla szczegółów języka (z `created_at`) jeśli potrzebny
- [ ] Upewnić się, że typy są eksportowane

**Pliki:**

- `src/types.ts` (sprawdzenie istniejących typów)

#### Krok 1.2: Utworzenie schematów Zod

- [ ] Utworzyć plik `src/lib/validation/language.validation.ts`
- [ ] Zdefiniować `languagesListQuerySchema` dla walidacji parametrów zapytania listy
- [ ] Zdefiniować `languageIdParamSchema` dla walidacji UUID
- [ ] Wyeksportować schematy

**Pliki:**

- `src/lib/validation/language.validation.ts` (nowy)

**Przykład implementacji:**

```typescript
import { z } from "zod";

// Schema dla query parameters listy języków
export const languagesListQuerySchema = z.object({
  sort: z.string().optional().default("sort_order"),
});

// Schema dla parametru ID w szczegółach języka
export const languageIdParamSchema = z.object({
  id: z.string().uuid("Invalid language ID format"),
});
```

### Faza 2: Implementacja Service Layer

#### Krok 2.1: Utworzenie LanguageService

- [ ] Utworzyć plik `src/lib/services/language.service.ts`
- [ ] Zdefiniować obiekt `languageService` z metodami:
  - `getLanguages()` - pobieranie listy języków
  - `getLanguageById()` - pobieranie szczegółów języka
- [ ] Zaimportować typy i `SupabaseClient`

**Pliki:**

- `src/lib/services/language.service.ts` (nowy)

**Przykład struktury:**

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type { Language, LanguageDTO, LanguagesListDTO } from "@/types";

interface GetLanguagesOptions {
  sort?: string;
}

export const languageService = {
  async getLanguages(supabase: SupabaseClient, options: GetLanguagesOptions = {}): Promise<LanguagesListDTO> {
    // Implementation
  },

  async getLanguageById(supabase: SupabaseClient, id: string): Promise<Language | null> {
    // Implementation
  },
};
```

#### Krok 2.2: Implementacja pobierania listy języków

- [ ] Dodać metodę `getLanguages()` do serwisu
- [ ] Implementować query do Supabase **zawsze z filtrem `is_active = true`** (business rule):

  ```typescript
  let query = supabase.from("languages").select("*", { count: "exact" }).eq("is_active", true); // Business rule: zawsze tylko aktywne języki

  const sortField = options.sort || "sort_order";
  query = query.order(sortField, { ascending: true });

  const { data, error, count } = await query;
  ```

- [ ] Obsłużyć błędy Supabase (sprawdzić `error`)
- [ ] Zmapować wyniki do `LanguageDTO[]` (bez `created_at`)
- [ ] Zwrócić `LanguagesListDTO` z polami `languages` i `count`

#### Krok 2.3: Implementacja pobierania szczegółów języka

- [ ] Dodać metodę `getLanguageById()` do serwisu
- [ ] Dodać query do Supabase:
  ```typescript
  const { data, error } = await supabase.from("languages").select("*").eq("id", id).single();
  ```
- [ ] Obsłużyć błędy Supabase (sprawdzić `error`)
- [ ] Sprawdzić czy `data` jest `null` (język nie znaleziony)
- [ ] Zwrócić `Language | null` (z `created_at`)

#### Krok 2.4: Obsługa błędów w serwisie

- [ ] W `getLanguages()`: Jeśli `error` istnieje, rzucić `Error` z opisem
- [ ] W `getLanguageById()`: Jeśli `error` istnieje i to nie jest "not found", rzucić `Error` z opisem
- [ ] W `getLanguageById()`: Jeśli `data` jest `null`, zwrócić `null` (nie rzucać błędu)
- [ ] Logować błędy bazy danych z `console.error`

**Kompletna struktura LanguageService:**

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type { Language, LanguageDTO, LanguagesListDTO } from "@/types";

interface GetLanguagesOptions {
  sort?: string;
}

export const languageService = {
  async getLanguages(supabase: SupabaseClient, options: GetLanguagesOptions = {}): Promise<LanguagesListDTO> {
    // Business rule: zawsze zwracamy tylko aktywne języki
    let query = supabase.from("languages").select("*", { count: "exact" }).eq("is_active", true);

    const sortField = options.sort || "sort_order";
    query = query.order(sortField, { ascending: true });

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching languages:", error);
      throw new Error(`Failed to fetch languages: ${error.message}`);
    }

    // Mapowanie do LanguageDTO (bez created_at i is_active)
    // is_active nie jest potrzebne w odpowiedzi, ponieważ zawsze zwracamy tylko aktywne języki
    const languages: LanguageDTO[] = (data || []).map((lang) => ({
      id: lang.id,
      code: lang.code,
      name: lang.name,
      name_native: lang.name_native,
      flag_emoji: lang.flag_emoji,
      sort_order: lang.sort_order,
    }));

    return {
      languages,
      count: count || 0,
    };
  },

  async getLanguageById(supabase: SupabaseClient, id: string): Promise<Language | null> {
    const { data, error } = await supabase.from("languages").select("*").eq("id", id).single();

    if (error) {
      // Supabase zwraca kod "PGRST116" gdy nie znaleziono rekordu
      if (error.code === "PGRST116") {
        return null;
      }

      console.error("Error fetching language:", error);
      throw new Error(`Failed to fetch language: ${error.message}`);
    }

    return data;
  },
};
```

### Faza 3: Implementacja API Endpoints

#### Krok 3.1: Utworzenie plików endpointów

- [ ] Utworzyć plik `src/pages/api/languages/index.ts` dla listy języków
- [ ] Utworzyć plik `src/pages/api/languages/[id].ts` dla szczegółów języka
- [ ] Dodać `export const prerender = false;` w obu plikach
- [ ] Zaimportować potrzebne moduły (Zod, service, typy)

**Pliki:**

- `src/pages/api/languages/index.ts` (nowy)
- `src/pages/api/languages/[id].ts` (nowy)

#### Krok 3.2: Implementacja handlera GET dla listy języków

- [ ] W pliku `src/pages/api/languages/index.ts` zdefiniować `export const GET: APIRoute = async (context) => {}`
- [ ] Pobranie parametrów z `context.url.searchParams`
- [ ] Uwaga: Endpoint jest publiczny, więc **nie wymaga** guarda autoryzacji

#### Krok 3.3: Parsowanie i walidacja parametrów zapytania (lista)

- [ ] Owinąć w try-catch
- [ ] Utworzyć obiekt z parametrów: `{ sort: searchParams.get("sort") }`
- [ ] **Uwaga:** Parametr `is_active` nie jest obsługiwany - business rule wymusza zawsze `is_active = true` na poziomie serwisu
- [ ] Walidować z Zod: `languagesListQuerySchema.parse()`
- [ ] Obsłużyć `ZodError` → zwrócić 400 z details

#### Krok 3.4: Wywołanie service layer (lista)

- [ ] Wywołać `languageService.getLanguages()` z:
  - `context.locals.supabase`
  - `validatedQuery` (options)
- [ ] Obsłużyć błędy → zwrócić 500

#### Krok 3.5: Zwrócenie odpowiedzi sukcesu (lista)

- [ ] Zwrócić `new Response(JSON.stringify(result), { status: 200 })`
- [ ] Dodać header `Content-Type: application/json`

#### Krok 3.6: Implementacja handlera GET dla szczegółów języka

- [ ] W pliku `src/pages/api/languages/[id].ts` zdefiniować `export const GET: APIRoute = async (context) => {}`
- [ ] Pobranie parametru `id` z `context.params.id`
- [ ] Uwaga: Endpoint jest publiczny, więc **nie wymaga** guarda autoryzacji

#### Krok 3.7: Parsowanie i walidacja parametru ID

- [ ] Owinąć w try-catch
- [ ] Walidować `{ id: context.params.id }` z Zod: `languageIdParamSchema.parse()`
- [ ] Obsłużyć `ZodError` → zwrócić 400 z details

#### Krok 3.8: Wywołanie service layer (szczegóły)

- [ ] Wywołać `languageService.getLanguageById()` z:
  - `context.locals.supabase`
  - `validatedParams.id`
- [ ] Sprawdzić czy wynik jest `null` → zwrócić 404
- [ ] Obsłużyć błędy → zwrócić 500

#### Krok 3.9: Zwrócenie odpowiedzi sukcesu (szczegóły)

- [ ] Zwrócić `new Response(JSON.stringify(language), { status: 200 })`
- [ ] Dodać header `Content-Type: application/json`

**Kompletna struktura endpointu listy (`src/pages/api/languages/index.ts`):**

```typescript
import type { APIRoute } from "astro";
import { z } from "zod";
import { languagesListQuerySchema } from "@/lib/validation/language.validation";
import { languageService } from "@/lib/services/language.service";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  try {
    // 1. Pobranie parametrów zapytania
    const searchParams = context.url.searchParams;
    const queryParams = {
      sort: searchParams.get("sort") || undefined,
    };

    // 2. Walidacja parametrów
    const validatedQuery = languagesListQuerySchema.parse(queryParams);

    // 3. Pobranie języków z bazy
    const result = await languageService.getLanguages(context.locals.supabase, validatedQuery);

    // 4. Zwrócenie sukcesu
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Obsługa błędów walidacji
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            details: error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Obsługa innych błędów
    console.error("Unexpected error in GET /api/languages:", error);

    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
```

**Kompletna struktura endpointu szczegółów (`src/pages/api/languages/[id].ts`):**

```typescript
import type { APIRoute } from "astro";
import { z } from "zod";
import { languageIdParamSchema } from "@/lib/validation/language.validation";
import { languageService } from "@/lib/services/language.service";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  try {
    // 1. Walidacja parametru
    const validatedParams = languageIdParamSchema.parse({
      id: context.params.id,
    });

    // 2. Pobranie języka z bazy
    const language = await languageService.getLanguageById(context.locals.supabase, validatedParams.id);

    // 3. Sprawdzenie czy znaleziono
    if (!language) {
      return new Response(
        JSON.stringify({
          error: {
            code: "NOT_FOUND",
            message: "Language not found",
          },
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Zwrócenie sukcesu
    return new Response(JSON.stringify(language), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Obsługa błędów walidacji
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid language ID format",
            details: error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Obsługa innych błędów
    console.error("Unexpected error in GET /api/languages/:id:", error);

    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
```

### Faza 4: Obsługa błędów

#### Krok 4.1: Weryfikacja struktury błędów

- [ ] Upewnić się, że wszystkie error responses mają format zgodny z `ErrorResponseDTO`
- [ ] Sprawdzić konsystencję kodów błędów z innymi endpointami

#### Krok 4.2: Implementacja error handling w endpoint

- [ ] Dodać catch dla `ZodError`
- [ ] Dodać catch dla generic errors
- [ ] Logować błędy z `console.error()` (w production rozważyć structured logging)

#### Krok 4.3: Standaryzacja error responses

- [ ] Upewnić się, że wszystkie error responses mają format:
  ```typescript
  {
    error: {
      code: string,
      message: string,
      details?: Array<{ field?: string; message: string }>
    }
  }
  ```

### Faza 5: Testy i walidacja

#### Krok 5.1: Testy manualne dla GET /api/languages (lista)

- [ ] Test 1: Pobranie listy wszystkich aktywnych języków → 200 OK z listą i count (zawsze tylko aktywne)
- [ ] Test 2: Pobranie listy z parametrem `sort=name` → 200 OK posortowane po nazwie
- [ ] Test 3: Pobranie listy z parametrem `sort=code` → 200 OK posortowane po kodzie
- [ ] Test 4: Pobranie listy bez parametrów → 200 OK domyślne sortowanie (sort_order)
- [ ] Test 5: Sprawdzenie struktury odpowiedzi (languages array, count number)
- [ ] Test 6: Sprawdzenie czy języki w liście nie mają pola `created_at`
- [ ] Test 7: Sprawdzenie czy pole `is_active` nie występuje w odpowiedzi (nie jest potrzebne, ponieważ zawsze zwracamy tylko aktywne)
- [ ] Test 8: Pobranie jako użytkownik anonimowy → 200 OK (tylko aktywne przez RLS i serwis)
- [ ] Test 9: Sprawdzenie czy nieaktywne języki nie są zwracane nawet jeśli istnieją w bazie

#### Krok 5.2: Testy manualne dla GET /api/languages/:id (szczegóły)

- [ ] Test 1: Pobranie istniejącego aktywnego języka → 200 OK z pełnymi danymi
- [ ] Test 2: Pobranie nieistniejącego języka → 404 Not Found
- [ ] Test 3: Nieprawidłowy format UUID (np. "invalid-uuid") → 400 Bad Request
- [ ] Test 4: Pobranie nieaktywnego języka (`is_active = false`) → 404 Not Found (RLS filtruje)
- [ ] Test 5: Pobranie języka jako użytkownik anonimowy → 200 OK (jeśli aktywny)
- [ ] Test 6: Pobranie języka jako użytkownik uwierzytelniony → 200 OK (jeśli aktywny)
- [ ] Test 7: Sprawdzenie wszystkich pól w odpowiedzi (id, code, name, name_native, flag_emoji, sort_order, created_at) - bez `is_active`

#### Krok 5.3: Weryfikacja zgodności z API Plan

- [ ] Sprawdzić czy response structure odpowiada specyfikacji w `api-plan.md`
- [ ] Sprawdzić czy status codes są poprawne
- [ ] Sprawdzić czy error messages są zgodne ze standardem

#### Krok 5.4: Weryfikacja wydajności

- [ ] Sprawdzić czas odpowiedzi (< 50ms w idealnych warunkach)
- [ ] Sprawdzić czy query używa PRIMARY KEY (sprawdzić w logach Supabase)

## Checklist przed deploymentem

- [ ] Wszystkie typy są zdefiniowane w `src/types.ts`
- [ ] Zod schema jest zaimplementowany i przetestowany
- [ ] LanguageService jest kompletny z error handling
- [ ] API endpoint zwraca poprawne status codes
- [ ] Endpoint jest dostępny bez autoryzacji (publiczny)
- [ ] Wszystkie error scenarios są obsłużone
- [ ] Response structure odpowiada specyfikacji API
- [ ] Testy manualne przeszły pomyślnie
- [ ] Linter errors są naprawione (`bun run lint:fix`)
- [ ] Code formatted (`bun run format`)
- [ ] Code review wykonany
- [ ] Dokumentacja zaktualizowana

---

## Dodatkowe uwagi

### Zależności między komponentami

```
types.ts
   ↓
validation/language.validation.ts
   ↓
services/language.service.ts
   ↓
pages/api/languages/
   ├── index.ts (lista)
   └── [id].ts (szczegóły)
```

### Sugerowane nazwy plików

1. `src/types.ts` (już istnieje, sprawdzić typy)
2. `src/lib/validation/language.validation.ts` (nowy)
3. `src/lib/services/language.service.ts` (nowy)
4. `src/pages/api/languages/index.ts` (nowy - lista języków)
5. `src/pages/api/languages/[id].ts` (nowy - szczegóły języka)

### Best Practices do zastosowania

1. **Early returns**: Najpierw guard clauses (validation), potem happy path
2. **Error handling**: Nie łapać błędów, których nie można obsłużyć sensownie
3. **Logging**: Logować wszystkie 500 errors z pełnym stack trace
4. **Type safety**: Używać TypeScript strict mode
5. **Immutability**: Preferować `const` nad `let`
6. **Async/await**: Używać zamiast `.then()` dla czytelności
7. **RLS Trust**: Ufać RLS Supabase, nie duplikować logiki w aplikacji

### Potencjalne rozszerzenia (Future)

1. **Caching**: Redis cache dla danych języków (statyczne dane)
2. **CDN**: CDN caching dla publicznych endpointów
3. **Analytics**: Tracking popularności języków (które języki są najczęściej pobierane)
4. **Rate Limiting**: Implementacja rate limiting dla publicznych endpointów
5. **Batch endpoint**: `GET /api/languages?ids=uuid1,uuid2` dla pobierania wielu języków jednocześnie

### Uwagi dotyczące RLS

- RLS jest konfigurowany w migracji `20251029184527_add_languages_table.sql`
- Polityki `languages_select_anon` i `languages_select_authenticated` automatycznie filtrują nieaktywne języki
- **Nie trzeba** dodatkowo sprawdzać `is_active` w kodzie aplikacji
- Jeśli język jest nieaktywny, query zwróci pusty wynik (null), co skutkuje 404

### Notacja Astro dla dynamic routes

- Astro używa notacji `[id].ts` dla dynamic routes
- Parametr dostępny jako `context.params.id`
- Alternatywnie można użyć `[...id].ts` dla catch-all, ale nie jest potrzebne w tym przypadku

---

**Data utworzenia:** 2025-01-XX  
**Status:** Gotowy do implementacji
