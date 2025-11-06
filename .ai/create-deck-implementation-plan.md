# API Endpoint Implementation Plan: POST /api/decks

## 1. Przegląd punktu końcowego

**Cel**: Utworzenie nowej talii kart językowych dla uwierzytelnionego użytkownika.

**Funkcjonalność**:

- Pozwala użytkownikom tworzyć nowe talie z określoną parą języków
- Umożliwia ustawienie tytułu, opisu i widoczności talii
- Automatycznie przypisuje zalogowanego użytkownika jako właściciela
- Waliduje poprawność języków i zapobiega tworzeniu talii z tym samym językiem źródłowym i docelowym

**Kontekst biznesowy**: Jest to kluczowy endpoint pozwalający użytkownikom rozpocząć budowanie własnych zestawów kart do nauki języków.

## 2. Szczegóły żądania

### Metoda HTTP

`POST`

### Struktura URL

`/api/decks`

### Nagłówki

- `Authorization: Bearer {access_token}` - **WYMAGANY**
- `Content-Type: application/json` - **WYMAGANY**

### Parametry

#### Wymagane (Request Body):

- `title` (string): Tytuł talii, 1-200 znaków
- `description` (string): Opis talii, 1-1000 znaków (używany do generowania par)
- `lang_a` (string): UUID języka źródłowego (FK → `languages.id`)
- `lang_b` (string): UUID języka docelowego (FK → `languages.id`)

#### Opcjonalne (Request Body):

- `visibility` (enum): Widoczność talii - "private" | "public" | "unlisted", domyślnie "private"

### Request Body (przykład)

```json
{
  "title": "Business English",
  "description": "Professional vocabulary for business meetings",
  "lang_a": "550e8400-e29b-41d4-a716-446655440001",
  "lang_b": "550e8400-e29b-41d4-a716-446655440002",
  "visibility": "private"
}
```

### Walidacja Request Body (Zod Schema)

```typescript
const createDeckSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200, "Title must be at most 200 characters"),
    description: z.string().min(1, "Description is required").max(1000, "Description must be at most 1000 characters"),
    lang_a: z.string().uuid("Invalid language UUID format"),
    lang_b: z.string().uuid("Invalid language UUID format"),
    visibility: z.enum(["private", "public", "unlisted"]).optional().default("private"),
  })
  .refine((data) => data.lang_a !== data.lang_b, {
    message: "Source and target languages must be different",
    path: ["lang_b"],
  });
```

## 3. Wykorzystywane typy

### Command Model (Request)

```typescript
// src/types.ts (already defined)
export interface CreateDeckDTO {
  title: string;
  description: string;
  lang_a: string; // Language UUID
  lang_b: string; // Language UUID
  visibility?: DeckVisibility;
}
```

### Response DTO

```typescript
// src/types.ts (already defined)
export interface DeckDetailDTO {
  id: string;
  owner_user_id: string;
  owner: DeckOwnerDTO;
  title: string;
  description: string;
  lang_a: LanguageRefExtendedDTO;
  lang_b: LanguageRefExtendedDTO;
  visibility: DeckVisibility;
  pairs_count: number;
  created_at: string;
  updated_at: string;
}
```

### Supporting DTOs

```typescript
export interface LanguageRefExtendedDTO {
  id: string;
  code: string;
  name: string;
}

export interface DeckOwnerDTO {
  id: string;
  username: string;
  avatar_url: string | null;
}

export type DeckVisibility = "private" | "public" | "unlisted";
```

### Database Entity (for reference)

```typescript
interface DeckEntity {
  id: string;
  owner_user_id: string;
  title: string;
  description: string;
  lang_a: string;
  lang_b: string;
  visibility: DeckVisibility;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
```

## 4. Szczegóły odpowiedzi

### Sukces - 201 Created

**Headers:**

- `Content-Type: application/json`
- `Location: /api/decks/{deck_id}` (opcjonalnie, good practice)

