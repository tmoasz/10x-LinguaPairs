## 1. Lista tabel (kolumny, typy, ograniczenia)

### Tabela: profiles

- **id**: `uuid` PK, = `auth.users.id`
- **username**: `citext` UNIQUE NOT NULL
- **display_name**: `text` NULL
- **timezone**: `text` NULL
- **settings**: `jsonb` NOT NULL DEFAULT `{}`
- **created_at**: `timestamptz` NOT NULL DEFAULT `now()`
- **updated_at**: `timestamptz` NOT NULL DEFAULT `now()`

Uwagi i ograniczenia:

- 1–1 z `auth.users` (FK: `profiles.id` → `auth.users.id`)

---

### Typ: deck_visibility (ENUM)

- Wartości: `private`, `unlisted`, `public`

---

### Tabela: languages (słownik języków)

- **id**: `uuid` PK DEFAULT `gen_random_uuid()`
- **code**: `citext` UNIQUE NOT NULL  
  CHECK: regex `^[a-z]{2}(-[A-Z]{2})?$`
- **name**: `text` NOT NULL
- **name_native**: `text` NULL
- **is_active**: `boolean` NOT NULL DEFAULT `true`
- **sort_order**: `integer` NOT NULL DEFAULT `0`
- **flag_emoji**: `text` NULL
- **created_at**: `timestamptz` NOT NULL DEFAULT `now()`

Uwagi i ograniczenia:

- Publiczne, predefiniowane, zarządzane centralnie
- Wspiera kody podstawowe (np. `pl`, `en`, `de`) oraz warianty regionalne (np. `en-US`)
- Seed data: PL, EN (en-US), DE, IT, ES, CS

---

### Tabela: decks

- **id**: `uuid` PK DEFAULT `gen_random_uuid()`
- **owner_user_id**: `uuid` NOT NULL (FK → `profiles.id`)
- **title**: `text` NOT NULL
- **description**: `text` NOT NULL
- **lang_a**: `uuid` NOT NULL (FK → `languages.id`)
- **lang_b**: `uuid` NOT NULL (FK → `languages.id`)
- CHECK: `lang_a <> lang_b`
- **visibility**: `deck_visibility` NOT NULL DEFAULT `private`
- **created_at**: `timestamptz` NOT NULL DEFAULT `now()`
- **updated_at**: `timestamptz` NOT NULL DEFAULT `now()`
- **deleted_at**: `timestamptz` NULL (soft delete)

Uwagi i ograniczenia:

- Właściciel: `owner_user_id`
- Brak współpracy w MVP (brak `deck_members`)
- Języki przez FK do `languages` (zamiast tekstowych kodów)

---

### Tabela: pairs

- **id**: `uuid` PK DEFAULT `gen_random_uuid()`
- **deck_id**: `uuid` NOT NULL (FK → `decks.id`)
- **term_a**: `text` NOT NULL
- **term_b**: `text` NOT NULL
- **term_a_norm**: `text` GENERATED ALWAYS AS  
  `btrim(regexp_replace(lower(unaccent(term_a)), '\\s+', ' ', 'g'))` STORED
- **term_b_norm**: `text` GENERATED ALWAYS AS  
  `btrim(regexp_replace(lower(unaccent(term_b)), '\\s+', ' ', 'g'))` STORED
- **search_tsv**: `tsvector` GENERATED ALWAYS AS  
  `to_tsvector('simple', coalesce(term_a_norm,'') || ' ' || coalesce(term_b_norm,''))` STORED
- **added_at**: `timestamptz` NOT NULL DEFAULT `now()`
- **updated_at**: `timestamptz` NOT NULL DEFAULT `now()`
- **deleted_at**: `timestamptz` NULL (soft delete)

Uwagi i ograniczenia:

- Unikalność w obrębie talii (ignorując soft delete):  
  UNIQUE `(deck_id, term_a_norm, term_b_norm)` WHERE `deleted_at IS NULL`
- Kolejność domyślna po `added_at DESC`

---

### Tabela: tags (globalne)

- **id**: `uuid` PK DEFAULT `gen_random_uuid()`
- **slug**: `citext` UNIQUE NOT NULL
- **name**: `text` NOT NULL
- **description**: `text` NULL

Uwagi:

- Publiczne, predefiniowane, zarządzane centralnie

---

### Tabela: pair_tags (M–N)

- **pair_id**: `uuid` NOT NULL (FK → `pairs.id`)
- **tag_id**: `uuid` NOT NULL (FK → `tags.id`)
- PK: `(pair_id, tag_id)`

---

### Tabela: user_pair_state (minimalny SRS/progres)

