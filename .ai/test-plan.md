## Plan Testów dla Aplikacji 10x-LinguaPairs

### 1. Wprowadzenie i cele testowania

#### 1.1. Wprowadzenie

Niniejszy dokument przedstawia kompleksowy plan testów dla aplikacji webowej **10x-LinguaPairs** w fazie MVP. Aplikacja, zbudowana w oparciu o nowoczesny stos technologiczny (Astro, React, Supabase), ma na celu wspieranie użytkowników w nauce słownictwa poprzez interaktywne fiszki. Plan ten definiuje strategię, zakres, zasoby i harmonogram działań testowych, mających na celu zapewnienie najwyższej jakości produktu.

#### 1.2. Cele testowania

Główne cele procesu testowego to:

- **Weryfikacja funkcjonalna**: Upewnienie się, że wszystkie kluczowe funkcjonalności aplikacji działają zgodnie ze specyfikacją wymagań.
- **Zapewnienie jakości**: Identyfikacja i eliminacja błędów przed wdrożeniem produkcyjnym, aby zapewnić stabilne i niezawodne działanie aplikacji.
- **Walidacja bezpieczeństwa**: Sprawdzenie, czy dane użytkowników są chronione, a mechanizmy autentykacji i autoryzacji (w tym RLS Supabase) działają poprawnie.
- **Ocena użyteczności**: Weryfikacja, czy interfejs użytkownika jest intuicyjny, spójny i responsywny na różnych urządzeniach.
- **Sprawdzenie kompatybilności**: Zapewnienie poprawnego działania aplikacji w najpopularniejszych przeglądarkach internetowych.

### 2. Zakres testów

#### 2.1. Funkcjonalności objęte testami

Testy obejmą wszystkie kluczowe moduły aplikacji zdefiniowane dla wersji MVP:

- **Moduł Uwierzytelniania Użytkowników**:
  - Rejestracja nowego użytkownika.
  - Logowanie i wylogowywanie.
  - Obsługa sesji i ochrona prywatnych tras (Astro middleware).
- **Zarządzanie Zestawami Fiszek (Decks)**:
  - Tworzenie, odczyt, aktualizacja i usuwanie (CRUD) zestawów fiszek.
  - Walidacja danych wejściowych formularzy (Zod).
- **Zarządzanie Fiszkami (Flashcards)**:
  - Operacje CRUD na pojedynczych fiszkach w ramach zestawu.
- **Moduł Nauki**:
  - Interaktywny interfejs do przeglądania fiszek (komponenty React).
  - Mechanizm oznaczania postępów w nauce.
- **API (Endpointy)**:
  - Testowanie wszystkich publicznych i chronionych endpointów API (`src/pages/api`).
- **Interfejs Użytkownika (UI)**:
  - Responsywność layoutu (desktop, tablet, mobile).
  - Spójność wizualna i działanie komponentów Shadcn/ui.
  - Płynność przejść (Astro View Transitions API).

#### 2.2. Funkcjonalności wyłączone z testów

W fazie MVP następujące obszary zostaną wyłączone z formalnych testów:

- Zaawansowane testy wydajnościowe i obciążeniowe.
- Testy integracji z systemami zewnętrznymi (innymi niż Supabase).
- Testy A/B.
- Testy w przestarzałych wersjach przeglądarek (np. Internet Explorer).

### 3. Typy testów

W projekcie zostanie zastosowane podejście oparte na piramidzie testów, aby zapewnić zrównoważone pokrycie na różnych poziomach aplikacji.