**Body:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "owner_user_id": "660e8400-e29b-41d4-a716-446655440000",
  "owner": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "username": "john_doe",
    "avatar_url": "https://example.com/avatars/john.jpg"
  },
  "title": "Business English",
  "description": "Professional vocabulary for business meetings",
  "lang_a": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "code": "pl",
    "name": "Polish"
  },
  "lang_b": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "code": "en-US",
    "name": "English (US)"
  },
  "visibility": "private",
  "pairs_count": 0,
  "created_at": "2025-01-16T15:00:00Z",
  "updated_at": "2025-01-16T15:00:00Z"
}
```

### Error Responses

#### 401 Unauthorized

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

#### 400 Bad Request

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "lang_b",
        "message": "Source and target languages must be different"
      }
    ]
  }
}
```

Inne przypadki 400:

- Języki są identyczne
- Nieprawidłowe UUID języków (nie istnieją w bazie)
- Tytuł poza zakresem 1-200 znaków
- Description poza zakresem 1-1000 znaków lub brak

#### 422 Unprocessable Entity

```json
{
  "error": {
    "code": "INVALID_FORMAT",
    "message": "Invalid data format",
    "details": [
      {
        "field": "lang_a",
        "message": "Invalid UUID format"
      }
    ]
  }
}
```

Przypadki 422:

- Nieprawidłowy format UUID
- Nieprawidłowa wartość enum visibility
- Zniekształcony JSON

#### 500 Internal Server Error

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## 5. Przepływ danych

### Diagram przepływu

```
1. Client Request (POST /api/decks)
   ↓
2. Astro Middleware (src/middleware/index.ts)
   - Walidacja Bearer token
   - Pobranie użytkownika z Supabase Auth
   - Ustawienie context.locals.supabase i context.locals.user
   ↓
3. API Endpoint Handler (src/pages/api/decks/index.ts)
   - Sprawdzenie context.locals.user (Guard clause)
   - Parsowanie request.json()
   ↓
4. Zod Validation
   - Walidacja struktury CreateDeckDTO
   - Walidacja typów i formatów
   - Sprawdzenie lang_a !== lang_b
   ↓
5. DeckService.createDeck()
   - Walidacja istnienia języków (query do languages table)
   - Utworzenie rekordu w tabeli decks
   - Pobranie utworzonej talii z join do languages i profiles
   ↓
6. Transformation Layer (w service)
   - Mapowanie DeckEntity → DeckDetailDTO
   - Rozwinięcie relacji (languages, owner profile)
   ↓
7. Response
   - Status 201 Created
   - JSON z DeckDetailDTO
```

### Szczegóły interakcji z Supabase

#### Krok 1: Walidacja języków

```sql
SELECT id, code, name
FROM languages
WHERE id IN ($1, $2) AND deleted_at IS NULL
```

**Cel**: Upewnić się, że oba języki istnieją przed utworzeniem talii

#### Krok 2: Utworzenie talii

```sql
INSERT INTO decks (
  owner_user_id,
  title,
  description,
  lang_a,
  lang_b,
  visibility
) VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *
```

#### Krok 3: Pobranie pełnych danych talii z relacjami

```sql
SELECT
  d.*,
  la.id as lang_a_id, la.code as lang_a_code, la.name as lang_a_name,
  lb.id as lang_b_id, lb.code as lang_b_code, lb.name as lang_b_name,
  p.id as owner_id, p.username, p.avatar_url,
  (SELECT COUNT(*) FROM pairs WHERE deck_id = d.id AND deleted_at IS NULL) as pairs_count
FROM decks d
INNER JOIN languages la ON d.lang_a = la.id
INNER JOIN languages lb ON d.lang_b = lb.id
INNER JOIN profiles p ON d.owner_user_id = p.id
WHERE d.id = $1 AND d.deleted_at IS NULL
```

## 6. Względy bezpieczeństwa

### Uwierzytelnianie (Authentication)

- **Mechanizm**: Bearer Token via Supabase Auth
- **Implementacja**:
  - Token walidowany w middleware `src/middleware/index.ts`
  - Użycie `supabase.auth.getUser()` do weryfikacji tokenu
  - User object dostępny w `context.locals.user`
- **Guard**: W endpointcie sprawdzenie `if (!context.locals.user)` → zwrot 401

### Autoryzacja (Authorization)

