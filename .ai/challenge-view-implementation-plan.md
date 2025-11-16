## Plan implementacji: Widok Challenge (3×5×3, czas + błędy)

## 1. Przegląd i cel

**Cel biznesowy**: Dostarczyć widok `/challenge/user/:deckId`, w którym użytkownik jak najszybciej łączy pary w siatce 2×5, przechodząc przez 3 rundy (łącznie 15 unikalnych par). Wynikiem jest **łączny czas** oraz liczba błędnych prób, prezentowane z prostą oceną (złoto/srebro/brąz) i lokalną „tablicą wyników” dla talii.

**Charakter trybu**: „Speedrun for fun” – **bez Leitnera, bez zaawansowanej anty‑cheat logiki, bez pauz**, prosta mechanika dopasowywania i przechodzenia przez 3 rundy w jednym komponencie UX.

**Stack**: Astro 5 (SSR) + React 19 + TypeScript 5, UI w Tailwind 4 + shadcn/ui, dane z Supabase. Widok jest chroniony (użytkownik zalogowany), ale ten sam komponent gry ma być docelowo reużywalny także na landing page dla gościa (publiczny deck).

---

## 2. Założenia funkcjonalne (z PRD + doprecyzowania)

### 2.1. Struktura Challenge

- **Tryb Challenge**:
  - 3 rundy.
  - Każda runda to siatka **2×5** (5 par, pomieszane w kolumnach).
  - **Łącznie 15 unikalnych par** na cały Challenge (brak powtórek).
- **Deck kontekstowy**:
  - Challenge jest zawsze wykonywany **w ramach konkretnego decka** (`deckId` w URL).
  - Pary dobierane są **losowo** z talii, bez dodatkowej logiki Leitnera.
  - Deck musi mieć **co najmniej 15 par** – inaczej Challenge jest zablokowany.
  - Predefiniowany deck na landing page to deck z `visibility = public` (lub `unlisted` przez share), ale to jest reuse komponentu, nie tego widoku SSR.

### 2.2. Zasady gry

- **Start**:
  - Przed kliknięciem `Start` komponent ma już w pamięci wylosowane 15 par (lub wiemy, że ich nie ma i blokujemy start).
  - Kliknięcie `Start`:
    - uruchamia globalny stoper,
    - wczytuje pierwszą rundę (2×5) do siatki,
    - ukrywa przycisk `Start` / zamienia go na inne UI (np. podsumowanie/Restart).
- **Dopasowanie**:
  - Siatka 2 kolumny: `L1` | `L2`, kolejność w każdej kolumnie jest niezależnie tasowana.
  - Komórki są **przyciskami** (komponent `Button` lub podobny) z zachowaniem „toggle/radio” w obrębie danej kolumny:
    - kliknięcie elementu w kolumnie zaznacza go,
    - kliknięcie innego elementu w tej samej kolumnie zmienia zaznaczenie,
    - kliknięcie już zaznaczonego elementu odznacza go.
  - Jeżeli w obu kolumnach jest zaznaczone po jednym elemencie:
    - sprawdzamy dopasowanie,
    - jeśli poprawne:
      - para jest oznaczana jako ukończona (np. znika z siatki lub zmienia styl na „done”),
      - nie można jej już użyć ponownie,
      - przechodzimy do oczekiwania na następne dopasowanie.
    - jeśli błędne:
      - **oba zaznaczone pola podświetlamy na czerwono**,
      - przez ~2 sekundy są zablokowane przed ponownym wyborem,
      - po 2 sekundach wracają do normalnego stanu (brak zaznaczenia),
      - **zwiększamy licznik błędnych prób** (tylko do statystyk/oceny, bez wpływu na postęp w nauce).
- **Rundy**:
  - Po ukończeniu 5 poprawnych dopasowań w rundzie:
    - rejestrujemy „czas okrążenia” (czas od startu Challenge do ukończenia tej rundy),
    - zapisujemy go w lokalnym stanie (`roundTimes`),
    - odpalamy **animację przejścia** (~3 sekundy; fade/slide, z respektowaniem `prefers-reduced-motion`),
    - automatycznie ładujemy następną rundę z przygotowanych par (bez dodatkowych requestów do API).
  - Po ukończeniu trzeciej rundy:
    - zatrzymujemy stoper,
    - mamy pełną listę okrążeń oraz czas łączny.

### 2.3. Czas i wynik

