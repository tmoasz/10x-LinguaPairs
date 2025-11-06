# Architektura UI dla 10x-LinguaPairs

## 1. Przegląd struktury UI

Aplikacja PWA do nauki słownictwa PL↔EN (oraz innych języków) oparta na generowaniu zestawów par (słow, fraz) i trybach nauki matching oraz challenge. UI jest zorganizowany wokół talii (decks) i par (pairs), z prostą nawigacją i ochroną tras. MVP koncentruje się na: generowaniu, przeglądzie/edycji par, nauce, challenge, podglądzie progresu. Publiczny dostęp obejmuje landing oraz logowanie/rejestrację. Całość korzysta z responsywnego designu opartego o Tailwind, gotowych komponentów Shadcn/ui.

- **Zakres MVP**: bez tagów w UI, bez współdzielenia (shared), bez edycji metadanych talii; Challenge uproszczony do jednej rundy; jeden kreator generowania.
- **Trasy (MVP)**: `/`, `/auth/login`, `/auth/signup`, `/decks`, `/decks/:id`, `/decks/:id/progress`, `/learn/:deckId`, `/challenge/:deckId`, `/generate`.
- **Ochrona tras**: middleware wymusza logowanie dla `/decks*`, `/learn/*`, `/challenge/*`, `/generate`; UI ukrywa CTA dla anonimowych.
- **Zarządzanie stanem**: React.
- **Integracja API (kluczowe)**: `/api/decks*`, `/api/decks/:deckId/pairs*`, `/api/generate/*`, `/api/decks/:deckId/progress`, `/api/progress/*`, `/api/users/me/quota`, `/api/auth/*`, `/api/curated-decks*`.
- **UX/A11y**: mobile‑first; stałe 2 kolumny w nauce i challenge; focus rings; sterowanie klawiaturą; cele dotykowe ≥44×44 px; preferencje `prefers-reduced-motion` respektowane; błędy inline + toasty (Sonner).
- **Bezpieczeństwo**: autoryzacja Supabase (JWT) w middleware; w UI maskowanie akcji dla anonimowych; obsługa 401/403/409/413/422/429/500/503.
- **Stany globalne i błędy**: skeletony ładowania, stany pustki, retry, toasty; tryb offline (cache ostatnich 10 zestawów) – UI sygnalizuje offline i ograniczenia.

## 2. Lista widoków

1.

- **Nazwa widoku**: Landing (kuratorowane)
- **Ścieżka widoku**: `/`
- **Główny cel**: Zaprezentować kuratorowane talie dla gości, zachęcić do logowania/rejestracji.
- **Kluczowe informacje do wyświetlenia**: Lista kuratorowanych talii (tytuł, opis, języki, liczba par), CTA do logowania.
- **Kluczowe komponenty widoku**: `CuratedDeckList`, `DeckCardPublic`, `AuthCTA`, `Header`, `Footer`.
- **Integracja API**: `GET /api/curated-decks` (lista), opcjonalnie link do szczegółu kuratorowanej talii.
- **UX/A11y/Bezpieczeństwo**: Publiczny; karty dostępne klawiaturą; wysokie kontrasty; toasty błędów sieci; komunikat offline.
- **Powiązane historyjki**: US‑015 (dostęp gościa), US‑013 (offline – podgląd cached setów).

2.

- **Nazwa widoku**: Logowanie
- **Ścieżka widoku**: `/auth/login`
- **Główny cel**: Uwierzytelnić użytkownika.
- **Kluczowe informacje do wyświetlenia**: Formularz e‑mail/hasło, link do rejestracji.
- **Kluczowe komponenty widoku**: `AuthForm`, `PasswordField`, `FormErrorInline`, `Toaster`.
- **Integracja API**: `POST /api/auth/login` (sukces → nawigacja do `/decks`).
- **UX/A11y/Bezpieczeństwo**: Walidacja pól (inline), obsługa Enter, komunikaty 401; maskowanie hasła; blokady brute force po stronie backendu.
- **Powiązane historyjki**: US‑014.

3.

- **Nazwa widoku**: Rejestracja
- **Ścieżka widoku**: `/auth/signup`
- **Główny cel**: Utworzyć konto użytkownika.
- **Kluczowe informacje do wyświetlenia**: Formularz rejestracji z walidacją hasła, link do logowania.
- **Kluczowe komponenty widoku**: `SignupForm`, `PasswordRules`, `FormErrorInline`, `Toaster`.
- **Integracja API**: `POST /api/auth/signup` (sukces → nawigacja do `/decks`).
- **UX/A11y/Bezpieczeństwo**: Walidacja siły hasła, focus mgmt, komunikaty 409 (istniejący email/username).
- **Powiązane historyjki**: US‑014.