- **Owner Assignment**:
  - `owner_user_id` automatycznie ustawiany na `context.locals.user.id`
  - Użytkownik **NIE MOŻE** podać własnego `owner_user_id` w request body
  - To zabezpiecza przed podszywaniem się pod innych użytkowników
- **Visibility Control**: Użytkownik może tworzyć talie z dowolną widocznością

### Walidacja danych wejściowych

#### Warstwa 1: Zod Schema Validation

- Format UUID dla lang_a i lang_b
- Długość tytułu (1-200 znaków)
- Enum dla visibility
- Podstawowe sprawdzenie lang_a !== lang_b

#### Warstwa 2: Business Logic Validation (Service Layer)

- Weryfikacja istnienia języków w bazie danych
- Sprawdzenie czy języki nie są oznaczone jako usunięte (deleted_at IS NULL)

#### Warstwa 3: Database Constraints

- CHECK constraint: `lang_a <> lang_b` (zabezpieczenie na poziomie DB)
- Foreign Key constraints do `languages.id`
- NOT NULL constraints

### Zapobieganie atakom

#### SQL Injection

- **Ochrona**: Parametryzowane zapytania Supabase
- **Never**: Konkatenacja stringów w SQL

#### XSS (Cross-Site Scripting)

- **Ochrona**: Dane w JSON, frontend odpowiedzialny za sanitization przy renderowaniu
- **Uwaga**: Title i description mogą zawierać HTML - frontend musi escapować

#### Mass Assignment

- **Ochrona**: Explicit DTO mapping
- **Zabronione pola**: owner_user_id, id, created_at, updated_at, deleted_at nie mogą być ustawiane przez użytkownika

### Rate Limiting

- **MVP**: Nie implementowane
- **Future**: Rozważyć rate limiting per user (np. 100 talii/godzinę)

### CORS

- **Konfiguracja**: Należy upewnić się, że CORS jest odpowiednio skonfigurowany w Astro
- **Uwaga**: Bearer token wymaga proper CORS headers

## 7. Obsługa błędów

### Katalog błędów

| Kod              | Status | Scenariusz                                | Wiadomość użytkownika                                               | Akcja systemu                        |
| ---------------- | ------ | ----------------------------------------- | ------------------------------------------------------------------- | ------------------------------------ |
| UNAUTHORIZED     | 401    | Brak tokenu lub nieprawidłowy token       | "Authentication required"                                           | Zwróć 401, zaloguj próbę dostępu     |
| VALIDATION_ERROR | 400    | lang_a === lang_b                         | "Source and target languages must be different"                     | Zwróć 400 z details                  |
| VALIDATION_ERROR | 400    | Języki nie istnieją w DB                  | "One or more languages are invalid"                                 | Zwróć 400 z details                  |
| VALIDATION_ERROR | 400    | Tytuł poza zakresem 1-200                 | "Title must be between 1 and 200 characters"                        | Zwróć 400 z details                  |
| VALIDATION_ERROR | 400    | Description poza zakresem 1-1000 lub brak | "Description is required and must be between 1 and 1000 characters" | Zwróć 400 z details                  |
| INVALID_FORMAT   | 422    | Nieprawidłowy format UUID                 | "Invalid UUID format"                                               | Zwróć 422 z details                  |
| INVALID_FORMAT   | 422    | Nieprawidłowa wartość visibility          | "Visibility must be private, public, or unlisted"                   | Zwróć 422 z details                  |
| INVALID_FORMAT   | 422    | Zniekształcony JSON                       | "Invalid JSON format"                                               | Zwróć 422                            |
| INTERNAL_ERROR   | 500    | Database connection error                 | "An unexpected error occurred"                                      | Zwróć 500, zaloguj pełny stack trace |
| INTERNAL_ERROR   | 500    | Unexpected exception                      | "An unexpected error occurred"                                      | Zwróć 500, zaloguj pełny stack trace |

