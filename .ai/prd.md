# Dokument wymagań produktu (PRD) - 10x-LinguaPairs

## 1. Przegląd produktu

10x-LinguaPairs to aplikacja webowa (PWA) wspierająca szybką naukę słownictwa poprzez automatyczne generowanie i interaktywną naukę praktycznych par tłumaczeń PL↔EN. Użytkownik podaje temat z predefiniowanej listy lub własny opis, a system tworzy zestaw 30 par (słowa, zwroty, mini-frazy), które można utrwalać w mini-grze łączenia. Postęp śledzony jest w prostym modelu Leitner, a dane-operacje są logowane dla poprawy jakości i kosztów.

## 2. Problem użytkownika

Użytkownicy języków obcych tracą czas na ręczne tworzenie fiszek i mają trudność z utrzymaniem regularnej nauki. Brakuje im:

- Szybkiego sposobu na wygenerowanie spersonalizowanego słownictwa adekwatnego do kontekstu.
- Interaktywnej, angażującej formy utrwalania słów bez monotonii przepisywania.
- Jasnego widoku postępów i możliwości nauki offline.

## 3. Wymagania funkcjonalne

1. Generacja zestawów:
   - 30 par PL↔EN na podstawie tematu (lista 20 kategorii) lub opisu ≤ 5000 znaków.
   - Filtr typu treści: auto | słowa | zwroty | mini-frazy.
   - Przełącznik rejestru: neutralny | nieformalny | formalny.
   - Dokładna deduplikacja, limit ≤ 8 tokenów na stronę pary.
   - „+10” dogenerowuje z wykluczeniem flagged i już znanych par.
   - Możliwość ręcznego dodania słowa i automatycznego tłumaczenia.
2. Kontrakt danych pary: {l1, l2, type, register, source}.
3. Przegląd jakości: widok listy par + akcja „Zgłoś błąd”.
4. Nauka łączeniem:
   - Siatka 2 kolumny (L1/L2), start 2×3 wiersze, skalowalna do 10.
   - Niezależne tasowanie kolumn.
   - Anty-cheat: po błędzie ukrycie jednej poprawnej pary.
5. Tryb Challenge:
   - 3 rundy po 2×5 wierszy.
   - Wynik wpływa na progres Leitner.
6. Model powtórek:
   - Leitner 3-kubkowy (Nowe → Uczę się → Znam).
   - Liczenie % poprawnych połączeń per zestaw i per para.
7. Dostęp i limity:
   - Gość: tylko kuratorowane zestawy.
   - Zalogowany (Supabase): limit 3 generacje/dzień.
8. Offline i cache:
   - PWA przechowuje 10 ostatnich zestawów.
   - Backend cache na kluczu (topic_id/tekst_hash + parametry).
9. Telemetria/logi:
   - Czas generacji, cache-hit, liczba flag, koszt/30 par.
   - Zapis pełnego promptu/kontekstu (SHA tekstu).

## 4. Granice produktu (MVP)

- Brak automatycznego QA-gate i similarity-merge (embeddingi).
- Brak wariantów UK/US.
- Eksport par wyłączony; import CSV po MVP.
- Brak wersjonowania promptów.
- Rozbudowane statystyki w UI oraz A11y/i18n poza minimum.
- Zaawansowana moderacja treści/PII i pełne GDPR do doprecyzowania po MVP.
- Rozszerzone opcje logowania/OAuth i resetu hasła poza MVP.

## 5. Historyjki użytkowników

### US-001: Generacja zestawu z tematu

- **Opis**: Jako zalogowany użytkownik chcę wybrać temat z listy, aby otrzymać 30 par słówek dostosowanych do tematu.
- **Kryteria akceptacji**:
  - a) Wybór dowolnego tematu z listy generuje 30 par w <10 s.
  - b) Paradygmat 60/30/10 słowa/zwroty/mini-frazy.
  - c) Pary spełniają kontrakt danych i ≤8 tokenów na stronę.

### US-002: Generacja z własnego opisu

- **Opis**: Jako zalogowany użytkownik chcę wkleić opis ≤5000 znaków i wygenerować 30 par adekwatnych do kontekstu.
- **Kryteria akceptacji**:
  - a) System akceptuje opis do 5000 znaków.
  - b) Wynik zawiera 30 unikalnych par.

### US-003: Ustawienie rejestru

- **Opis**: Jako użytkownik chcę przełączyć rejestr (neutralny/nieformalny/formalny), aby uzyskać pary w odpowiednim stylu.
- **Kryteria akceptacji**:
  - a) Dostępny przełącznik 3-stanowy.
  - b) Każda wygenerowana para zawiera wybrany register w polu danych.

### US-004: Filtr typu treści

- **Opis**: Jako użytkownik chcę ograniczyć generację tylko do słów, zwrotów lub mini-frazy.
- **Kryteria akceptacji**:
  - a) Widoczny filtr 4 opcji.
  - b) Wynik zawiera wyłącznie wybrany typ(y).

### US-005: Dogenerowanie „+10"