- **user_id**: `uuid` NOT NULL (FK → `profiles.id`)
- **pair_id**: `uuid` NOT NULL (FK → `pairs.id`)
- **deck_id**: `uuid` NOT NULL  
  (FK złożony → `pairs(id, deck_id)`; patrz uwagi poniżej)
- **reps**: `integer` NOT NULL DEFAULT `0` (liczba powtórek)
- **total_correct**: `integer` NOT NULL DEFAULT `0`
- **streak_correct**: `integer` NOT NULL DEFAULT `0`
- **last_grade**: `smallint` NULL  
  CHECK: `last_grade BETWEEN 0 AND 5`
- **last_reviewed_at**: `timestamptz` NULL
- **interval_days**: `integer` NOT NULL DEFAULT `0`  
  CHECK: `interval_days >= 0`
- **due_at**: `timestamptz` NULL
- PK: `(user_id, pair_id, deck_id)`

Uwagi i ograniczenia:

- Dodatkowy UNIQUE w `pairs` na `(id, deck_id)` zapewnia spójność FK złożonego

---

### Tabela: deck_share_links (dla unlisted)

- **deck_id**: `uuid` NOT NULL (FK → `decks.id`)
- **token**: `uuid` UNIQUE NOT NULL DEFAULT `gen_random_uuid()`
- **created_at**: `timestamptz` NOT NULL DEFAULT `now()`
- **expires_at**: `timestamptz` NULL
- **revoked_at**: `timestamptz` NULL
- PK: `(deck_id, token)`

## 2. Relacje między tabelami

- `profiles (1–1) auth.users`: `profiles.id = auth.users.id`
- `profiles (1–N) decks`: `decks.owner_user_id → profiles.id`
- `languages (1–N) decks`: `decks.lang_a → languages.id` oraz `decks.lang_b → languages.id`
- `decks (1–N) pairs`: `pairs.deck_id → decks.id`
- `pairs (M–N) tags` przez `pair_tags(pair_id, tag_id)`
- `profiles (M–N) pairs` przez `user_pair_state(user_id, pair_id)`
- `decks (1–N) deck_share_links`: `deck_share_links.deck_id → decks.id`

## 3. Indeksy (wydajność i egzekwowanie ograniczeń)

### Globalne/rozszerzenia

- Wymagane rozszerzenia: `unaccent`, `pg_trgm`, `pgcrypto`, `citext`

### languages

- Częściowy BTREE: `(is_active, sort_order)` WHERE `is_active = true` – lista aktywnych języków do wyboru

### decks

- BTREE: `(owner_user_id, created_at DESC)`
- Częściowy BTREE: `(id)` WHERE `deleted_at IS NULL` (przydatny do joinów/warunków)

### pairs

- UNIQUE (częściowy): `(deck_id, term_a_norm, term_b_norm)` WHERE `deleted_at IS NULL`
- BTREE: `(deck_id, added_at DESC)`
- GIN (FTS): na `search_tsv`
- GIN (pg_trgm): na `term_a_norm`
- GIN (pg_trgm): na `term_b_norm`
- UNIQUE (techniczne): `(id, deck_id)` – dla FK złożonych w `user_pair_state`

### user_pair_state

- BTREE: `(user_id, due_at)` – planowanie powtórek
- BTREE: `(user_id, deck_id)` – filtrowanie progresu po talii

### tags / pair_tags

- tags: UNIQUE `(slug)` (citext)
- pair_tags: PK `(pair_id, tag_id)` + BTREE `(tag_id)` (odwrócone wyszukiwanie)

### deck_share_links

- UNIQUE: `(token)`
- BTREE: `(deck_id)`

## 4. Zasady PostgreSQL (RLS, polityki, typy, triggery)

### Rozszerzenia i typy