### Struktura odpowiedzi błędu

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{
      field?: string;
      message: string;
    }>;
  };
}
```

### Strategia logowania błędów

#### Development

- Pełny stack trace w konsoli
- Szczegóły błędów DB w response (dla debugowania)

#### Production

- Generic error messages dla użytkownika
- Szczegółowe logi w systemie logowania (nie w response)
- Logging library: console.error (MVP), consider structured logging later

### Error Handling Flow w kodzie

```typescript
// Przykład implementacji w endpoint
export const POST: APIRoute = async (context) => {
  // Guard: Authentication
  if (!context.locals.user) {
    return new Response(
      JSON.stringify({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      }),
      { status: 401 }
    );
  }

  try {
    // Parse and validate input
    const body = await context.request.json();
    const validatedData = createDeckSchema.parse(body);

    // Business logic
    const deck = await deckService.createDeck(context.locals.supabase, context.locals.user.id, validatedData);

    // Success response
    return new Response(JSON.stringify(deck), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Zod validation error
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
        }),
        { status: 422 }
      );
    }

    // Custom business errors
    if (error instanceof ValidationError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: error.message,
            details: error.details,
          },
        }),
        { status: 400 }
      );
    }

    // Unexpected errors
    console.error("Unexpected error creating deck:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      }),
      { status: 500 }
    );
  }
};
```

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła

#### 1. Multiple Database Queries

- **Problem**: 3 zapytania do DB (walidacja języków, insert, fetch z joins)
- **Wpływ**: Średni - ok. 30-50ms per request
- **Priorytet**: Niski w MVP

#### 2. Join Queries

- **Problem**: Query z 3 joins (languages x2, profiles) do pobrania pełnych danych
- **Wpływ**: Niski przy małej liczbie rekordów
- **Priorytet**: Niski w MVP

#### 3. Count Query dla pairs_count

- **Problem**: COUNT na pairs może być kosztowne przy dużej liczbie par
- **Wpływ**: Bardzo niski przy tworzeniu (zawsze 0)
- **Priorytet**: Bardzo niski

### Strategie optymalizacji

#### Optymalizacja 1: Database Indexing (ZAIMPLEMENTOWAĆ)

```sql
-- Indeksy dla foreign keys (jeśli nie istnieją)
CREATE INDEX IF NOT EXISTS idx_decks_owner_user_id ON decks(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_decks_lang_a ON decks(lang_a);
CREATE INDEX IF NOT EXISTS idx_decks_lang_b ON decks(lang_b);
CREATE INDEX IF NOT EXISTS idx_decks_deleted_at ON decks(deleted_at) WHERE deleted_at IS NULL;
```

#### Optymalizacja 2: Pojedyncze zapytanie z RETURNING (ROZWAŻYĆ)

```sql
-- Zamiast INSERT + SELECT, użyj CTE
WITH new_deck AS (
  INSERT INTO decks (owner_user_id, title, description, lang_a, lang_b, visibility)
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING *
)
SELECT
  d.*,
  la.id as lang_a_id, la.code as lang_a_code, la.name as lang_a_name,
  lb.id as lang_b_id, lb.code as lang_b_code, lb.name as lang_b_name,
  p.id as owner_id, p.username, p.avatar_url,
  0 as pairs_count
FROM new_deck d
INNER JOIN languages la ON d.lang_a = la.id
INNER JOIN languages lb ON d.lang_b = lb.id
INNER JOIN profiles p ON d.owner_user_id = p.id;
```

**Korzyść**: Redukcja z 3 do 2 zapytań (walidacja + insert+fetch)

#### Optymalizacja 3: Caching języków (FUTURE)

- **Problem**: Języki zmieniają się rzadko
- **Rozwiązanie**: Cache języków w pamięci/Redis na 1h
- **Korzyść**: Eliminacja query do languages przy walidacji
- **Priorytet**: Niski (languages query jest szybki)

#### Optymalizacja 4: Connection Pooling (WERYFIKACJA)

- **Sprawdzić**: Czy Supabase client ma connection pooling
- **Jeśli nie**: Rozważyć implementację pooling dla Astro SSR
- **Priorytet**: Średni jeśli występuje N+1 problem

### Monitoring i metryki

#### Metryki do śledzenia (Future)

- Czas odpowiedzi endpointu (p50, p95, p99)
- Liczba utworzonych talii per użytkownik per dzień
- Rate błędów 4xx i 5xx
- Czas wykonania query DB

#### Alarmy (Future)

- p95 > 500ms
- Error rate > 5%
- DB connection pool exhaustion

### Limity i constraints

#### Rate limiting (Future, nie w MVP)

- 100 talii / godzinę per użytkownik
- 1000 talii / godzinę globalnie

#### Resource limits

- Max title length: 200 znaków (już w walidacji)
- Max description length: Rozważyć limit (np. 1000 znaków)

## 9. Etapy wdrożenia

### Faza 1: Przygotowanie typów i walidacji

#### Krok 1.1: Weryfikacja typów DTO

- [x] Sprawdzić czy `CreateDeckDTO` i `DeckDetailDTO` są już zdefiniowane w `src/types.ts`
- [ ] Dodać lub zaktualizować brakujące typy (`LanguageRefExtendedDTO`, `DeckOwnerDTO`)
- [ ] Upewnić się, że `DeckVisibility` jest zdefiniowany jako union type

**Pliki**:

- `src/types.ts`

#### Krok 1.2: Utworzenie schematu Zod

- [ ] Utworzyć plik `src/lib/validation/deck.validation.ts`
- [ ] Zdefiniować `createDeckSchema` zgodnie ze specyfikacją
- [ ] Dodać custom refinement dla `lang_a !== lang_b`
- [ ] Wyeksportować schemat

**Pliki**:

- `src/lib/validation/deck.validation.ts` (nowy)

```typescript
// Przykład struktury
import { z } from "zod";

export const createDeckSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(1000),
    lang_a: z.string().uuid(),
    lang_b: z.string().uuid(),
    visibility: z.enum(["private", "public", "unlisted"]).optional().default("private"),
  })
  .refine((data) => data.lang_a !== data.lang_b, {
    message: "Source and target languages must be different",
    path: ["lang_b"],
  });