4.

- **Nazwa widoku**: Moje talie
- **Ścieżka widoku**: `/decks`
- **Główny cel**: Przegląd i wybór talii użytkownika; utworzenie nowej.
- **Kluczowe informacje do wyświetlenia**: Lista talii (tytuł, opis, języki, liczba par, widoczność, daty), paginacja, sort.
- **Kluczowe komponenty widoku**: `DeckList`, `DeckCard`, `Pagination`, `SortSelect`, `CreateDeckButton` (otwiera `CreateDeckDialog`).
- **Integracja API**: `GET /api/decks` (lista), `POST /api/decks` (utworzenie).
- **UX/A11y/Bezpieczeństwo**: Ochrona trasy; CTA „Generate” oraz szybsza ścieżka do `/generate`; skeletony listy; obsługa 401/403/400.
- **Powiązane historyjki**: wspierające przepływy (brak dedykowanej US).

5.

- **Nazwa widoku**: Szczegóły talii
- **Ścieżka widoku**: `/decks/:id`
- **Główny cel**: Zarządzać parami; akcje „Learn”, „Progress”, „Challenge”; „+10”.
- **Kluczowe informacje do wyświetlenia**: Nagłówek talii (tytuł, języki), lista par (terminy L1/L2, daty), licznik par.
- **Kluczowe komponenty widoku**: `DeckHeader`, `PairList`, `PairRow`, `ActionBar` (Learn/Progress/Challenge/+10/Add), `PairFormModal`, `ConfirmDeleteDialog`.
- **Integracja API**: `GET /api/decks/:id`, `GET /api/decks/:deckId/pairs` (z paginacją), `POST /api/decks/:deckId/pairs`, `PATCH /api/decks/:deckId/pairs/:id`, `DELETE /api/decks/:deckId/pairs/:id`, `POST /api/decks/:deckId/pairs/:id/flag`, `POST /api/generate/extend` ("+10"), `GET /api/users/me/quota` (informacyjnie).
- **UX/A11y/Bezpieczeństwo**: Ochrona trasy; optymistyczne CRUD z rollbackiem; komunikaty 409 (duplikat i brak unikalnych par przy „+10”), 422/400 walidacje, 403 brak uprawnień; klawiatura i focus dla modali.
- **Powiązane historyjki**: US‑006 (ręczne dodanie), US‑007 (flag), US‑005 („+10”).

6.

- **Nazwa widoku**: Progres Leitner
- **Ścieżka widoku**: `/decks/:id/progress`
- **Główny cel**: Podsumować postępy użytkownika dla talii.
- **Kluczowe informacje do wyświetlenia**: Agregaty (total/new/learning/known, mastery%), lista par z uproszczonym stanem (read‑only w MVP).
- **Kluczowe komponenty widoku**: `ProgressSummary`, `ProgressPairsList` (opcjonalnie), `BackToDeck`.
- **Integracja API**: `GET /api/decks/:deckId/progress`.
- **UX/A11y/Bezpieczeństwo**: Ochrona trasy; skeletony i stany pustki; jasne legendy; brak edycji.
- **Powiązane historyjki**: US‑011.

7.

- **Nazwa widoku**: Nauka (matching)
- **Ścieżka widoku**: `/learn/:deckId`
- **Główny cel**: Ćwiczenie łączenia par w siatce 2 kolumny.
- **Kluczowe informacje do wyświetlenia**: Siatka 2×4 start (do 10 wierszy), licznik poprawnych/błędów, przycisk „Pokaż więcej”.
- **Kluczowe komponenty widoku**: `MatchingGrid` (kolumny lang_a | lang_b z niezależnym tasowaniem), `useMatchingGame` (logika), `ShowMoreButton`, `SessionStats`, `EndSessionCTA`.
- **Integracja API**: `GET /api/decks/:deckId/pairs` (pobranie puli), `POST /api/progress/review` (po każdym rozstrzygnięciu).
- **UX/A11y/Bezpieczeństwo**: Zawsze 2 kolumny; anty‑cheat: po błędzie ukryj 1 poprawną parę + dodaj fałszywkę; klawiatura (Strzałki / Tab / spacja) oraz myszą (wybieranie w kolumnach słow; ta sama kolumna zmiana wyboru (change/toggle), inna kolumna: automatyczna weryfikacja jezeli był wykonany wybór słowa /frazy), focus mgmt; `prefers-reduced-motion` wyłącza animacje; ochrona trasy.
- **Powiązane historyjki**: US‑008, US‑009.

8.