- **Stoper**:
  - Jeden globalny licznik **widoczny cały czas**, np. nad siatką:
    - format: `MM:SS.mmm` (np. `00:39.890`).
  - Wyświetlamy **czas okrążenia** po każdej rundzie:
    - `00:15.234`
    - `00:39.890`
    - `01:01.133` (**ostatnia linia wyróżniona** jako „czas końcowy”).
- **Minimalizacja/zmiana zakładki**:
  - Przy zmianie widoczności strony (`visibilitychange`):
    - spróbujemy **pauzować stoper** (zapamiętać czas i zatrzymać tykanie) i wznawiać po powrocie,
    - jeśli z jakiegoś powodu nie będzie to działać idealnie (np. różne przeglądarki), akceptujemy, że Challenge jest „casualowy” – najwyżej czas poleci odrobinę dalej.
  - **Odświeżenie strony / nawigacja poza widok**:
    - Challenge jest resetowany (stan rund i timera znika),
    - użytkownik zaczyna od zera przy kolejnym wejściu.

### 2.4. Wynik końcowy i ocena

- Na końcu Challenge pokazujemy:
  - **łączny czas** (`totalTime`),
  - **liczbę poprawnych dopasowań** (powinno być 15),
  - **liczbę błędnych prób** (`incorrectAttempts`),
  - **ocenę**:
    - złoto: 0 błędów,
    - srebro: 1–2 błędy,
    - brąz: 3–5 błędów,
    - (dla >5 błędów: albo „brak medalu”, albo brąz – decyzja UX; można oznaczyć TODO).
- Dodatkowo:
  - **lista Top 10 wyników** dla talii (wg najszybszego `totalTime`),
  - wyróżnienie najlepszego własnego wyniku (jeśli zalogowany użytkownik ma wpis w rankingu).

---

## 3. Architektura i routing

### 3.1. Routing i SSR

- **Główna trasa (użytkownik zalogowany)**:
  - `src/pages/challenge/user/[deckId].astro`
  - SSR:
    - weryfikacja użytkownika przez `Astro.locals.user` (middleware),
    - pobranie podstawowych danych talii (tytuł, języki, widoczność),
    - wstępne sprawdzenie, czy deck ma ≥15 par (opcjonalne – można delegować do API od Challenge),
    - przekazanie `deckId` i danych talii do komponentu React.
- **Docelowy reuse na landing page (gość)**:
  - Osobny widok, np. `src/pages/challenge/demo/[deckId].astro` lub reuse z landing:
    - używa tego samego komponentu React do gry,
    - różni się źródłem talii (kuratorowana/publiczna) oraz sposobem zapisu wyników (localStorage).

### 3.2. Podział na warstwy

- **Warstwa Astro (SSR)**:
  - Odpowiada za ochronę trasy, pobranie minimalnych danych decka, render layoutu (`Layout.astro`) i osadzenie komponentu React.
- **Warstwa React (ChallengeView)**:
  - Odpowiada za:
    - pobranie/zainicjalizowanie par dla Challenge,
    - zarządzanie stanem rund, timerem, błędami,
    - render siatki i timera,
    - zapis wyniku (API/localStorage),
    - pokazanie Top 10.
- **Warstwa logiki gry (hook)**:
  - `useMatchingGame` (rozszerzony) lub osobny hook `useChallengeGame`:
    - logika zaznaczania w kolumnach,
    - weryfikacja dopasowania,
    - liczenie poprawnych/błędnych prób,
    - sterowanie przejściem między rundami,
    - expose prosty interfejs dla komponentu UI.

---

## 4. Komponenty i interfejsy

### 4.1. Komponenty domenowe (nowe / reużywane)

- **`ChallengeView`** (`src/components/challenge/ChallengeView.tsx`)
  - Główny komponent dla trasy `/challenge/user/:deckId`.
  - Props:
    - `deckId: string`,
    - `deckTitle: string`,
    - `mode: "user" | "guest"` (opcjonalnie, z myślą o reuse).
  - Odpowiedzialności:
    - inicjalizacja danych (fetch par dla Challenge, fetch Top 10),
    - obsługa stanów ładowania i błędu (brak 15 par, błąd API),
    - przekazanie par do komponentu siatki i hooków logiki,
    - render headera (tytuł talii, opis, przyciski powrotu),
    - render sekcji timera, siatki, wyników, listy Top 10.