```

### Faza 2: Implementacja Service Layer

#### Krok 2.1: Utworzenie DeckService

- [ ] Utworzyć plik `src/lib/services/deck.service.ts`
- [ ] Zdefiniować klasę lub obiekt `DeckService` z metodą `createDeck`
- [ ] Zaimportować typy DTO i `SupabaseClient`

**Pliki**:

- `src/lib/services/deck.service.ts` (nowy)

#### Krok 2.2: Implementacja walidacji języków

- [ ] W `createDeck` dodać query sprawdzający istnienie języków:
  ```typescript
  const { data: languages, error } = await supabase
    .from("languages")
    .select("id, code, name")
    .in("id", [createDeckDTO.lang_a, createDeckDTO.lang_b])
    .is("deleted_at", null);
  ```
- [ ] Sprawdzić czy zwrócono dokładnie 2 języki
- [ ] Jeśli nie, rzucić custom `ValidationError`

**Zależności**:

- Custom error class `ValidationError` (utworzyć w `src/lib/errors/`)

#### Krok 2.3: Implementacja tworzenia talii

- [ ] Dodać insert query:
  ```typescript
  const { data: deck, error } = await supabase
    .from("decks")
    .insert({
      owner_user_id: userId,
      title: createDeckDTO.title,
      description: createDeckDTO.description,
      lang_a: createDeckDTO.lang_a,
      lang_b: createDeckDTO.lang_b,
      visibility: createDeckDTO.visibility || "private",
    })
    .select()
    .single();
  ```
- [ ] Obsłużyć potencjalne błędy DB

#### Krok 2.4: Implementacja pobierania pełnych danych

- [ ] Dodać query z joinami do languages i profiles:
  ```typescript
  const { data: fullDeck, error } = await supabase
    .from("decks")
    .select(
      `
      *,
      lang_a_data:languages!decks_lang_a_fkey(id, code, name),
      lang_b_data:languages!decks_lang_b_fkey(id, code, name),
      owner:profiles!decks_owner_user_id_fkey(id, username, avatar_url)
    `
    )
    .eq("id", deck.id)
    .is("deleted_at", null)
    .single();
  ```
- [ ] Obsłużyć błędy

#### Krok 2.5: Transformacja do DTO

- [ ] Zmapować wynik DB na `DeckDetailDTO`
- [ ] Dodać `pairs_count: 0` (nowa talia nie ma par)
- [ ] Zwrócić `DeckDetailDTO`

**Kompletna struktura DeckService**:

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type { CreateDeckDTO, DeckDetailDTO } from "@/types";
import { ValidationError } from "@/lib/errors/validation.error";

export const deckService = {
  async createDeck(supabase: SupabaseClient, userId: string, data: CreateDeckDTO): Promise<DeckDetailDTO> {
    // Implementation steps 2.2 - 2.5
  },
};
```

