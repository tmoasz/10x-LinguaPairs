# OpenRouter Service — Plan Wdrożenia (bez kodu)

## 1. Opis usługi

Usługa OpenRouter to bezpieczna warstwa integracyjna nad API OpenRouter służąca do uzupełniania czatów opartych na LLM w projekcie 10x‑LinguaPairs. Kluczowe cechy:

- Tryb synchroniczny i strumieniowy (SSE) dla czatów.
- Obsługa komunikatów systemowych i użytkownika zgodnie z modelem wiadomości OpenRouter.
- Ustrukturyzowane odpowiedzi przez response_format wykorzystujące JSON Schema (z trybem strict).
- Konfigurowalna nazwa modelu oraz parametry inferencji z domyślnymi wartościami i nadpisywaniem per‑żądanie.
- Spójna obsługa błędów, retry/backoff, timeouts oraz opcjonalna telemetria z poszanowaniem prywatności.

Zastosowanie: backend (Astro SSR z adapterem Node) oraz pośredni endpoint API, aby nie ujawniać klucza w przeglądarce.

### Komponenty i cele (z wyzwaniami i rozwiązaniami)

1. Konfiguracja i inicjalizacja
   - Cel: bezpiecznie wczytać ustawienia (klucz, URL, domyślny model, parametry, nagłówki identyfikujące aplikację, timeout, retry).
   - Wyzwania: brak klucza, niespójne źródła konfiguracji, zła wartość timeoutu.
   - Rozwiązania: walidacja zmiennych środowiskowych, sensowne domyślne wartości, jednolity punkt inicjalizacji na warstwie serwerowej.

2. Budowa payloadu i walidacja wejścia
   - Cel: tworzyć poprawne żądania w oparciu o wiadomości, model, parametry oraz response_format.
   - Wyzwania: nieprawidłowe role wiadomości, błędne parametry modelu, zbyt długie prompty.
   - Rozwiązania: walidacja schematami (np. Zod), limity długości, białe listy dozwolonych pól.

3. Klient HTTP i nagłówki
   - Cel: stabilne wywołania (fetch) z wymaganymi nagłówkami (Authorization, Content‑Type, HTTP‑Referer, X‑Title).
   - Wyzwania: błędy sieciowe, niestabilne połączenia, brak nagłówków identyfikacyjnych.
   - Rozwiązania: timeouty, ponawianie prób, centralne budowanie nagłówków.

4. Retry z backoffem
   - Cel: odporność na 429 i 5xx.
   - Wyzwania: eskalacja opóźnień, granice liczby prób, idempotencja żądań.
   - Rozwiązania: wykładniczy backoff z jitterem, limity prób, ewentualny fallback modelu.

5. Normalizacja odpowiedzi
   - Cel: jednolity kształt wyniku (id, model, treść, powód zakończenia, surowe dane do debugowania).
   - Wyzwania: różnice dostawców, pola opcjonalne, treści filtrowane.
   - Rozwiązania: mapowanie pól, oznaczanie powodów zakończenia, zachowanie surowej odpowiedzi do wglądu.

6. Strumieniowanie (SSE)
   - Cel: obsługa strumieni tokenów i zdarzeń końcowych.
   - Wyzwania: parsowanie zdarzeń, częściowe fragmenty danych, radzenie sobie z błędami w trakcie strumienia.
   - Rozwiązania: buforowanie i dekodowanie, sygnalizacja błędów i zakończenia, agregacja końcowego tekstu.

7. Ustrukturyzowane odpowiedzi (response_format)
   - Cel: wymuszenie JSON zgodnego ze zdefiniowanym schematem.
   - Wyzwania: niedokładne dopasowanie modelu do schematu, błędy parsowania, brakujące pola.
   - Rozwiązania: tryb strict, doprecyzowanie instrukcji w wiadomości systemowej, walidacja wyniku względem schematu, kontrola błędów.

8. Zarządzanie modelami i parametrami
   - Cel: wybór modelu per‑żądanie i bezpieczne parametry (temperature, top_p, max_tokens itp.).
   - Wyzwania: różnice pomiędzy modelami, niedozwolone zakresy, zbyt kosztowne ustawienia.
   - Rozwiązania: białe listy i zakresy, bezpieczne domyślne, dokumentacja wspieranych modeli.