- **Nazwa widoku**: Challenge (jedna runda)
- **Ścieżka widoku**: `/challenge/:deckId`
- **Główny cel**: Sprawdzian w rundzie 2×5, wyniki do batch‑review.
- **Kluczowe informacje do wyświetlenia**: Plansza 2×5, timer (opcjonalnie), podsumowanie (accuracy, poprawne/niepoprawne).
- **Kluczowe komponenty widoku**: `ChallengeBoard`, `useMatchingGame` (tryb challenge), `RoundTimer`, `SummarySheet`.
- **Integracja API**: `GET /api/decks/:deckId/pairs` (pula 20), `POST /api/progress/batch-review` (na koniec jednej rundy).
- **UX/A11y/Bezpieczeństwo**: Kolejne rzędy pojawiają się z ~500 ms opóźnieniem (fade‑in; respektuj `prefers-reduced-motion`), pełny random doboru; ochrona trasy; komunikaty błędów sieci; obsługa myszą / kursorem.
- **Powiązane historyjki**: US‑010 (uproszczona runda w MVP).

9.

- **Nazwa widoku**: Generowanie (kreator 1‑ekranowy)
- **Ścieżka widoku**: `/generate`
- **Główny cel**: Utworzyć zestaw 30 par w istniejącej/nowej talii, zgodnie z parametrami.
- **Kluczowe informacje do wyświetlenia**:
  - Krok 1: Wybór talii (lista z `/api/decks`) lub utworzenie nowej (tytuł, opis, języki).
  - Krok 2: Źródło – `topic` (z listy 10) lub `text` (1–5000 znaków).
  - Krok 3: Parametry – `content_type` („auto/words/phrases/mini‑phrases”), `register` („neutral/informal/formal”).
  - Podgląd limitu dziennego i pozostałego quota.
- **Kluczowe komponenty widoku**: `GenerateWizard` (kroki wewnątrz jednego ekranu), `DeckPicker`, `CreateDeckInline`, `TopicPicker`, `TextAreaLimited`, `ParamsSelector`, `QuotaInfo`, `SubmitButton`.
- **Integracja API**: `GET /api/users/me/quota`, `GET /api/decks`, `POST /api/decks`, `POST /api/generate/from-topic` lub `POST /api/generate/from-text` (sukces → redirect do `/decks/:id`).
- **UX/A11y/Bezpieczeństwo**: Blokada przy braku quota (403/429 → toasty + CTA „Dowiedz się więcej”); walidacja długości tekstu (413) i pól (422/400); jasne stany ładowania; ochrona trasy.
- **Powiązane historyjki**: US‑001, US‑002, US‑003, US‑004, US‑012.

## 3. Mapa podróży użytkownika

- **Gość → Landing → Logowanie/Rejestracja**:
  - Gość przegląda kuratorowane talie (US‑015), po CTA przechodzi do `/auth/*` (US‑014).
- **Główny scenariusz (zalogowany)**:
  1. Wejście do `/generate` z menu głównego.
  2. Wybór istniejącej talii lub utworzenie nowej → `GET/POST /api/decks`.
  3. Wybór źródła (topic/text) i parametrów → `GET /api/users/me/quota` (weryfikacja).
  4. Zatwierdzenie → `POST /api/generate/from-topic|from-text` → sukces: redirect do `/decks/:id` z toastem.
  5. Na `/decks/:id`: przegląd, ewentualnie `+10` (`POST /api/generate/extend`), ręczne dodanie pary (`POST /api/decks/:deckId/pairs`), flagowanie błędu (`POST /api/decks/:deckId/pairs/:id/flag`).
  6. Start nauki: `/learn/:deckId` → pobranie puli par → po każdym rozstrzygnięciu `POST /api/progress/review` (US‑008/009).
  7. Podgląd progresu: `/decks/:id/progress` → `GET /api/decks/:deckId/progress` (US‑011).
  8. Challenge: `/challenge/:deckId` → jedna runda 2×5, na koniec `POST /api/progress/batch-review` (US‑010).
- **Stany wyjątkowe**:
  - Brak quota (403/429) → blokada „Generate”, komunikat z czasem resetu.
  - Tekst > 5000 znaków (413) → błąd inline i licznik znaków.
  - Brak uprawnień (401/403) → redirect do `/auth/login` z toastem.
  - Offline → ograniczone akcje (brak generowania, nauka na cached setach), baner „Offline”.

## 4. Układ i struktura nawigacji

- **Layout globalny**:
  - Header: Logo → link do `/`; nawigacja: `Decks`, `Generate`; po prawej `Login/Signup` lub `UserMenu` (avatar → `Logout`).
  - Mobile: burger menu z tymi samymi pozycjami; responsywne, focusable.
  - Footer: krótka informacja, linki pomocnicze.