### Faza 3: Implementacja API Endpoint

#### Krok 3.1: Utworzenie pliku endpointu

- [ ] Utworzyć plik `src/pages/api/decks/index.ts`
- [ ] Dodać `export const prerender = false;`
- [ ] Zaimportować potrzebne moduły (Zod, service, typy)

**Pliki**:

- `src/pages/api/decks/index.ts` (nowy)

#### Krok 3.2: Implementacja handlera POST

- [ ] Zdefiniować `export const POST: APIRoute = async (context) => {}`
- [ ] Dodać authentication guard na początku:
  ```typescript
  if (!context.locals.user) {
    return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  ```

#### Krok 3.3: Parsowanie i walidacja request body

- [ ] Owinąć w try-catch
- [ ] Parsować `await context.request.json()`
- [ ] Walidować z Zod: `createDeckSchema.parse(body)`
- [ ] Obsłużyć `ZodError` → zwrócić 422 z details

#### Krok 3.4: Wywołanie service layer

- [ ] Wywołać `deckService.createDeck()` z:
  - `context.locals.supabase`
  - `context.locals.user.id`
  - `validatedData`
- [ ] Obsłużyć `ValidationError` → zwrócić 400 z details
- [ ] Obsłużyć inne błędy → zwrócić 500

#### Krok 3.5: Zwrócenie odpowiedzi sukcesu

- [ ] Zwrócić `new Response(JSON.stringify(deck), { status: 201 })`
- [ ] Dodać header `Content-Type: application/json`
- [ ] Opcjonalnie: dodać header `Location: /api/decks/${deck.id}`

**Kompletna struktura endpointu**:

```typescript
import type { APIRoute } from "astro";
import { z } from "zod";
import { createDeckSchema } from "@/lib/validation/deck.validation";
import { deckService } from "@/lib/services/deck.service";
import { ValidationError } from "@/lib/errors/validation.error";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  // Steps 3.2 - 3.5
};
```

### Faza 4: Obsługa błędów

#### Krok 4.1: Utworzenie custom error classes

- [ ] Utworzyć plik `src/lib/errors/validation.error.ts`
- [ ] Zdefiniować klasę `ValidationError`:
  ```typescript
  export class ValidationError extends Error {
    constructor(
      message: string,
      public details?: Array<{ field?: string; message: string }>
    ) {
      super(message);
      this.name = "ValidationError";
    }
  }
  ```

**Pliki**:

- `src/lib/errors/validation.error.ts` (nowy)
- `src/lib/errors/index.ts` (nowy, re-export wszystkich błędów)

#### Krok 4.2: Implementacja error handling w endpoint

- [ ] Dodać catch dla `ZodError`
- [ ] Dodać catch dla `ValidationError`
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

#### Krok 5.1: Testy manualne

- [ ] Test 1: Utworzenie talii z poprawnymi danymi → 201
- [ ] Test 2: Brak tokenu auth → 401
- [ ] Test 3: Nieprawidłowy token auth → 401
- [ ] Test 4: lang_a === lang_b → 400
- [ ] Test 5: Nieprawidłowy UUID języka → 400
- [ ] Test 6: Nieistniejące UUID języka → 400
- [ ] Test 7: Tytuł za krótki (pusty) → 422
- [ ] Test 8: Tytuł za długi (>200) → 422
- [ ] Test 9: Description brakuje → 422
- [ ] Test 10: Description za krótkie (puste) → 422
- [ ] Test 11: Description za długie (>1000) → 422
- [ ] Test 12: Nieprawidłowa wartość visibility → 422
- [ ] Test 13: Zniekształcony JSON → 422