- **`MatchingGrid` (reuse / rozszerzenie)** (`src/components/learn/MatchingGrid.tsx` lub bardziej ogólna lokalizacja)
  - Generyczna siatka 2 kolumn z logiką zaznaczania i dopasowania:
    - konfiguracja przez props:
      - `mode: "learn" | "challenge"`,
      - `pairs: PairDTO[]` (dla danej rundy),
      - callbacki: `onMatchSuccess(pairId)`, `onMatchFailure(pairIdA, pairIdB)`.
  - W trybie `challenge`:
    - brak anty‑cheat (bez fałszywek, bez ukrywania par po błędzie),
    - prosty efekt błędu: 2s czerwone podświetlenie + blokada kliknięć na te dwa pola.

- **`ChallengeTimer`** (`src/components/challenge/ChallengeTimer.tsx`)
  - Prezentacja czasu:
    - aktualny czas,
    - lista okrążeń / rund,
    - wyróżnienie czasu końcowego.
  - Obsługuje formatowanie `MM:SS.mmm`.

- **`ChallengeProgressIndicator`** (`src/components/challenge/ChallengeProgressIndicator.tsx`)
  - Mini pasek progresu (podobny do `StepIndicator` w `GenerateWizard`):
    - 3 kroki (Round 1, Round 2, Round 3),
    - podświetlenie aktualnej rundy,
    - oznaczenie ukończonych rund (np. check icon).

- **`ChallengeSummary`** (`src/components/challenge/ChallengeSummary.tsx`)
  - Wyświetla:
    - łączny czas,
    - liczbę błędnych prób,
    - medal (złoto/srebro/brąz),
    - przyciski:
      - `Zacznij ponownie` (pobiera nowy zestaw 15 par),
      - `Powrót do talii` (link do `/decks?deck=:deckId` lub `/decks/:deckId`).

- **`ChallengeLeaderboard`** (`src/components/challenge/ChallengeLeaderboard.tsx`)
  - Lista Top 10 wyników dla danej talii:
    - kolumny: `Lp`, `Czas`, `Błędy`, `Data`,
    - wyróżnienie wyniku bieżącego użytkownika (o ile jest).

### 4.2. Hooki

- **`useChallengeGame`** (`src/components/challenge/useChallengeGame.ts`)
  - Stan gry:
    - `status: "idle" | "ready" | "running" | "finished" | "error"`,
    - `currentRound: 1 | 2 | 3`,
    - `roundPairs: PairDTO[][]` (3 tablice po 5 par),
    - `completedPairsCount: number`,
    - `incorrectAttempts: number`,
    - `roundTimesMs: number[]`,
    - `totalTimeMs: number | null`.
  - API:
    - `start()` – start Challenge,
    - `handleMatchSuccess(pairId)` – wywoływany przez siatkę,
    - `handleMatchFailure(pairIdA, pairIdB)` – inkrementuje błędy, zarządza cooldownem,
    - `reset()` – pełny restart (nowe losowanie par przy zewnętrznym fetchu),
    - `onFinish(callback)` – callback po ukończeniu (zapis wyniku).

- **`useStopwatch`** (`src/components/hooks/useStopwatch.ts`)
  - Zarządzanie czasem:
    - `start()`, `stop()`, `reset()`, `lap()` (zwraca czas od startu),
    - `timeMs` (aktualny czas), `laps` (tablica),
    - obsługa `visibilitychange` (pauza/przywracanie).

---

## 5. Integracja z API i modelem danych

### 5.1. Pozyskiwanie par do Challenge

- **Cel**: w jednym requestcie pobrać **15 unikalnych, losowych par** dla decka (o ile istnieją).
- Opcje implementacji:
  - A) **Nowy endpoint dedykowany Challenge**:
    - `GET /api/decks/:deckId/challenge-pairs?limit=15`
    - Logika:
      - sprawdza, czy deck jest dostępny (własny lub public/unlisted z RLS),
      - wybiera 15 losowych par z tabeli `pairs` (z `deleted_at IS NULL`),
      - jeśli mniej niż 15 → zwraca błąd `400` z kodem `NOT_ENOUGH_PAIRS`.
  - B) Rozszerzenie istniejącego `GET /api/decks/:deckId/pairs` o:
    - query param `mode=challenge&limit=15&random=true`.
- **Rekomendacja (MVP)**: wariant A (czytelny kontrakt, prostsze warstwy UI).

### 5.2. Zapis wyników Challenge (user)

