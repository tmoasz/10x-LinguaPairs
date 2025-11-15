# API Endpoint Implementation Plan: Deck Detail, Pairs Review & Flagging

## 1. Przegląd widoku i celu

**Cel biznesowy**: Umożliwić użytkownikowi przejrzenie wygenerowanej talii (decku), przejrzenie wszystkich par w talii oraz oznaczanie problematycznych par (flagowanie), a właścicielowi talii – drobną edycję opisu/tytułu.

**Widok docelowy (Deck Detail / Review View)**:

- Sekcja nagłówka talii:
  - tytuł talii,
  - opis (krótki tekst użyty do generacji / kontekstu nauki),
  - języki (lang_a, lang_b),
  - liczba par,
  - informacja o właścicielu (username).
- Lista par:
  - każda para pokazuje `term_a` i `term_b`,
  - opcjonalne metadane (np. timestamp dodania, ewentualnie stan flagged).
- Akcje na poziomie pary:
  - przycisk „Zgłoś błąd” → flagowanie pary.
- Akcje na poziomie talii (dla właściciela):
  - edycja opisu (opcjonalnie tytułu),
  - zapis zmian (PATCH).

Widok ma służyć jako „hub” do:

- szybkiego sprawdzenia jakości wygenerowanych par,
- oznaczania błędów przed nauką/challenge,
- lekkiej edycji meta-danych (opis) bez ingerencji w generację.

## 2. Zakres i powiązane endpointy

W ramach tego planu obejmujemy 5 endpointów API:

1. `GET /api/decks/:deckId`
   - zwraca metadane talii (bez listy par),
   - DTO: `DeckDetailDTO`.

2. `PATCH /api/decks/:deckId`
   - pozwala właścicielowi zaktualizować tytuł, opis i ewentualnie widoczność,
   - DTO request: `UpdateDeckDTO`,
   - DTO response: zaktualizowany `DeckDetailDTO`.

3. `GET /api/decks/:deckId/pairs`
   - zwraca listę par w talii (paginowana),
   - DTO response: `PairsListDTO` (z `PairDTO[]`).

4. `POST /api/decks/:deckId/pairs/:pairId/flag`
   - pozwala użytkownikom zgłaszać błędne pary,
   - DTO request: `FlagPairDTO`,
   - DTO response: `PairFlagResponseDTO`.

5. `DELETE /api/decks/:deckId/pairs/:pairId`
   - usuwa parę z talii (tylko właściciel talii),
   - body: brak, odpowiedź: status `204 No Content`.

Wszystkie wymienione DTO są już zdefiniowane w `src/types.ts`:

- `DeckDetailDTO`, `UpdateDeckDTO`, `PairsListDTO`, `PairDTO`,
- `FlagPairDTO`, `PairFlagResponseDTO`.

## 3. Fazy implementacji (podejście „thin slice”)

Warto wdrożyć to w 2 krokach:

### Faza 1: Stubbed API + UI _(zrealizowane — historyczna notatka)_

- Pierwotnie wdrożone jako etap szybkiego prototypu: mockowe endpointy i widok korzystający z nich.
- Obecnie w repozytorium mamy w pełni działające API oparte na Supabase (Faza 2). Poniższy opis zostawiamy jako archiwum podejścia „thin slice”.

### Faza 2: Podpięcie pod Supabase _(status: ukończone)_

- Endpointy działają już na realnych danych Supabase (serwisy `deckService`, `pairService` itd.).
- Walidacje Zod i logika autoryzacji opisane niżej są wdrożone; kolejne zmiany wchodzą na żywych danych, bez potrzeby wracania do mocków.

## 4. Szczegóły zachowania per endpoint

### 4.1. GET /api/decks/:deckId – szczegóły decku

**Cel**: dostarczyć UI wszystkie potrzebne informacje o talii, bez listy par (ta jest ładowana osobnym endpointem).

**Metoda**: `GET`  
**URL**: `/api/decks/:deckId`  
**Autoryzacja**:

- wymagany jest kontekst użytkownika z middleware (`context.locals.user`), ale sama talia może być:
  - publiczna → dostępna dla wszystkich zalogowanych (a docelowo również gości, jeśli UI na to pozwoli),
  - unlisted → dostęp po dokładnym linku (zależnie od globalnej polityki),
  - private → tylko właściciel.

**Zachowanie**:

- Sprawdzenie, czy talia istnieje i nie jest miękko usunięta.
- Sprawdzenie widoczności:
  - jeśli `private`, tylko właściciel (`owner_user_id === context.locals.user.id`) dostaje 200,
  - jeśli `public` lub `unlisted`, użytkownik zalogowany (a później także gość) może otrzymać dane.
- Zwrócenie `DeckDetailDTO`:
  - zawiera informacje o właścicielu (`owner`),
  - zawiera informacje o językach (`lang_a`, `lang_b`),
  - zawiera `pairs_count`, co pozwala UI ocenić, czy lista par jest kompletna.

**Typowe odpowiedzi**:

- `200 OK` – poprawnie zwrócony `DeckDetailDTO`.
- `401 UNAUTHORIZED` – gdy użytkownik nie jest zalogowany, a polityka wymaga logowania.
- `403 FORBIDDEN` – gdy talia jest prywatna i użytkownik nie jest właścicielem.
- `404 NOT_FOUND` – gdy talia nie istnieje lub użytkownik nie ma do niej dostępu (bez ujawniania, że istnieje).

### 4.2. PATCH /api/decks/:deckId – edycja meta-danych decku

**Cel**: pozwolić właścicielowi talii na drobne zmiany meta-danych (opis, tytuł, widoczność) bez ponownej generacji.

**Metoda**: `PATCH`  
**URL**: `/api/decks/:deckId`  
**Autoryzacja**:

- wymagany zalogowany użytkownik,
- operacja dozwolona tylko, jeśli `owner_user_id === context.locals.user.id`.

**Request (Command Model)**:

- używa istniejącego `UpdateDeckDTO`:
  - `title?: string`,
  - `description?: string`,
  - `visibility?: DeckVisibility`.
- Zasada: body może zawierać 1 lub więcej pól, wszystkie są opcjonalne.

**Zachowanie**:

- Walidacja wejścia:
  - długość `title` i `description` (np. ten sam zakres, co przy tworzeniu),
  - poprawność wartości enum `visibility`.
- Sprawdzenie własności talii:
  - jeśli użytkownik nie jest właścicielem → `403 FORBIDDEN`.
- Aktualizacja w bazie:
  - częściowa aktualizacja tylko pól obecnych w request body,
  - aktualizacja `updated_at`.
- Zwrócenie zaktualizowanego `DeckDetailDTO`:
  - UI może nadpisać lokalny stan talii bez dodatkowego fetcha.

**Typowe odpowiedzi**:

- `200 OK` – zaktualizowany `DeckDetailDTO`.
- `400 VALIDATION_ERROR` – niepoprawne wartości pól (np. za długi opis).
- `401 UNAUTHORIZED` – użytkownik niezalogowany.
- `403 FORBIDDEN` – użytkownik nie jest właścicielem.
- `404 NOT_FOUND` – talia nie istnieje lub nie jest dostępna.

### 4.3. GET /api/decks/:deckId/pairs – lista par w talii

**Cel**: dostarczyć UI listę par przypisanych do danej talii, z możliwością paginacji.

**Metoda**: `GET`  
**URL**: `/api/decks/:deckId/pairs`  
**Autoryzacja**:

- powinna być spójna z widocznością talii:
  - jeśli deck jest `private`, tylko właściciel widzi pary,
  - jeśli `public` lub `unlisted`, inni zalogowani użytkownicy (a potencjalnie także goście) mogą pobierać listę.

**Parametry zapytania (opcjonalne)**:

- `page` (number, domyślnie 1),
- `page_size` (number, domyślnie 50, maks. np. 100).

**Zachowanie**:

- Weryfikacja istnienia talii i praw dostępu (analogicznie do `GET /api/decks/:deckId`).
- Pobranie par z tabeli `pairs` po `deck_id`:
  - sortowanie np. po `added_at` rosnąco,
  - filtrowanie `deleted_at IS NULL` (jeśli używany soft delete).
- Zwrócenie `PairsListDTO`:
  - `pairs: PairDTO[]`,
  - `pagination: PaginationDTO` (informacja o stronie, łącznej liczbie elementów).

**MVP a stan flagged**:

- Na etapie MVP:
  - endpoint **nie musi** zwracać informacji o tym, czy para jest flagged,
  - UI może oznaczać parę jako „zgłoszoną” tylko w bieżącej sesji na podstawie odpowiedzi z POST flag.
- W dalszej fazie można rozszerzyć `PairDTO` o pola:
  - `flagged_count: number`,
  - `flagged_by_current_user: boolean`.

**Typowe odpowiedzi**:

- `200 OK` – lista par (`PairsListDTO`).
- `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND` – analogicznie jak w GET deck detail.

### 4.4. POST /api/decks/:deckId/pairs/:pairId/flag – zgłaszanie błędnej pary

**Cel**: pozwolić użytkownikom raportować błędne lub nieadekwatne pary, co zasili system jakości i ewentualne filtrowanie przy „+10”.

**Metoda**: `POST`  
**URL**: `/api/decks/:deckId/pairs/:pairId/flag`  
**Autoryzacja**:

- dla MVP rekomendowane: **tylko zalogowani użytkownicy** mogą flagować (łatwiejsze śledzenie nadużyć),
- w przyszłości można rozważyć guest flagging z dodatkowymi ograniczeniami.

**Request (Command Model)**:

- `FlagPairDTO`:
  - `reason: string` – krótki opis powodu (np. błędne tłumaczenie, literówka, treść ofensywna).

**Zachowanie**:

- Walidacja wejścia:
  - `reason` – minimalna długość, ewentualny enum wartości,
  - `details` – maksymalna długość.
- Sprawdzenie, czy:
  - talia istnieje i użytkownik ma do niej dostęp,
  - para o `pairId` należy do danej talii.
- Zapis flagi w tabeli (np. `pair_flags`):
  - powiązanie z `pair_id` i `flagged_by` (current user),
  - timestamp `flagged_at`.
- Polityka idempotencji na MVP:
  - najprościej: pozwolić na wielokrotne flagowanie tej samej pary przez tego samego użytkownika, każdorazowo zapisując nową flagę,
  - alternatywnie (Phase 2): wymusić unikalność kombinacji `(pair_id, flagged_by)` i zwracać np. `409 CONFLICT`.
- Zwrócenie `PairFlagResponseDTO`:
  - UI może na tej podstawie oznaczyć parę jako „zgłoszoną” w bieżącej sesji.

**Typowe odpowiedzi**:

- `201 CREATED` – flaga zapisana, zwrócony `PairFlagResponseDTO`.
- `400 VALIDATION_ERROR` – niepoprawne dane request body.
- `401 UNAUTHORIZED` – użytkownik niezalogowany.
- `403 FORBIDDEN` – użytkownik nie ma prawa dostępu do talii.
- `404 NOT_FOUND` – talia lub para nie istnieje / nie należy do tej talii.

### 4.5. DELETE /api/decks/:deckId/pairs/:pairId – usunięcie pary z talii

**Cel**: umożliwić właścicielowi talii szybkie usuwanie par, które są niepotrzebne (np. użytkownik zna je już na wylot) lub nie spełniają wymagań.

**Metoda**: `DELETE`  
**URL**: `/api/decks/:deckId/pairs/:pairId`  
**Autoryzacja**:

- tylko właściciel talii (analogicznie jak PATCH na talii),
- endpoint nie jest dostępny dla gości ani innych użytkowników.

**Zachowanie**:

- Walidacja, że talia istnieje oraz `pairId` należy do wskazanego `deckId`.
- Soft delete: ustawienie `deleted_at` w tabeli `pairs` (rekord pozostaje dla historii/flag).
- Frontend powinien usuwać parę z lokalnego stanu po udanym 204, zmniejszając `pairs_count` i `pagination.total`.

**Typowe odpowiedzi**:

- `204 NO_CONTENT` – para usunięta.
- `401 UNAUTHORIZED` – użytkownik niezalogowany.
- `403 FORBIDDEN` – użytkownik nie jest właścicielem talii.
- `404 NOT_FOUND` – talia lub para nie istnieje / para nie należy do talii.

## 5. Zasady widoczności i autoryzacji (Deck Visibility)

Widoczność talii (`DeckVisibility`) wpływa na wszystkie 4 endpointy i powinna być spójna w całej aplikacji.

Proponowane reguły:

- `private`:
  - `GET /api/decks/:deckId` – tylko właściciel,
  - `GET /api/decks/:deckId/pairs` – tylko właściciel,
  - `PATCH /api/decks/:deckId` – tylko właściciel,
  - `POST /api/decks/:deckId/pairs/:pairId/flag` – tylko właściciel (MVP) **lub** wszyscy zalogowani mający dostęp, jeśli prywatne talie mogą być współdzielone w przyszłości.