- **Opis**: Jako użytkownik chcę dogenerować 10 dodatkowych par z tego samego promptu bez duplikatów.
- **Kryteria akceptacji**:
  - a) Kliknięcie „+10" dodaje dokładnie 10 nowych par.
  - b) Żadne z 10 nie występuje w bieżącym zestawie ani flagged/znanych.

### US-006: Ręczne dodanie słowa

- **Opis**: Jako użytkownik chcę ręcznie dodać słowo i otrzymać automatyczne tłumaczenie, aby uzupełnić zestaw.
- **Kryteria akceptacji**:
  - a) Formularz dodawania przyjmuje słowo (PL lub EN).
  - b) System generuje brakującą stronę pary i dopisuje do listy.

### US-007: Przegląd i zgłaszanie błędu

- **Opis**: Jako użytkownik chcę przejrzeć listę par i zgłosić błąd w tłumaczeniu.
- **Kryteria akceptacji**:
  - a) Widok listy par przed nauką.
  - b) Każda para ma przycisk „Zgłoś błąd", który oznacza parę jako flagged.

### US-008: Nauka łączeniem podstawowa

- **Opis**: Jako użytkownik chcę łączyć pary w siatce 2×3 i rozszerzać do 10, aby ćwiczyć tłumaczenia.
- **Kryteria akceptacji**:
  - a) Domyślnie widoczne 3 pary (2×3).
  - b) Przycisk „Pokaż więcej" zwiększa o 1 wiersz do maks. 10.
  - c) Połączona poprawnie para jest oznaczana, błędna aktywuje anty-cheat.

### US-009: Anty-cheat

- **Opis**: Jako system chcę po błędzie ukryć jedną poprawną parę i dodać fałszywkę, aby utrudnić losowe klikanie.
- **Kryteria akceptacji**:
  - a) Po każdym błędzie dokładnie jedna para znika, a jedna fałszywka się pojawia.
  - b) Fałszywka nie pokrywa się z istniejącymi parami.

### US-010: Tryb Challenge

- **Opis**: Jako użytkownik chcę zagrać 3 rundy po 10 par (2×5), aby sprawdzić się pod presją czasu.
- **Kryteria akceptacji**:
  - a) Start Trybu Challenge wyświetla timer (domyślnie 60 s, TBC).
  - b) Wynik każdej rundy aktualizuje procent poprawnych par w Leitner.

### US-011: Progres Leitner

- **Opis**: Jako użytkownik chcę widzieć, jak pary przechodzą przez 3 kubki Leitner w oparciu o wyniki, aby śledzić postępy.
- **Kryteria akceptacji**:
  - a) System zapisuje status kubka dla każdej pary.
  - b) Widok postępu pokazuje % w każdym kubku.

### US-012: Limit generacji

- **Opis**: Jako zalogowany użytkownik mogę wygenerować maks. 3 zestawy dziennie.
- **Kryteria akceptacji**:
  - a) Próba czwartej generacji danego dnia zwraca komunikat o limicie.

### US-013: Korzystanie offline

- **Opis**: Jako użytkownik offline chcę korzystać z 10 ostatnich cached setów, aby kontynuować naukę bez internetu.
- **Kryteria akceptacji**:
  - a) Aplikacja otwiera się offline.
  - b) Dostępnych jest maks. 10 zapisanych zestawów.

### US-014: Bezpieczne logowanie

- **Opis**: Jako użytkownik chcę zarejestrować się i zalogować przez Supabase e-mail+hasło, aby mój postęp był synchronizowany.
- **Kryteria akceptacji**:
  - a) Formularz rejestracji i logowania z walidacją hasła.
  - b) Zalogowany stan jest wymagany do generacji i zapisu postępu.

### US-015: Dostęp gościa

- **Opis**: Jako gość chcę natychmiast uczyć się na kuratorowanych zestawach bez rejestracji.
- **Kryteria akceptacji**:
  - a) Strona startowa pokazuje listę predefiniowanych setów.
  - b) Postęp gościa zapisywany lokalnie (localStorage/IndexedDB).

## 6. Metryki sukcesu

1. Funkcjonalne
   - 95 % żądań generuje pełne 30 par w <10 s.
   - ≥90 % poprawnych działań siatki (brak błędów tasowania, anty-cheat).
   - Dokładność obliczeń Leitner ≥99 % (audit log).
   - „+10” bez duplikatów w 99 % przypadków.
   - Ewentualny cache PWA ładuje zestaw offline w <2 s.
2. Operacyjne
   - Średni czas generacji <8 s, 95th percentile <12 s.
   - Cache-hit rate backend ≥40 % po 30 dniach od startu.
   - Średnia liczba flag <0,5 na zestaw.
   - Koszt modeli ≤0,02 USD za 30 par.
3. Użytkowe (mierzone po MVP)
   - Retencja D7 ≥25 % zalogowanych użytkowników.
   - Średnia liczba sesji/tydzień ≥3.
   - Średni wskaźnik „Znam” ≥60 % po 4 tygodniach.