| Rodzaj Testu            | Opis                                                                                                                                              | Narzędzia/Techniki                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Testy Jednostkowe**   | Weryfikacja pojedynczych funkcji, komponentów i logiki biznesowej w izolacji. Skupienie na `src/lib` (serwisy, walidacja) i komponentach React.   | **Vitest**, React Testing Library                       |
| **Testy Integracyjne**  | Sprawdzanie współpracy między modułami, np. interakcji komponentów z serwisami, oraz komunikacji z API i bazą danych (mockowany klient Supabase). | **Vitest**, React Testing Library, Mock Service Worker  |
| **Testy End-to-End**    | Symulacja rzeczywistych scenariuszy użytkownika w przeglądarce. Weryfikacja kompletnych przepływów, np. od rejestracji po stworzenie fiszki.      | **Playwright** lub **Cypress**                          |
| **Testy API**           | Bezpośrednie testowanie endpointów API (`src/pages/api`) w celu weryfikacji logiki biznesowej, autoryzacji i poprawności odpowiedzi.              | **Vitest** (z użyciem `supertest` lub `fetch`)          |
| **Testy Manualne**      |                                                                                                                                                   |                                                         |
| _Testy eksploracyjne_   | Swobodne testowanie aplikacji w celu odkrycia nieprzewidzianych błędów i problemów z użytecznością.                                               | Ręczna weryfikacja                                      |
| _Testy regresji_        | Ręczna weryfikacja kluczowych funkcjonalności po wprowadzeniu istotnych zmian lub przed wydaniem nowej wersji.                                    | Zdefiniowane scenariusze regresji                       |
| _Testy Użyteczności_    | Ocena intuicyjności, przejrzystości i ogólnego doświadczenia użytkownika (UX).                                                                    | Ręczna weryfikacja, heurystyki Nielsena                 |
| _Testy Kompatybilności_ | Weryfikacja poprawnego renderowania i działania aplikacji na różnych przeglądarkach i urządzeniach.                                               | Chrome, Firefox, Safari, Edge; widok mobilny w DevTools |

### 4. Scenariusze testowe dla kluczowych funkcjonalności

Poniżej przedstawiono przykładowe, wysokopoziomowe scenariusze testowe. Szczegółowe przypadki testowe zostaną opracowane w systemie do zarządzania testami.

#### 4.1. Uwierzytelnianie i Autoryzacja

- **Scenariusz 1**: Poprawna rejestracja użytkownika
  - _Kroki_: Użytkownik wypełnia formularz rejestracyjny poprawnymi danymi i go przesyła.
  - _Oczekiwany rezultat_: Konto zostaje utworzone, użytkownik jest zalogowany i przekierowany na stronę główną.
- **Scenariusz 2**: Logowanie z poprawnymi i niepoprawnymi danymi
  - _Kroki_: Użytkownik próbuje zalogować się, używając prawidłowych, a następnie błędnych danych.
  - _Oczekiwany rezultat_: Logowanie udane dla poprawnych danych. Dla błędnych danych wyświetlany jest komunikat o błędzie.
- **Scenariusz 3**: Dostęp do chronionych zasobów
  - _Kroki_: Niezalogowany użytkownik próbuje uzyskać dostęp do strony z zestawami fiszek.
  - _Oczekiwany rezultat_: Użytkownik jest przekierowany na stronę logowania.
- **Scenariusz 4**: Izolacja danych użytkownika (RLS)
  - _Kroki_: Użytkownik A (zalogowany) próbuje odczytać dane (np. zestawy fiszek) należące do użytkownika B poprzez API.
  - _Oczekiwany rezultat_: API zwraca pustą listę lub błąd autoryzacji; dane użytkownika B nie są widoczne.

#### 4.2. Zarządzanie zestawami fiszek

- **Scenariusz 5**: Tworzenie nowego zestawu fiszek z walidacją
  - _Kroki_: Zalogowany użytkownik próbuje zapisać formularz tworzenia zestawu z pustą nazwą, a następnie z poprawnymi danymi.
  - _Oczekiwany rezultat_: Przy próbie zapisu pustego formularza pojawia się błąd walidacji. Po wpisaniu poprawnych danych zestaw zostaje zapisany i jest widoczny na liście.
- **Scenariusz 6**: Edycja i usunięcie zestawu
  - _Kroki_: Użytkownik edytuje nazwę istniejącego zestawu, a następnie usuwa inny zestaw, potwierdzając operację.
  - _Oczekiwany rezultat_: Zmiany są poprawnie zapisywane. Usunięty zestaw znika z listy.

### 5. Środowisko testowe

- **Środowisko lokalne**: Programiści uruchamiają testy jednostkowe i integracyjne lokalnie przed wypchnięciem zmian do repozytorium.
- **Środowisko CI (Continuous Integration)**:
  - Na platformie GitHub Actions, po każdym pushu do gałęzi `main` lub otwarciu Pull Requesta, automatycznie uruchamiane będą:
    - Lintowanie i formatowanie kodu (`bun run lint`, `bun run format`).
    - Testy jednostkowe i integracyjne.
    - Testy E2E.
