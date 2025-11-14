# Dokumentacja widoku Generowanie - Przewodnik dla laików UI

> **Dla kogo:** Osoby, które nie są ekspertami od React, Shadcn/ui i nowoczesnych frameworków frontendowych.
>
> **Cel:** Zrozumienie jak działa widok generowania i jak go modyfikować.

---

## 📚 Spis treści

1. [Czym jest ten widok?](#czym-jest-ten-widok)
2. [Struktura plików - co gdzie jest?](#struktura-plików)
3. [Jak działa flow użytkownika?](#jak-działa-flow-użytkownika)
4. [Kluczowe koncepty wyjaśnione prosto](#kluczowe-koncepty)
5. [Jak modyfikować widok?](#jak-modyfikować-widok)
6. [FAQ i typowe problemy](#faq-i-typowe-problemy)

---

## Czym jest ten widok?

**Widok Generowanie** (`/generate`) to kreator 3-krokowy, który pozwala użytkownikowi wygenerować 50 par słówek używając AI.

### 🎯 Co robi ten widok krok po kroku:

1. **Krok 1:** Użytkownik wybiera istniejącą talię LUB tworzy nową
   - Jeśli użytkownik nie ma jeszcze talii (onboarding), automatycznie pokazuje formularz tworzenia z domyślnymi językami PL↔EN

2. **Krok 2:** Użytkownik wybiera źródło generacji:
   - Albo wybiera jeden z 20 predefiniowanych tematów (np. "Podróże", "Biznes")
   - Albo wpisuje własny tekst (1-5000 znaków) opisujący kontekst

3. **Krok 3:** Użytkownik dostosowuje parametry:
   - Typ treści (auto/pojedyncze słowa/frazy/krótkie frazy)
   - Rejestr językowy (neutralny/nieformalny/formalny)
   - Widzi swój dzienny limit generacji (quota)

4. **Generacja:** Po kliknięciu "Generuj" następuje:
   - Wywołanie API do generacji
   - Pokazanie overlay z komunikatem "Generowanie w toku..."
   - Przekierowanie do strony talii po sukcesie
   - LUB wyświetlenie błędu (toast notification)

---

## Struktura plików

### 📁 Jak to wszystko jest zorganizowane?

```
src/
├── pages/
│   └── generate.astro           ← GŁÓWNA STRONA (punkt wejścia)
│
└── components/generate/         ← WSZYSTKIE KOMPONENTY WIDOKU
    ├── types.ts                 ← Definicje typów + lista 20 tematów
    ├── utils.ts                 ← Funkcje pomocnicze (walidacja, formatowanie)
    │
    ├── useGenerateWizard.ts     ← MÓZG WIDOKU (cała logika)
    ├── GenerateWizard.tsx       ← KONTENER (łączy wszystko razem)
    │
    ├── StepIndicator.tsx        ← Wskaźnik postępu (1/3, 2/3, 3/3)
    ├── NavigationButtons.tsx    ← Przyciski Wstecz/Dalej/Generuj
    │
    ├── Step1DeckSelection.tsx   ← KROK 1: Wybór talii
    │   ├── DeckPicker.tsx       ← Dropdown z listą talii
    │   └── CreateDeckInline.tsx ← Formularz tworzenia talii
    │
    ├── Step2SourceSelection.tsx ← KROK 2: Źródło generacji
    │   ├── TopicPicker.tsx      ← Siatka 20 tematów
    │   └── TextAreaLimited.tsx  ← Pole tekstowe z licznikiem
    │
    └── Step3Parameters.tsx      ← KROK 3: Parametry
        ├── ParamsSelector.tsx   ← Wybór typu treści i rejestru
        └── QuotaInfo.tsx        ← Wyświetlanie limitu dziennego
```

### 🧩 Jak te pliki ze sobą współpracują?

1. **generate.astro** (Astro) - renderuje stronę HTML i wstawia komponent React
2. **GenerateWizard.tsx** (React) - główny kontener, który:
   - Używa hooka `useGenerateWizard` do zarządzania stanem
   - Pokazuje odpowiedni krok (1, 2 lub 3)
   - Wyświetla przyciski nawigacji
3. **useGenerateWizard.ts** (Custom React Hook) - zarządza:
   - Stanem formularza (który krok, co wybrano, etc.)
   - Wywołaniami API (pobieranie talii, języków, quota, generacja)
   - Walidacją (czy użytkownik może przejść dalej?)
4. **Step1/2/3** (Komponenty kroków) - każdy krok ma swój komponent
5. **Małe komponenty** - każdy element UI ma swój mały komponent (przycisk, dropdown, etc.)

---

## Jak działa flow użytkownika?

### 🔄 Przepływ danych i interakcje

```
                   ┌─────────────────────────┐
                   │   generate.astro        │
                   │   (Astro Page)          │
                   └───────────┬─────────────┘
                               │
                               │ renderuje
                               ▼
                   ┌─────────────────────────┐
                   │  GenerateWizard         │
                   │  (React Container)      │
                   └───────────┬─────────────┘
                               │
                               │ używa
                               ▼
                   ┌─────────────────────────┐
                   │  useGenerateWizard      │
                   │  (Custom Hook)          │
                   │  - stan formularza      │
                   │  - API calls            │
                   │  - walidacja            │
                   └───────────┬─────────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
          ┌─────────┐    ┌─────────┐    ┌─────────┐
          │ Step 1  │    │ Step 2  │    │ Step 3  │
          └─────────┘    └─────────┘    └─────────┘
```

### 🎬 Scenariusz: Nowy użytkownik (onboarding)

1. **Start:** Użytkownik wchodzi na `/generate`
2. **Ładowanie:** Hook pobiera dane z API:
   ```
   GET /api/decks       → pusta lista []
   GET /api/languages   → lista języków
   GET /api/users/me/quota → limit dzienny
   ```
3. **Wykrycie onboardingu:** Hook sprawdza `decks.length === 0`
4. **Auto-wypełnienie:** Hook automatycznie ustawia:
   ```typescript
   {
     lang_a: "Polski (PL)",
     lang_b: "Angielski (EN)",
     visibility: "private"
   }
   ```
5. **Wyświetlenie:** `Step1DeckSelection` pokazuje formularz tworzenia talii
6. **Użytkownik wypełnia:** Tytuł i opis talii
7. **Kliknięcie "Utwórz":**
   ```
   POST /api/decks → nowa talia
   ```
8. **Sukces:** Automatycznie przechodzi do Kroku 2

### 📊 Stan formularza (co jest przechowywane?)

Hook `useGenerateWizard` przechowuje:

```typescript
{
  // Krok 1
  selectedDeckId: "uuid-123",      // Wybrana talia
  createDeckMode: false,           // Czy pokazać formularz tworzenia?

  // Krok 2
  source: "topic",                 // "topic" lub "text"
  selectedTopicId: "travel",       // Wybrany temat (jeśli source="topic")
  text: "",                        // Tekst użytkownika (jeśli source="text")

  // Krok 3
  contentType: "auto",             // Typ treści
  register: "neutral",             // Rejestr

  // UI
  currentStep: 1,                  // Aktualny krok (1, 2, 3)
  isLoading: false,                // Czy coś się ładuje?
  errors: {},                      // Błędy walidacji
}
```

---

## Kluczowe koncepty

### 🎣 Co to jest React Hook?

**Prosta analogia:** Hook to jak "magiczny worek", który przechowuje dane i funkcje.

```typescript
// Zamiast pisać cały kod w komponencie, wyciągamy go do hooka:
const { state, actions } = useGenerateWizard();

// Hook zwraca:
// - state: aktualne dane (jaki krok, co wybrano)
// - actions: funkcje do zmiany danych (goToNextStep, selectTopic, etc.)
```

**Dlaczego to dobre?**

- Kod jest bardziej uporządkowany (logika oddzielona od UI)
- Można łatwo testować logikę
- Łatwiej znaleźć gdzie coś się dzieje

### 🧱 Komponent prezentacyjny vs kontenerowy

**Komponent prezentacyjny** (dump component):

- Tylko wyświetla dane, które dostaje
- Nie wie skąd pochodzą dane
- Przykład: `TopicPicker` - dostaje listę tematów i funkcję `onSelect`

```typescript
// TopicPicker nie wie NIC o API, tylko wyświetla tematy
<TopicPicker
  topics={TOPICS}                    // dostaje listę
  onSelect={(id) => console.log(id)} // dostaje funkcję
/>
```

**Komponent kontenerowy** (smart component):

- Zarządza danymi i logiką
- Wie o API, stanie, walidacji
- Przykład: `GenerateWizard` - wie o wszystkim, koordynuje całość

### 🎨 Shadcn/ui - co to jest?

**Prosta definicja:** Gotowe komponenty UI (przyciski, pola tekstowe, etc.), które można kopiować do projektu.

**Jak to działa:**

```bash
# Instalujesz komponent:
bunx shadcn@latest add button

# Shadcn kopiuje plik do twojego projektu:
src/components/ui/button.tsx

# Teraz możesz go używać:
import { Button } from "@/components/ui/button"
<Button>Kliknij mnie</Button>
```

**Dlaczego to super:**

- ✅ Komponenty są w TWOIM projekcie (nie w node_modules)
- ✅ Możesz je modyfikować jak chcesz
- ✅ Piękne, dostępne (a11y), responsywne out-of-the-box

**Zainstalowane komponenty w tym widoku:**

- `Button` - przyciski
- `Input` - pola tekstowe
- `Textarea` - pole tekstowe wieloliniowe
- `Select` - dropdown (rozwijana lista)
- `RadioGroup` - wybór jednej opcji z wielu
- `Label` - etykiety dla pól formularza
- `Alert` - komunikaty ostrzegawcze
- `Sonner` - toast notifications (małe powiadomienia w rogu ekranu)

### 🔄 useState, useEffect, useCallback - co to?

**useState** - przechowuje dane, które mogą się zmieniać:

```typescript
const [currentStep, setCurrentStep] = useState(1);
// currentStep = 1
setCurrentStep(2);
// currentStep = 2 → komponent się przerenderuje
```

**useEffect** - uruchamia kod po renderowaniu:

```typescript
useEffect(() => {
  // Ten kod uruchomi się po załadowaniu komponentu
  fetchDecks();
  fetchLanguages();
}, []); // [] = uruchom tylko raz
```

**useCallback** - zapamietuje funkcję (optymalizacja):

```typescript
const handleClick = useCallback(() => {
  console.log("Kliknięto!");
}, []); // Funkcja nie zmienia się przy każdym renderze
```

### 🌊 Props - przekazywanie danych

**Co to są props?**
Dane przekazywane do komponentu (jak parametry funkcji).

```typescript
// Definicja komponentu - określa jakie props przyjmuje
interface TopicPickerProps {
  selectedTopicId: TopicID | null;
  onSelect: (topicId: TopicID) => void;
}

// Użycie komponentu - przekazujemy props
<TopicPicker
  selectedTopicId={state.selectedTopicId}
  onSelect={selectTopic}
/>
```

### 📡 API Calls - jak działa komunikacja z backendem?

**Przykład: Pobieranie talii użytkownika**

```typescript
const fetchDecks = async () => {
  // 1. Wysyłamy żądanie HTTP
  const response = await fetch("/api/decks?page=1&limit=100");

  // 2. Sprawdzamy czy OK (status 200)
  if (!response.ok) {
    throw new Error("Nie udało się pobrać talii");
  }

  // 3. Parsujemy JSON
  const data = await response.json();

  // 4. Zapisujemy w stanie
  setDecks(data.decks);
};
```

**Co się dzieje krok po kroku:**

1. Frontend → wysyła żądanie → Backend
2. Backend → pobiera dane z bazy → generuje odpowiedź
3. Backend → wysyła JSON → Frontend
4. Frontend → parsuje JSON → aktualizuje UI

---

## Jak modyfikować widok?

### 🎨 Zmiana wyglądu (styling)

**Wszystkie style to Tailwind CSS** - klasy CSS w atrybutach `className`.

**Przykład: Zmiana koloru przycisku**

Znajdź komponent przycisku:

```typescript
// NavigationButtons.tsx
<Button
  type="button"
  onClick={onSubmit}
  className="min-w-[160px]" // tutaj są style
>
  Generuj pary
</Button>
```

Dodaj klasę Tailwind:

```typescript
className = "min-w-[160px] bg-green-600 hover:bg-green-700";
//            ↑ kolor tła    ↑ kolor po najechaniu
```

**Najczęściej używane klasy Tailwind:**

- `text-lg` - większy tekst
- `font-bold` - pogrubienie
- `bg-blue-500` - tło niebieskie
- `rounded-lg` - zaokrąglone rogi
- `p-4` - padding (odstęp wewnętrzny)
- `mb-4` - margin bottom (odstęp na dole)
- `flex gap-2` - flexbox z odstępem między elementami

### ➕ Dodanie nowego tematu

**Krok 1:** Otwórz `src/components/generate/types.ts`

**Krok 2:** Znajdź `export const TOPICS: TopicOption[] = [`

**Krok 3:** Dodaj nowy temat:

```typescript
{
  id: "animals",                           // unikalny ID
  label: "Zwierzęta",                      // nazwa po polsku
  description: "Nazwy zwierząt domowych i dzikich",  // opis
  icon: "🐶",                              // emoji ikona
},
```

**Krok 4:** Dodaj typ w `src/types.ts`:

```typescript
export type TopicID =
  | "travel"
  | "business"
  // ... inne
  | "animals"; // ← dodaj tutaj
```

**Gotowe!** Nowy temat pojawi się w siatce w Kroku 2.

### 📝 Zmiana tekstu / tłumaczeń

**Przykład: Zmiana tekstu na przycisku**

Znajdź komponent i po prostu zmień tekst:

```typescript
// BYŁO:
<Button>Generuj pary</Button>

// TERAZ:
<Button>Wygeneruj 50 par słówek</Button>
```

**Przykład: Zmiana komunikatu błędu**

W `src/components/generate/utils.ts`:

```typescript
// BYŁO:
if (length < 10) {
  return {
    level: "danger",
    message: "Bardzo mało precyzyjny opis - AI może wygenerować zbyt ogólne pary",
  };
}

// TERAZ:
if (length < 10) {
  return {
    level: "danger",
    message: "Za krótki opis! Napisz przynajmniej 10 znaków, żeby AI wiedziało czego chcesz.",
  };
}
```

### 🔧 Zmiana limitu znaków w tekście

Obecnie limit to 5000 znaków. Jak zmienić na 10000?

**Krok 1:** Zmień w `TextAreaLimited.tsx`:

```typescript
// BYŁO:
maxLength={5000}

// TERAZ:
maxLength={10000}
```

**Krok 2:** Zmień walidację w `utils.ts`:

```typescript
export function validateText(text: string): string | null {
  if (text.length === 0) {
    return "Tekst nie może być pusty";
  }
  if (text.length > 10000) {
    // ← zmień tutaj
    return "Tekst może mieć maksymalnie 10000 znaków"; // ← i tutaj
  }
  return null;
}
```

**Krok 3:** Zmień w backendzie (API) - bo backend też waliduje!

### 🎯 Zmiana domyślnych wartości

**Zmiana domyślnego typu treści (z "auto" na "words"):**

W `src/components/generate/types.ts`:

```typescript
export const DEFAULT_WIZARD_STATE: GenerationWizardState = {
  // ...
  contentType: "words", // ← zmień z "auto" na "words"
  register: "neutral",
  // ...
};
```

**Zmiana domyślnych języków (z PL↔EN na DE↔EN):**

W `src/components/generate/utils.ts`:

```typescript
export function getDefaultLanguages(languages: LanguageDTO[]): {
  langA: string | null;
  langB: string | null;
} {
  const german = languages.find((l) => l.code.toLowerCase() === "de"); // ← zmień "pl" na "de"
  const english = languages.find((l) => l.code.toLowerCase() === "en");

  return {
    langA: german?.id ?? null, // ← zmień polish na german
    langB: english?.id ?? null,
  };
}
```

### 🚀 Dodanie nowego kroku

**Uwaga:** To bardziej zaawansowane, ale przedstawię schemat:

**Krok 1:** Dodaj nowy komponent kroku:

```typescript
// src/components/generate/Step4Additional.tsx
export default function Step4Additional({ ... }) {
  return <div>Nowy krok!</div>;
}
```

**Krok 2:** Dodaj stan w `types.ts`:

```typescript
export interface GenerationWizardState {
  // ... istniejące pola
  newField: string; // ← dodaj nowe pole
}
```

**Krok 3:** Dodaj do `GenerateWizard.tsx`:

```typescript
{state.currentStep === 4 && (
  <Step4Additional {...props} />
)}
```

**Krok 4:** Zaktualizuj logikę walidacji w `useGenerateWizard.ts`

---

## FAQ i typowe problemy

### ❓ Pytanie: "Gdzie zmienić kolory przycisku?"

**Odpowiedź:** W `src/components/ui/button.tsx` lub dodaj klasy Tailwind bezpośrednio:

```typescript
<Button className="bg-red-500 hover:bg-red-600">
  Czerwony przycisk
</Button>
```

### ❓ Pytanie: "Jak dodać nowe pole do formularza tworzenia talii?"

**Odpowiedź:**

1. Dodaj pole w `CreateDeckInline.tsx`
2. Zaktualizuj typ `CreateDeckDTO` w `src/types.ts`
3. Zaktualizuj walidację w `utils.ts`
4. Zaktualizuj backend (API endpoint)

### ❓ Pytanie: "Dlaczego komponent się nie aktualizuje?"

**Możliwe przyczyny:**

1. Zapomniałeś użyć `setState` do zmiany stanu
2. Mutowałeś stan bezpośrednio zamiast tworzyć nową kopię
3. Zależności w `useEffect`/`useCallback` są źle ustawione

**Rozwiązanie:**

```typescript
// ❌ ŹLE:
state.currentStep = 2; // NIE ROBIMY TAK!

// ✅ DOBRZE:
setState((prev) => ({ ...prev, currentStep: 2 }));
```

### ❓ Pytanie: "Jak debugować co się dzieje?"

**Dodaj console.log w kluczowych miejscach:**

```typescript
const handleGenerate = async () => {
  console.log("🚀 START generacji", {
    deckId: state.selectedDeckId,
    source: state.source
  });

  try {
    const result = await generateFromTopic(...);
    console.log("✅ SUKCES", result);
  } catch (error) {
    console.error("❌ BŁĄD", error);
  }
};
```

**Użyj React DevTools:**

- Zainstaluj rozszerzenie "React Developer Tools" w Chrome/Firefox
- Otwórz narzędzia deweloperskie → zakładka "Components"
- Możesz przeglądać wszystkie komponenty i ich props/state

### ❓ Pytanie: "Widok nie ładuje danych z API"

**Sprawdź:**

1. Czy backend jest uruchomiony?
2. Czy użytkownik jest zalogowany? (token w localStorage)
3. Czy endpoint API jest poprawny?
4. Otwórz Console w przeglądarce → czy są błędy?
5. Otwórz Network tab → czy żądania są wysyłane?

**Dodaj error handling:**

```typescript
useEffect(() => {
  fetchDecks().catch((error) => {
    console.error("Błąd ładowania talii:", error);
    toast.error("Nie udało się załadować talii");
  });
}, []);
```

### ❓ Pytanie: "Jak wyłączyć onboarding?"

**Odpowiedź:** Onboarding włącza się automatycznie gdy `decks.length === 0`.

Jeśli chcesz go wyłączyć (zawsze pokazywać wybór talii):

```typescript
// Step1DeckSelection.tsx
// BYŁO:
const [showCreateForm, setShowCreateForm] = useState(isOnboardingFlow);

// TERAZ:
const [showCreateForm, setShowCreateForm] = useState(false); // zawsze false
```

### ❓ Pytanie: "Jak zmienić toast notifications?"

Toast notifications używają biblioteki **Sonner**.

**Zmiana pozycji:**

```typescript
// src/pages/generate.astro
<Toaster position="top-right" /> // domyślnie bottom-right
```

**Zmiana stylu:**

```typescript
toast.success("Sukces!", {
  duration: 5000, // jak długo pokazywać (ms)
  description: "Opis", // dodatkowy tekst
  action: {
    // przycisk akcji
    label: "OK",
    onClick: () => {},
  },
});
```

---

## 📚 Dodatkowe zasoby

### Dokumentacja używanych technologii:

- **React Hooks:** https://react.dev/reference/react
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Shadcn/ui:** https://ui.shadcn.com/docs
- **Astro:** https://docs.astro.build/

### Przydatne narzędzia:

- **Tailwind Play:** https://play.tailwindcss.com/ - testuj klasy Tailwind online
- **React DevTools:** Rozszerzenie do przeglądarki do debugowania React
- **Postman/Insomnia:** Testowanie API endpoints

---

## 🎓 Podsumowanie dla laika

### Co najważniejsze zapamiętać:

1. **Struktura:** Strona Astro → Główny komponent React → Hook z logiką → Małe komponenty UI
2. **Props:** Przekazujemy dane z rodzica do dziecka
3. **State:** Przechowujemy dane, które się zmieniają
4. **Hooks:** "Magiczne worki" na dane i funkcje
5. **Shadcn/ui:** Gotowe komponenty UI w twoim projekcie
6. **Tailwind:** Style CSS jako klasy (np. `bg-blue-500`)

### Jak zacząć modyfikować:

1. **Zacznij od prostych zmian:** tekst, kolory, marginesy
2. **Używaj console.log:** debuguj co się dzieje
3. **Testuj na bieżąco:** `bun dev` i odświeżaj przeglądarkę
4. **Czytaj istniejący kod:** zobacz jak coś jest zrobione i zrób podobnie
5. **Nie bój się eksperymentować:** zawsze możesz cofnąć zmiany (git)

### Złota zasada:

> **Jeśli coś nie działa, NIE PANIKUJ!**
> Przeczytaj komunikat błędu, dodaj console.log, sprawdź dokumentację.
> 90% problemów to literówki lub brakujące importy. 🙂

---

**Pytania? Coś niejasne?** Możesz zawsze wrócić do tej dokumentacji lub przeanalizować kod z console.log! 🚀