- `public`:
  - `GET /api/decks/:deckId` – dostępne dla wszystkich zalogowanych (MVP) i ewentualnie gości (jeśli middleware na to pozwala),
  - `GET /api/decks/:deckId/pairs` – analogicznie,
  - `PATCH /api/decks/:deckId` – tylko właściciel,
  - `POST /api/decks/:deckId/pairs/:pairId/flag` – każdy zalogowany użytkownik.

- `unlisted`:
  - dostęp jak `public`, ale UI nie pokazuje talii w publicznych listingach; dostęp wymaga bezpośredniego linku,
  - endpointy zachowują się jak dla `public`, z tą różnicą, że deck nie pojawia się np. w `GET /api/decks` listujących talie.

**Zasada UX**:

- przy błędach autoryzacji/nieistnienia zawsze preferujemy:
  - `404 NOT_FOUND` zamiast `403 FORBIDDEN` dla talie, których istnienie nie chcemy ujawniać użytkownikowi.

## 6. Integracja z widokiem frontendu (Deck Detail / Review)

Docelowy flow na frontendzie (React/Astro):

1. Użytkownik wchodzi na `/decks/:deckId` (route widoku talii).
2. Frontend równolegle odpala:
   - `GET /api/decks/:deckId` → pobranie meta-danych talii,
   - `GET /api/decks/:deckId/pairs` → pobranie listy par.
3. Po sukcesie:
   - nagłówek widoku renderuje tytuł, opis, języki, ownera i liczbę par,
   - lista renderuje `term_a` / `term_b` w tabeli lub kartach,
   - każdy wiersz ma przycisk „Zgłoś błąd”, a właściciel dodatkowo widzi przycisk „Usuń”.
4. Po kliknięciu „Zgłoś błąd”:
   - frontend otwiera prosty modal/formularz z jednym polem tekstowym na powód (`reason`),
   - wysyła `POST /api/decks/:deckId/pairs/:pairId/flag`,
   - po 201:
     - pokazuje prosty komunikat/toast „Zgłoszono błąd” i lokalnie dezaktywuje przycisk dla tej pary (tekst „Zgłoszono”), bez dodatkowych liczników czy cięższych elementów UI.
5. Właściciel talii:
   - może kliknąć przycisk „Edytuj opis”/„Edytuj meta” w nagłówku,
   - UI pokazuje edytowalne pole dla `title`/`description`,
   - zapis wywołuje `PATCH /api/decks/:deckId` z odpowiednimi polami,
   - po 200:
     - UI podmienia lokalny stan talii z response,
     - wyświetla potwierdzenie.
6. Usuwanie par (tylko właściciel):
   - kliknięcie „Usuń” przy parze otwiera prosty modal potwierdzający,
   - po akceptacji wysyłany jest `DELETE /api/decks/:deckId/pairs/:pairId`,
   - po 204 UI usuwa parę lokalnie i aktualizuje licznik / paginację.

**MVP vs później**:

- MVP skupia się na:
  - poprawnym przepływie danych,
  - prostych walidacjach,
  - sensownych komunikatach błędów.
- W późniejszych iteracjach można dodać:
  - rozszerzone statystyki (liczba flag na parę),
  - filtrowanie listy par po stanie (np. tylko flagged),
  - integrację flag z procesem generacji lub QA.

## 7. Względy jakościowe i przyszłe rozszerzenia

- **Spójność DTO**: endpointy muszą konsekwentnie używać typów z `src/types.ts`, tak aby frontend miał stabilny kontrakt.
- **Idempotencja**:
  - `PATCH /api/decks/:deckId` – wielokrotne wysłanie tego samego body powinno dawać ten sam stan talii,
  - `POST /flag` – na MVP może nie być w pełni idempotentny, ale warto przewidzieć późniejsze ograniczenie (unikalność `(pair_id, flagged_by)`).
- **Obciążenie**:
  - `GET /pairs` może potencjalnie zwracać dziesiątki/ setki par – paginacja i limit strony są ważne, ale w MVP można zacząć od stałego limitu 50.
- **Bezpieczeństwo**:
  - weryfikacja właściciela przy PATCH,
  - brak ujawniania istnienia prywatnych talii,
  - sanity check dla bardzo długich `reason`/`details`.

Ten plan opisuje **co** i **dlaczego** ma robić każdy endpoint oraz jak wspólnie wspierają widok przeglądu talii z flagowaniem. Szczegóły implementacyjne (konkretne zapytania Supabase, kod handlerów) mogą być doprecyzowane w trakcie pracy nad Faza 2, korzystając z istniejących wzorców z `create-deck-implementation-plan.md` i `deck.service.ts`.