9. Telemetria i logowanie (opcjonalnie)
   - Cel: mierzyć czas, liczbę prób, powód zakończenia; nie przechowywać wrażliwych danych.
   - Wyzwania: prywatność, zgodność z RODO, szumy w danych.
   - Rozwiązania: anonimizacja (np. skrót treści), ograniczona retencja, poziomy logowania.

10. Endpoint proxy (Astro API route)

- Cel: pośredniczyć w wywołaniach z frontendu bez ujawniania sekretu.
- Wyzwania: walidacja wejścia, nadużycia, CORS.
- Rozwiązania: walidacja schematami, throttling/rate‑limit, konfiguracja CORS tylko dla naszych originów.

—

## 2. Opis konstruktora

Lokalizacja: src/lib/services/openrouter.service.ts (TypeScript, aliasy ścieżek). Konstruktor powinien przyjmować konfigurację usługową obejmującą:

- Tajny klucz API (wymagany) oraz adres bazowy usługi (domyślnie publiczny URL OpenRouter).
- Domyślny model i domyślne parametry modelu (temperature, top_p, max_tokens, presence_penalty, frequency_penalty, stop, seed).
- Nazwę aplikacji i publiczny adres witryny do nagłówków identyfikacyjnych (X‑Title, HTTP‑Referer).
- Ustawienie timeoutu wywołań.
- Ustawienia retry (maksymalna liczba prób, bazowe i maksymalne opóźnienie).
- Opcjonalną implementację klienta HTTP i logger.

Wczytywanie wartości powinno następować z bezpiecznych zmiennych środowiskowych i mieć sensowne domyślne wartości. Inicjalizacja tylko po stronie serwera.

—

## 3. Publiczne metody i pola

Lista metod i ich rola (nazwy opisowe, bez implementacji):

1. chat — wywołanie synchroniczne (bez strumieniowania).
   - Wejście: lista wiadomości (co najmniej jedna użytkownika, opcjonalnie systemowa), opcjonalnie nazwa modelu i parametry, opcjonalnie definicja response_format, opcjonalnie metadane i sygnał anulowania.
   - Wyjście: ujednolicony rezultat zawierający identyfikator odpowiedzi, nazwę modelu, złączoną treść asystenta, powód zakończenia oraz surowe dane do debugowania.
   - Walidacja: role wiadomości, dopuszczalne wartości parametrów, limity długości treści.

2. chatJson — wywołanie wymagające ustrukturyzowanej odpowiedzi zgodnej z JSON Schema.
   - Wejście: jak chat, dodatkowo nazwa schematu i treść schematu w formacie JSON Schema (opisowy obiekt schematu; tryb strict włączony).
   - Wyjście: wynik zparsowany do struktury zgodnej ze schematem oraz surowa odpowiedź i metadane (id, model).
   - Walidacja: zgodność z JSON Schema; w razie rozbieżności błąd walidacyjny.

3. chatStream — wywołanie strumieniowe (SSE).
   - Wejście: jak chat, z możliwością otrzymywania kolejnych fragmentów odpowiedzi oraz sygnalizacji zakończenia lub błędu.
   - Wyjście: brak wartości zwrotnej; kanały zwrotnych zdarzeń informują o kolejnych fragmentach, błędach i zakończeniu.
   - Walidacja: jak wyżej; dodatkowo obsługa anulowania.

4. setDefaults — konfiguracja domyślnego modelu i parametrów w trakcie działania usługi.
   - Wejście: nazwa modelu i/lub parametry do ustawienia jako domyślne.
   - Wyjście: brak.

—

## 4. Prywatne metody i pola

Przykładowe elementy wewnętrzne (bez implementacji):