- **Nowy endpoint**:
  - `POST /api/challenge/results`
  - Body:
    - `deck_id: string`,
    - `total_time_ms: number`,
    - `correct: number`, (powinno być 15),
    - `incorrect: number`,
    - `version: string` (np. `"challenge_v1"`),
    - opcjonalnie: `round_times_ms: number[]`.
  - Odpowiedź:
    - `id`, `deck_id`, `user_id`, `total_time_ms`, `incorrect`, `completed_at`.
- **Tabela** (nowa, po stronie Supabase – opis w innym dokumencie DB):
  - `challenge_results`:
    - `id` (uuid, pk),
    - `user_id` (uuid, fk -> profiles),
    - `deck_id` (uuid, fk -> decks),
    - `total_time_ms` (int),
    - `correct` (smallint),
    - `incorrect` (smallint),
    - `version` (text),
    - `round_times_ms` (jsonb, opcjonalnie),
    - `created_at` (timestamp).
  - RLS:
    - użytkownik może tworzyć nowe wpisy dla własnych wyników,
    - może odczytywać Top 10 (read-only ranking dla danej talii; można dopuścić publiczne odczyty dla public decks).

### 5.3. Top 10 wyników dla talii

- **Nowy endpoint**:
  - `GET /api/challenge/decks/:deckId/top`
  - Query params:
    - `limit` (domyślnie 10).
  - Odpowiedź:
    - lista wyników:
      - `user_display_name` (lub anonimizowany identyfikator),
      - `total_time_ms`,
      - `incorrect`,
      - `completed_at`,
      - czy jest to wynik bieżącego użytkownika.
- **LocalStorage (gość / landing)**:
  - Klucz np. `linguapairs.challenge.best.${deckId}`:
    - `total_time_ms`,
    - `incorrect`,
    - `completed_at`.
  - Challenge na landing page korzysta tylko z localStorage (bez wpisu do bazy).

---

## 6. Scenariusze UX i stany widoku

### 6.1. Stany główne

- **Loading**:
  - Po wejściu na `/challenge/user/:deckId`:
    - spinner + skeleton siatki,
    - fetch:
      - danych decka (tytuł/języki),
      - par do Challenge (`challenge-pairs`),
      - Top 10 wyników (opcjonalnie równolegle).
- **Ready**:
  - Siatka jest pusta lub w stanie „przygotowania”,
  - widoczny przycisk `Start`,
  - krótki opis trybu (co się liczy, jakie są zasady).
- **Running**:
  - Timer tyka,
  - aktualna runda 1–3,
  - siatka 2×5 z aktywnymi przyciskami.
- **Transition** (pomiędzy rundami):
  - overlay/animacja na ~3 sekundy,
  - timer może:
    - nadal liczyć (ciągły czas) – preferowane,
    - lub zostać „zamrożony” na UI, ale czas globalny i tak rośnie w pamięci (KISS, ważniejsze jest UX niż matematyczna perfekcja).
- **Finished**:
  - Siatka znika lub przechodzi w stan read-only,
  - wyświetlany jest `ChallengeSummary` + `ChallengeLeaderboard`,
  - dostępny jest `Zacznij ponownie` i link do talii.

### 6.2. Stany błędów i edge cases

- **Za mało par w talii (<15)**:
  - Nie pokazujemy `Start`, zamiast tego:
    - komunikat o braku wystarczającej liczby par,
    - CTA „Przejdź do talii i dodaj więcej par” (`/decks?deck=:deckId`).
- **Błąd API przy pobieraniu par**:
  - stan błędu z możliwością `Spróbuj ponownie`,
  - brak możliwości rozpoczęcia Challenge.
- **Brak uprawnień / prywatna talia**:
  - w warstwie API → błąd 403/404,
  - w UI:
    - komunikat „Brak dostępu do talii”,
    - dla public decków zadziała RLS (SELECT dozwolony).
- **Restart**:
  - `Zacznij ponownie`:
    - zawsze pobiera **nowy zestaw 15 losowych par** (brak „masterowania” jednej konfiguracji),
    - resetuje wszystkie timery i liczniki.

---

## 7. Testy i weryfikacja

### 7.1. Scenariusze funkcjonalne

1. **Challenge na talii z ≥15 parami (user)**
   - ✅ `Start` dostępny, timer startuje, pierwsza runda 2×5 ładuje się poprawnie.
   - ✅ Po 5 poprawnych dopasowaniach następuje płynne przejście do rundy 2, potem 3.
   - ✅ Po ostatnim dopasowaniu timer się zatrzymuje, wyświetla się podsumowanie i Top 10.

