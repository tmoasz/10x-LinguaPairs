<conversation_summary>
<decisions>

1. Utworzyć `profiles` (1–1 z `auth.users`) z preferencjami i RLS tylko dla właściciela.
2. Nie tworzyć tabeli języków w DB; walidować format kodu języka regexem (ISO 639‑1 opcj. region).
3. `decks` z `visibility ∈ {private, unlisted, public}`, bez współpracy w MVP.
4. `pairs` są powiązane 1–N z `decks`; języki (`lang_a`, `lang_b`) definiuje deck; `lang_a <> lang_b`.
5. Tagi globalne, publiczne, predefiniowane (tematy); zarządzane centralnie.
6. Brak ręcznego sortowania; kolejność po `added_at` (najnowsze pierwsze).
7. Śledzić minimalny stan SRS/progresu w `user_pair_state`; bez logów `reviews` w MVP.
8. Decki `public` udostępniają wszystkie swoje pary do odczytu; brak sterowania widocznością na poziomie par.
9. `unlisted` dostępne bez logowania poprzez link z tokenem.
10. Soft delete dla `decks` i `pairs`; indeksy częściowe ignorujące soft‑deleted; włączyć `unaccent`, `pg_trgm`, `pgcrypto`.
    </decisions>

<matched_recommendations>

1. Normalizacja terminów (`*_norm` z `lower+unaccent+compact spaces`) i unikalność w obrębie decka.
2. Walidacja kodów języków regexem `^[a-z]{2}(-[A-Z]{2})?$`; brak tabeli `languages`.
3. `decks(visibility)` + RLS: publiczny odczyt dla `public`, token dla `unlisted`, pełne uprawnienia właściciela.
4. Rezygnacja z `deck_members`; brak współpracy w MVP.
5. Globalne `tags(slug UNIQUE)` + `pair_tags`; RLS: `SELECT` dla wszystkich, mutacje rolą serwisową.
6. Brak duplikatów par w talii: unikalność na `(deck_id, term_a_norm, term_b_norm)` z warunkiem `deleted_at IS NULL`.
7. `user_pair_state` z polami minimalnymi (reps, total_correct, streak, last_grade, last_reviewed_at, interval_days, due_at); RLS po `auth.uid()`.
8. RPC `apply_review(...)` do aktualizacji stanu; bez tabeli `reviews` w MVP.
9. Wyszukiwanie: `tsvector` na znormalizowanych polach + GIN, oraz GIN `pg_trgm` na `term_a_norm`, `term_b_norm`.
10. Soft delete + triggery `updated_at`; indeksy: `(deck_id, added_at DESC)`, `(user_id, due_at)`.
    </matched_recommendations>

<database_planning_summary>
a) Główne wymagania:

- Prosty model: użytkownik → deck (z językami i widocznością) → pary terminów; tagi globalne; minimalny progres; public/unlisted dostępne bez logowania.
- Brak logów zdarzeń w MVP; nacisk na wydajne wyszukiwanie i prosty SRS.

b) Kluczowe encje i relacje:

- profiles(id=auth.users.id PK, username, display_name, timezone, settings, created_at, updated_at)
- decks(id PK, owner_user_id FK, title, description, lang_a, lang_b, visibility, created_at, updated_at, deleted_at; CHECK lang_a <> lang_b; regex na języki)
- pairs(id PK, deck_id FK, term_a, term_b, term_a_norm GENERATED, term_b_norm GENERATED, search_tsv GENERATED, added_at, updated_at, deleted_at; UNIQUE(deck_id, term_a_norm, term_b_norm) WHERE deleted_at IS NULL)
- tags(id PK, slug citext UNIQUE, name, description)
- pair_tags(pair_id FK, tag_id FK, PRIMARY KEY(pair_id, tag_id))
- user_pair_state(user_id FK, pair_id FK, deck_id FK NULL, PRIMARY KEY(user_id, pair_id, deck_id), reps, total_correct, streak_correct, last_grade, last_reviewed_at, interval_days, due_at)
- deck_share_links(deck_id FK, token uuid UNIQUE, created_at, expires_at NULL, revoked_at NULL)

Relacje:

- user 1–N decks; deck 1–N pairs; pair M–N tags; user M–N pairs przez `user_pair_state`.
- `user_pair_state.deck_id` opcjonalne (umożliwia rozróżnienie stanu per deck, jeśli potrzebne).

c) Bezpieczeństwo i skalowalność:

- RLS:
  - profiles: właściciel `SELECT/UPDATE`.
  - decks: właściciel pełny dostęp; `SELECT` dla wszystkich gdy `visibility='public' AND deleted_at IS NULL`; `unlisted` tylko przez RPC z tokenem.
  - pairs: dziedziczy widoczność przez `deck_id`; CRUD tylko właściciel decka.
  - tags/pair_tags: `SELECT` dla wszystkich; mutacje wyłącznie rolą serwisową.
  - user_pair_state: pełny dostęp tylko `auth.uid() = user_id`; aktualizacje przez RPC `apply_review`.
  - deck_share_links: właściciel CRUD; publiczny odczyt jedynie przez RPC `get_deck_by_token`.
- Indeksy:
  - pairs: GIN(search_tsv), GIN trgm(term_a_norm), GIN trgm(term_b_norm), BTREE(deck_id, added_at DESC).
  - user_pair_state: BTREE(user_id, due_at), BTREE(user_id, deck_id).
  - decks: BTREE(owner_user_id, created_at DESC), częściowe na `deleted_at IS NULL`.
- Rozszerzenia: `unaccent`, `pg_trgm`, `pgcrypto`.
- Skalowalność: bez partycjonowania w MVP; monitorować rozrost `user_pair_state`. Autovacuum i stats; później ewentualne parti­cjonowanie wg czasu lub `user_id`.

d) Nierozstrzygnięte/wyjaśnienia:

- Kopiowanie (fork) decków: czy śledzić pochodzenie (`forked_from_deck_id`, `forked_from_pair_id`)?
- Edycja języków w istniejącym decku: czy blokować, jeśli ma pary?
- Anonimowy progres: czy zapisywać tymczasowo (np. lokalnie) czy całkiem pominąć?
- Konfiguracja `tsvector`: użyć `simple` czy dopasować do języków (`english`, `polish`) — możliwe mieszane treści w jednej talii.
- Zakres pól `profiles.settings` (konkretne klucze SRS, UI).
  </database_planning_summary>

<unresolved_issues>

1. Strategy for deck/pars fork lineage fields (`forked_from_*`) i ich wykorzystanie.
2. Blokada zmiany `lang_a/lang_b` po utworzeniu decka z parami (integralność).
3. Obsługa progresu dla anonimów (ignorować czy trzymać ephemeralnie poza DB).
4. Dobór konfiguracji FTS (`simple` vs językowe) dla mieszanych danych w parach.
5. Szczegóły schematu `profiles.settings` i walidacji po stronie DB (JSON Schema/Zod).
   </unresolved_issues>
   </conversation_summary>