- **Nawigacja kontekstowa**:
  - Na `/decks/:id`: pasek akcji (`Learn`, `Progress`, `Challenge`, `+10`, `Add Pair`).
  - Breadcrumbs: `Decks / {Deck title}` w detalach i progresie.
- **Ochrona tras**:
  - Middleware: redirect anonimowych z tras chronionych do `/auth/login` (z param `redirect_to`).
  - UI: ukrywa/przycina CTA dla gości (np. przyciski w headerze).
- **Wzorce nawigacyjne**:
  - Po sukcesie generowania → redirect do `/decks/:id`.
  - Po logowaniu → redirect do poprzednio żądanej trasy (jeśli była) lub `/decks`.

## 5. Kluczowe komponenty

- **Providers (stan aplikacji)**:
  - `AuthProvider`: sesja, uprawnienia, redirecty po 401.
  - `DeckDataProvider`: cache szczegółów talii i par (na stronach `/decks/:id`, `/learn`, `/challenge`).
  - `QuotaProvider`: bieżąca quota generowania (odświeżana po udanej generacji/extend).

- **Hooki**:
  - `useFetch`, `usePaginatedFetch`: pobieranie, retry, anulowanie, skeletony.
  - `useMatchingGame`: logika dopasowań, tasowanie kolumn, anty‑cheat, eventy do review/batch-review.
  - `usePairSelection`: wybór par w siatce (klawiatura/mysz/ekran dotykowy).
  - `useQuota`: pobór i wyświetlanie limitów, stan blokady CTA.

- **Komponenty UI (wielokrotnego użycia)**:
  - `Toaster` (Sonner) – globalne powiadomienia; mapowanie kodów błędów.
  - `LoadingSkeleton`, `EmptyState`, `ErrorState`.
  - `Pagination`, `SortSelect`, `SearchInput`.
  - `ConfirmDialog`, `FormErrorInline`, `TextAreaLimited`.

- **Komponenty domenowe**:
  - `DeckCard`, `DeckList`, `DeckHeader`.
  - `PairList`, `PairRow`, `PairFormModal` (create/edit), `FlagButton`.
  - `GenerateWizard` (DeckPicker, CreateDeckInline, TopicPicker, ParamsSelector, QuotaInfo).
  - `MatchingGrid`, `PairTileSelectable`, `SessionStats`, `ShowMoreButton`.
  - `ChallengeBoard`, `RoundTimer`, `SummarySheet`.
  - `ProgressSummary`, `ProgressPairsList` (opcjonalnie read‑only).

- **A11y i wzorce interakcji**:
  - Fokus i skróty: Tab porusza się kolumnami L→P; Enter/Space wybiera; Esc zamyka dialogi.
  - Role/ARIA: listy, przyciski, statusy (live region dla toastów), etykiety pól formularzy.
  - `prefers-reduced-motion`: wyłączone tasowanie animowane i fade‑in; zachowane dostępne stany.

- **Mapowanie wymagań/US → UI**:
  - US‑001/002/003/004 → `/generate` (GenerateWizard) + integracja `/api/generate/*`.
  - US‑005 → `/decks/:id` (ActionBar „+10”) + `POST /api/generate/extend`.
  - US‑006 → `/decks/:id` (PairFormModal) + `POST /api/decks/:deckId/pairs`.
  - US‑007 → `/decks/:id` (FlagButton) + `POST /api/decks/:deckId/pairs/:id/flag`.
  - US‑008/009 → `/learn/:deckId` (MatchingGrid, anty‑cheat) + `POST /api/progress/review`.
  - US‑010 → `/challenge/:deckId` (ChallengeBoard) + `POST /api/progress/batch-review`.
  - US‑011 → `/decks/:id/progress` (ProgressSummary) + `GET /api/decks/:deckId/progress`.
  - US‑012 → `/generate` (QuotaInfo) + `GET /api/users/me/quota` (blokady CTA).
  - US‑013 → cache PWA; UI baner „Offline” i dostęp do cached decków.
  - US‑014/015 → `/auth/*`, `/` (landing kuratorowany).

- **Przypadki brzegowe i obsługa błędów (globalne)**:
  - 401/403 → redirect/ukrycie akcji, toast „Zaloguj się”.
  - 409 (duplikaty/`+10` brak puli) → komunikat i sugestie.
  - 413 (tekst) → blokada przycisku, licznik znaków.
  - 422/400 → podświetlenie pól i wskazanie ograniczeń (≤8 tokenów/strona).
  - 500/503 → retry, komunikat o niedostępności usługi.