2. **Błędne dopasowania**
   - ✅ Przy złym dopasowaniu dwa pola zapalają się na czerwono, są nieklikalne przez ~2s.
   - ✅ Po 2s wracają do normalnego stanu, licznik błędów zwiększa się o 1.
   - ✅ Błędne próby nie blokują ukończenia Challenge.

3. **Za mało par w talii**
   - ✅ Challenge nie startuje, zamiast `Start` jest komunikat i link do talii.
   - ✅ API zwraca kod błędu (`NOT_ENOUGH_PAIRS`), UI pokazuje sensowny komunikat.

4. **Top 10 wyników**
   - ✅ Po ukończeniu Challenge wynik użytkownika jest widoczny w rankingu (jeśli zalogowany).
   - ✅ Lista sortuje się po rosnącym `total_time_ms`.
   - ✅ Dla gościa (landing) najlepszy wynik zapisuje się w localStorage.

5. **Restart**
   - ✅ `Zacznij ponownie` resetuje stan i pobiera nowy zestaw par.
   - ✅ Timer i licznik błędów wracają do 0.

### 7.2. Edge i UX

- Sprawdzenie zachowania przy `visibilitychange` (minimalizacja/zmiana zakładki).
- Zachowanie przy powolnym połączeniu (czas ładowania par/Top 10).
- Zachowanie na małych ekranach (mobile): siatka 2 kolumn musi pozostać czytelna i klikalna.

---

## 8. Ryzyka i dodatkowe uwagi

- **Losowanie par a wydajność**:
  - `ORDER BY random()` na dużych taliach może być wolne – w MVP akceptowalne, ale warto:
    - ograniczyć liczbę rekordów (np. `WHERE deck_id = :deckId LIMIT 100` przed losowaniem),
    - rozważyć prostą pseudo-losowość (np. hash ID) w przyszłości.
- **Spójność trybu z przyszłym Leitnerem**:
  - Obecnie Challenge nie wpływa na Leitnera – to jest zgodne z wymaganiem, ale:
    - w przyszłości możemy chcieć mapować wyniki Challenge na `batch-review`,
    - warto przechowywać `version` i ewentualnie `round_times_ms`, by mieć miejsce na rozszerzenia.
- **RLS i widoczność talii**:
  - Challenge musi działać także dla public/unlisted decków (goście / landing):
    - upewnić się, że polityki RLS dla `pairs` i `challenge_results` akceptują SELECT dla publicznych decków,
    - zapis wyników (insert) powinien być ograniczony do zalogowanych użytkowników.
- **Zachowanie przy długich animacjach/przejściach**:
  - Konieczne jest respektowanie `prefers-reduced-motion`, by nie wymuszać 3‑sekundowych animacji u użytkowników wrażliwych na ruch.
- **Ranking a prywatność**:
  - W Top 10 warto wyświetlać zanonimizowane identyfikatory (np. skrócony username lub „Anonimowy #3”), aby uniknąć problemów z danymi osobowymi w publicznych taliach.

---

## 9. Kolejność implementacji (propozycja)

1. **API + DB (backend)**
   - Endpoint `GET /api/decks/:deckId/challenge-pairs`.
   - Tabela `challenge_results` + endpointy `POST /api/challenge/results`, `GET /api/challenge/decks/:deckId/top`.

2. **Hooki logiki gry i timera (frontend)**
   - `useStopwatch`, `useChallengeGame`.
   - Integracja z istniejącym/planowanym `useMatchingGame` (konfiguracja `mode: "challenge"`).

3. **Komponent siatki (reuse)**
   - Dostosowanie/wyciągnięcie generycznego `MatchingGrid`.
   - Dodanie efektu błędu (2s czerwone zaznaczenie + cooldown).

4. **Komponenty Challenge (UI)**
   - `ChallengeTimer`, `ChallengeProgressIndicator`, `ChallengeSummary`, `ChallengeLeaderboard`.
   - Spójne stylowanie z resztą aplikacji (Tailwind + shadcn/ui).

5. **Widok Astro i integracja**
   - `src/pages/challenge/user/[deckId].astro` – SSR + osadzenie `ChallengeView`.
   - Linkowanie z `DeckActions` (przycisk Challenge już istnieje).

6. **Testy i dopieszczenie UX**
   - Scenariusze z sekcji 7, w tym mobile i edge cases.
   - Ewentualna kalibracja długości animacji przejścia między rundami (wg feedbacku UX).