- Pola przechowujące: adres bazowy, klucz API, domyślne ustawienia modelu, referencję do klienta HTTP, logger oraz ustawienia retry.
- Budowa nagłówków: Authorization (Bearer), Content‑Type (application/json), HTTP‑Referer, X‑Title.
- Sklejanie adresów ścieżek (np. do zasobu czatów) w oparciu o adres bazowy.
- Wymuszanie timeoutu przez mechanizm anulowania wywołania.
- Decyzja o ponowieniu na podstawie kodów odpowiedzi (429, 5xx) i konfiguracji retry.
- Wyliczanie opóźnień (wykładniczy backoff z losowym składnikiem dla uniknięcia zatorów).
- Normalizacja odpowiedzi: wyciąganie docelowej treści, modelu, identyfikatora i powodu zakończenia.
- Parsowanie strumienia SSE: dekodowanie, rozpoznawanie porcji danych, agregacja końcowego tekstu, sygnalizacja błędów.
- Składanie payloadu żądania: z wiadomości, wyboru modelu, parametrów i definicji response_format.
- Redakcja/anonimizacja danych do logów (np. skrót treści) w celu ochrony prywatności.

—

## 5. Obsługa błędów

Scenariusze błędów (wraz z kierunkowymi działaniami):

1. Brak lub nieprawidłowy klucz (kody 401/403) — zakończ działanie błędem autoryzacji bez prób ponownych; informuj o konieczności poprawy konfiguracji.
2. Limit zapytań (429) — wykonaj ponowienia do skonfigurowanego limitu z backoffem; rozważ mechanizm fallbacku modelu; informuj o ograniczeniach.
3. Błąd serwerowy dostawcy (5xx) — użyj ponowień z backoffem; loguj identyfikator i nazwę modelu, jeśli dostępne.
4. Błąd walidacji żądania (400) — zakończ błędem schematu; dołącz ograniczony podgląd payloadu (bez danych wrażliwych) w celu debugu.
5. Przekroczony kontekst/tokeny — zakończ błędem limitu kontekstu; zasugeruj skrócenie promptu lub dostosowanie parametrów.
6. Zadziałanie filtra treści — zakończ błędem filtra; zdefiniuj ścieżkę postępowania (np. ponowienie z modyfikacją poleceń).
7. Timeout / błąd sieci — zakończ błędem czasu lub sieci; w trybie strumieniowym natychmiast sygnalizuj przerwanie.
8. Nieparsowalny wynik przy response_format — zakończ błędem parsowania; przekaż surową odpowiedź do analizy (bezpiecznie logowaną).
9. Błąd strumieniowania SSE — przerwij strumień, spróbuj zasygnalizować zakończenie i zgłoś błąd odbiorcy.

Konwencja błędów: jedna klasa bazowa i wyspecjalizowane klasy do autoryzacji, limitów, schematów, długości kontekstu, filtrów treści, timeoutów/sieci oraz parsowania. Mapowanie na kody HTTP w endpointzie proxy: 400, 401, 429, 5xx.

—

## 6. Kwestie bezpieczeństwa

- Przechowuj klucz tylko po stronie serwera; wywołania z przeglądarki zawsze przez własny endpoint proxy.
- Waliduj wszystkie wejścia pochodzące od klienta; stosuj białe listy i limity długości.
- Zaimplementuj rate‑limiting na poziomie endpointu proxy; rozważ dodatkowo mechanizmy anty‑spamowe.
- Nie loguj pełnych treści; używaj anonimizacji (np. skróty) i metadanych technicznych (czas, model, powód zakończenia).
- Konfiguruj CORS na minimalny zestaw originów.
- Ustal bezpieczne domyślne parametry generowania.

—

## 7. Plan wdrożenia krok po kroku

1. Zmienne środowiskowe
   - Dodaj sekrety i ustawienia: klucz API, adres bazowy, domyślny model, timeout, nazwa aplikacji do nagłówka oraz publiczny adres witryny do nagłówka referencyjnego.
   - Upewnij się, że sekret nie jest dostępny po stronie klienta (SSR‑only).

2. Struktura plików
   - Implementacja usługi: src/lib/services/openrouter.service.ts.
   - Definicje błędów i typów (wewnętrznie): w tym samym katalogu lub rozdzielone na pliki, zgodnie z praktykami projektu.
   - Walidacje: src/validation/openrouter.schemas.ts (np. Zod) — opcjonalnie.
   - Endpoint proxy: src/pages/api/openrouter/chat.ts — przyjmuje żądanie od frontendu, wywołuje usługę, zwraca wynik.

3. Inicjalizacja i konfiguracja
   - Zaimplementuj konstruktor, który łączy wartości z konfiguracji i środowiska, ustawia domyślne parametry, tworzy nagłówki identyfikujące aplikację.
   - Zapewnij możliwość ustawiania domyślnego modelu i parametrów w trakcie działania (setDefaults).