**Narzędzia**: Postman, cURL, lub Insomnia

#### Krok 5.2: Weryfikacja response structure

- [ ] Sprawdzić czy response 201 zawiera wszystkie pola z `DeckDetailDTO`
- [ ] Sprawdzić czy języki są rozwinięte (nie tylko UUID)
- [ ] Sprawdzić czy owner jest rozwinięty
- [ ] Sprawdzić czy `pairs_count` = 0

#### Krok 5.3: Weryfikacja bezpieczeństwa

- [ ] Sprawdzić czy `owner_user_id` jest zawsze ustawiane na auth user
- [ ] Próba modyfikacji `owner_user_id` w request body → zignorowane
- [ ] Sprawdzić czy token bearer jest wymagany

### Faza 6: Optymalizacja i monitoring (Post-MVP)

#### Krok 6.1: Dodanie indeksów DB

- [ ] Sprawdzić execution plan zapytań
- [ ] Dodać indeksy według sekcji 8 (Performance)
- [ ] Zmierzyć poprawę wydajności

#### Krok 6.2: Implementacja advanced error logging

- [ ] Rozważyć użycie Sentry lub podobnego
- [ ] Dodać correlation IDs do requestów
- [ ] Logować metryki wydajności

#### Krok 6.3: Dodanie rate limiting (Future)

- [ ] Implementacja middleware rate limiting
- [ ] Konfiguracja limitów per user
- [ ] Error response dla rate limit exceeded (429)

### Faza 7: Dokumentacja

#### Krok 7.1: Aktualizacja API documentation

- [ ] Dodać przykłady request/response do dokumentacji API
- [ ] Udokumentować wszystkie error codes
- [ ] Dodać przykłady cURL/code dla developerów

#### Krok 7.2: Code documentation

- [ ] Dodać JSDoc komentarze do service methods
- [ ] Dodać komentarze do complex logic
- [ ] Udokumentować validation rules

#### Krok 7.3: README updates

- [ ] Dodać informację o nowym endpoincie do project README
- [ ] Zaktualizować setup instructions jeśli potrzebne

---

## Checklist przed deploymentem

- [ ] Wszystkie typy są zdefiniowane w `src/types.ts`
- [ ] Zod schema jest zaimplementowany i przetestowany
- [ ] DeckService jest kompletny z error handling
- [ ] API endpoint zwraca poprawne status codes
- [ ] Authentication guard działa poprawnie
- [ ] Wszystkie error scenarios są obsłużone
- [ ] Response structure odpowiada `DeckDetailDTO`
- [ ] Testy manualne przeszły pomyślnie
- [ ] Linter errors są naprawione
- [ ] Code review wykonany
- [ ] Dokumentacja zaktualizowana

---

## Dodatkowe uwagi

### Zależności między komponentami

```
types.ts
   ↓
validation/deck.validation.ts → errors/validation.error.ts
   ↓                                      ↓
services/deck.service.ts ←────────────────┘
   ↓
pages/api/decks/index.ts
```

### Sugerowane nazwy plików

1. `src/types.ts` (już istnieje)
2. `src/lib/validation/deck.validation.ts` (nowy)
3. `src/lib/errors/validation.error.ts` (nowy)
4. `src/lib/errors/index.ts` (nowy)
5. `src/lib/services/deck.service.ts` (nowy)
6. `src/pages/api/decks/index.ts` (nowy)

### Best Practices do zastosowania

1. **Early returns**: Najpierw guard clauses (auth, validation)
2. **Error handling**: Nie łapać błędów, których nie można obsłużyć sensownie
3. **Logging**: Logować wszystkie 500 errors z pełnym stack trace
4. **Type safety**: Używać TypeScript strict mode
5. **Immutability**: Preferować const nad let
6. **Async/await**: Używać zamiast .then() dla czytelności

### Potencjalne rozszerzenia (Future)

1. **Bulk deck creation**: POST /api/decks/bulk z array
2. **Templates**: Tworzenie talii z pre-defined templates
3. **Import**: Import talii z plików (CSV, Anki)
4. **Webhooks**: Powiadomienia o utworzeniu talii
5. **Analytics**: Tracking deck creation metrics