- `CREATE EXTENSION IF NOT EXISTS unaccent;`
- `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
- `CREATE EXTENSION IF NOT EXISTS pgcrypto;` (dla `gen_random_uuid()`)
- `CREATE EXTENSION IF NOT EXISTS citext;`
- `CREATE TYPE deck_visibility AS ENUM ('private','unlisted','public');`

### RLS – profiles

- `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`
- Polityki:
  - Owner SELECT/UPDATE/DELETE: `USING (id = auth.uid()) WITH CHECK (id = auth.uid())`
  - INSERT: tylko przez backend (rola serwisowa) po rejestracji użytkownika

### RLS – decks

- `ALTER TABLE decks ENABLE ROW LEVEL SECURITY;`
- Polityki:
  - Owner pełny CRUD: `USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid())`
  - Publiczny SELECT: `USING (visibility = 'public' AND deleted_at IS NULL)`
  - Unlisted: brak bezpośredniego SELECT; dostęp wyłącznie przez RPC/VIEW z tokenem

### RLS – pairs

- `ALTER TABLE pairs ENABLE ROW LEVEL SECURITY;`
- Polityki:
  - Owner CRUD: `USING (EXISTS (SELECT 1 FROM decks d WHERE d.id = deck_id AND d.owner_user_id = auth.uid()))`
    z `WITH CHECK` analogicznie
  - Publiczny SELECT: `USING (EXISTS (SELECT 1 FROM decks d WHERE d.id = deck_id AND d.visibility = 'public' AND d.deleted_at IS NULL))`
  - Unlisted: brak bezpośredniego SELECT; dostęp via RPC z tokenem talii

### RLS – languages (globalnie dostępne)

- `ALTER TABLE languages ENABLE ROW LEVEL SECURITY;`
- Polityki:
  - `SELECT` dla wszystkich (anon/authenticated); tylko aktywne języki (`is_active = true`)
  - Mutacje tylko rolą serwisową (brak INSERT/UPDATE/DELETE dla użytkowników)

### RLS – tags / pair_tags (globalnie dostępne)

- `ALTER TABLE tags ENABLE ROW LEVEL SECURITY;`
- `ALTER TABLE pair_tags ENABLE ROW LEVEL SECURITY;`
- Polityki:
  - `tags`: `SELECT` dla wszystkich; mutacje tylko rolą serwisową
  - `pair_tags`: `SELECT` dla wszystkich; mutacje tylko rolą serwisową

### RLS – user_pair_state

- `ALTER TABLE user_pair_state ENABLE ROW LEVEL SECURITY;`
- Polityki:
  - Owner pełny dostęp: `USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`
  - Aktualizacje rekomendowane przez RPC `apply_review(...)`

### RLS – deck_share_links

- `ALTER TABLE deck_share_links ENABLE ROW LEVEL SECURITY;`
- Polityki:
  - Owner CRUD: `USING (EXISTS (SELECT 1 FROM decks d WHERE d.id = deck_id AND d.owner_user_id = auth.uid()))`
  - Publiczny SELECT: brak; udostępnianie tylko przez RPC `get_deck_by_token(token)` (SECURITY DEFINER), zwracające deck+pairs przy ważnym, nierozwiązanym tokenie oraz `visibility='unlisted'`

### Ograniczenia i walidacje (przykłady)

- `languages.code`: CHECK regex `^[a-z]{2}(-[A-Z]{2})?$`; UNIQUE `(code)`
- `decks.lang_a` / `decks.lang_b`: FK do `languages.id`; CHECK `lang_a <> lang_b`
- `user_pair_state.last_grade`: CHECK `0..5`; `interval_days >= 0`

### Triggery techniczne

- Funkcja `set_updated_at()` + TRIGGER `BEFORE UPDATE` dla: `profiles`, `decks`, `pairs`
- TRIGGER blokujący zmianę `decks.lang_a/lang_b` jeśli istnieją w tej talii wiersze w `pairs`

## 5. Dodatkowe uwagi projektowe

- Duplicate control: brak duplikatów par w obrębie talii dzięki unikalności na `(deck_id, term_a_norm, term_b_norm)` z pominięciem soft-delete.
- Wyszukiwanie: połączenie FTS (`search_tsv` z konfiguracją `simple`) i podobieństwa (`pg_trgm` na znormalizowanych polach) pokrywa większość przypadków (języki mieszane). Możliwa późniejsza optymalizacja per język.
- Soft delete: `deleted_at` w `decks` i `pairs`; większość indeksów i zapytań powinna filtrować `deleted_at IS NULL`.
- Unlisted access: generowane UUID w `deck_share_links`; publiczny odczyt wyłącznie przez RPC z tokenem; możliwość wygaśnięcia (`expires_at`) i odwołania (`revoked_at`).
- Skalowalność: brak partycjonowania w MVP; monitorować rozmiar `user_pair_state`; indeks `(user_id, due_at)` optymalizuje kolejkę powtórek.
- Języki: tabela `languages` jako słownik centralnie zarządzany; wspiera kody podstawowe (ISO 639-1) oraz warianty regionalne (np. `en-US`); w MVP tylko podstawowe języki, bez wariantów regionalnych (z wyjątkiem `en-US` przygotowanego na przyszłość).
- Potencjalne przyszłe rozszerzenia (poza MVP):  
  `forked_from_deck_id`/`forked_from_pair_id`, historia `reviews`, per‑język FTS, bardziej szczegółowy `profiles.settings` (walidacja po stronie aplikacji/Zod), dodatkowe warianty regionalne (`en-GB`, `es-MX`, itp.).