4. Walidacja wejścia
   - Zaimplementuj walidację dla listy wiadomości, nazwy modelu, parametrów oraz ewentualnego response_format.
   - Odrzucaj pola nieobsługiwane; stosuj sensowne zakresy wartości.

5. Budowa payloadu i wywołanie HTTP
   - Złóż wiadomości w formacie oczekiwanym przez OpenRouter, uwzględnij wybór modelu i parametrów oraz response_format.
   - Dodaj nagłówki: autoryzacja, zawartość JSON, referer publicznej witryny, tytuł aplikacji.
   - Wymuś timeout poprzez mechanizm anulowania.

6. Obsługa odpowiedzi
   - Znormalizuj odpowiedź do jednolitej postaci (id, model, treść, powód zakończenia, surowe dane).
   - W trybie response_format zweryfikuj zgodność ze schematem; przy błędzie podnieś błąd walidacyjny.

7. Strumieniowanie (SSE)
   - Zaimplementuj parser zdarzeń, który emituje kolejne fragmenty treści, obsługuje sygnał zakończenia i sygnalizuje błędy.
   - Agreguj końcową treść poza kanałem strumieniowym (np. w obsłudze zdarzenia zakończenia).

8. Retry z backoffem
   - Dla kodów 429 i 5xx zastosuj wykładniczy backoff z elementem losowym oraz limitem prób.
   - Po przekroczeniu limitu zwróć czytelną informację o błędzie i rozważ mechanizm fallbacku na inny model (jeśli dostępny).

9. Telemetria i logowanie (opcjonalnie)
   - Zbieraj podstawowe metryki techniczne; treści promptów i odpowiedzi traktuj jako wrażliwe i nie przechowuj wprost.

10. Endpoint proxy

- Waliduj żądanie, mapuj błędy usługi na kody HTTP, ogranicz originy przez CORS, stosuj rate‑limit.

11. Testy i jakości

- Testy ręczne i sanity checks przez uruchomienie środowiska deweloperskiego; przed commitami uruchamiaj lint i formatowanie.

12. Wdrożenie

- Upewnij się, że sekrety są dostarczone przez zmienne środowiskowe; nie są osadzone w kliencie. Adapter Node pozostaje bez zmian.

—

## Konfiguracja żądania — wymagane elementy i przykłady (bez kodu)

1. Komunikat systemowy
   - Przeznaczenie: ramuje zachowanie modelu i styl odpowiedzi.
   - Przykład treści: „Jesteś pomocnym asystentem dla aplikacji do nauki słownictwa. Odpowiadaj zwięźle i rzeczowo.”

2. Komunikat użytkownika
   - Przeznaczenie: zawiera konkretną prośbę i warunki zadania.
   - Przykład treści: „Wygeneruj trzy pary tłumaczeń PL↔EN z tematu podróże. Każda para nie powinna przekraczać ośmiu tokenów.”

3. Ustrukturyzowane odpowiedzi przez response_format
   - Wymagania: użyj formatu z typem json_schema, nazwą schematu, trybem strict oraz kompletną definicją schematu JSON.
   - Przykład opisowy: „Nazwa schematu: DeckPairs; tryb strict: włączony; schemat: obiekt zawierający pole pairs (tablica), gdzie każdy element ma pola l1, l2, type (słowo/zwrot/mini‑fraza), register (neutralny/nieformalny/formalny) oraz source.”

4. Nazwa modelu
   - Przeznaczenie: wskazuje konkretny model OpenRouter; może być domyślny lub dostarczony per‑żądanie.
   - Przykład opisowy: „Model: wariant rodziny Claude 3.5 Sonnet z katalogu OpenRouter.”

5. Parametry modelu
   - Przeznaczenie: sterują charakterem generowania (temperatura, top‑p, limit tokenów itd.).
   - Przykład opisowy: „Temperatura niska (ok. 0,3), top‑p 0,9, maksymalna liczba tokenów 800, bez dodatkowych kar częstotliwości i obecności.”

Powyższe elementy należy zestawić w jednym żądaniu do OpenRouter, pamiętając o odpowiednich nagłówkach identyfikujących aplikację.