- **Środowisko Staging**:
  - Dedykowana instancja aplikacji połączona z osobną bazą danych Supabase.
  - Służy do testów manualnych, eksploracyjnych oraz weryfikacji poprawek przed wdrożeniem na produkcję.

### 6. Narzędzia do testowania

- **Framework do testów jednostkowych i integracyjnych**: **Vitest** (zgodnie z sugestią w dokumentacji projektu).
- **Biblioteka do testowania komponentów React**: **React Testing Library**.
- **Framework do testów E2E**: **Playwright** (rekomendowany ze względu na szybkość, niezawodność i świetne narzędzia deweloperskie).
- **Mockowanie API/serwisów**: **Mock Service Worker (MSW)** do symulacji odpowiedzi API w testach.
- **CI/CD**: **GitHub Actions**.
- **Zarządzanie błędami i zadaniami**: **GitHub Issues**.

### 7. Harmonogram testów

Testowanie jest procesem ciągłym, zintegrowanym z cyklem rozwoju oprogramowania.

- **Testy jednostkowe/integracyjne**: Pisane równolegle z nowym kodem przez deweloperów.
- **Testy E2E**: Dodawane dla każdej nowej, kluczowej funkcjonalności.
- **Testy regresji (automatyczne)**: Uruchamiane przy każdym Pull Requescie i przed każdym wdrożeniem.
- **Testy manualne/eksploracyjne**: Przeprowadzane na środowisku Staging przed planowanym wydaniem nowej wersji.

### 8. Kryteria akceptacji testów

#### 8.1. Kryteria wejścia (rozpoczęcia testów)

- Kod został pomyślnie zbudowany i wdrożony na odpowiednim środowisku testowym.
- Wszystkie testy jednostkowe i integracyjne powiązane z daną funkcjonalnością przechodzą pomyślnie.

#### 8.2. Kryteria wyjścia (zakończenia testów)

- **Pokrycie kodu testami jednostkowymi**: minimum 80% dla kluczowej logiki biznesowej (`src/lib/services`).
- **Testy automatyczne**: 100% testów E2E dla krytycznych ścieżek użytkownika musi zakończyć się sukcesem.
- **Błędy krytyczne i blokujące**: Brak otwartych błędów o priorytecie krytycznym lub blokującym.
- **Akceptacja manualna**: Wszystkie scenariusze testowe zdefiniowane dla danej wersji zostały wykonane i zaakceptowane.

### 9. Role i odpowiedzialności

| Rola                      | Odpowiedzialności                                                                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Deweloper**             | - Pisanie testów jednostkowych i integracyjnych.<br>- Utrzymywanie wysokiego pokrycia kodu testami.<br>- Naprawa błędów zgłoszonych przez QA.                                                    |
| **Inżynier QA**           | - Projektowanie i implementacja testów E2E.<br>- Tworzenie scenariuszy i przypadków testowych.<br>- Przeprowadzanie testów manualnych i eksploracyjnych.<br>- Raportowanie i weryfikacja błędów. |
| **Product Owner/Manager** | - Definiowanie kryteriów akceptacji dla funkcjonalności.<br>- Ustalanie priorytetów dla zgłoszonych błędów.                                                                                      |

### 10. Procedury raportowania błędów

Wszystkie zidentyfikowane błędy będą raportowane w systemie **GitHub Issues** zgodnie z poniższym szablonem:

- **Tytuł**: Krótki, zwięzły opis problemu.
- **Opis**:
  - **Kroki do reprodukcji**: Szczegółowa, numerowana lista kroków potrzebnych do odtworzenia błędu.
  - **Obserwowany rezultat**: Co faktycznie się stało.
  - **Oczekiwany rezultat**: Co powinno się stać.
- **Środowisko**: Wersja przeglądarki, system operacyjny, urządzenie.
- **Priorytet**:
  - `Critical` - Blokuje kluczowe funkcjonalności.
  - `High` - Poważny błąd, ale istnieje obejście.
  - `Medium` - Błąd o mniejszym wpływie, nie blokuje pracy.
  - `Low` - Drobny problem, np. literówka, błąd w UI.
- **Zrzuty ekranu/Nagrania wideo**: Załączniki graficzne ilustrujące problem.
- **Etykiety**: np. `bug`, `ui`, `auth`, `performance`.
