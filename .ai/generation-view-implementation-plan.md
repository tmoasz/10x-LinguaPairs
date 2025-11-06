# Plan implementacji widoku Generowanie

## 1. Przegląd

Widok **Generowanie** to kreator jednokranowy, który umożliwia zalogowanym użytkownikom utworzenie zestawu 30 par słówek w istniejącej lub nowej talii. Użytkownik przechodzi przez trzy kroki: wybór/utworzenie talii, wybór źródła generacji (temat z predefiniowanej listy lub własny tekst), oraz konfigurację parametrów generacji (typ treści i rejestr). Widok wyświetla informacje o limicie dziennym (quota) i blokuje generację, gdy limit został przekroczony. Po pomyślnym wygenerowaniu następuje przekierowanie do szczegółów talii.

**Główne funkcje:**

- Wybór istniejącej talii lub utworzenie nowej
- Generowanie z tematu (20 predefiniowanych tematów) lub z własnego tekstu (10-5000 znaków)
- Konfiguracja typu treści (auto/words/phrases/mini-phrases) i rejestru (neutral/informal/formal)
- Wyświetlanie i weryfikacja limitu dziennego (3 generacje/dzień)
- Obsługa wszystkich błędów API z odpowiednimi komunikatami
- **Scenariusz onboardingu:** Gdy użytkownik nie ma jeszcze żadnych talii, automatycznie wyświetla się formularz tworzenia nowej talii z domyślnymi wartościami (języki PL↔EN)

**Powiązane historyjki użytkownika:**

- US-001: Generacja zestawu z tematu
- US-002: Generacja z własnego opisu
- US-003: Ustawienie rejestru
- US-004: Filtr typu treści
- US-012: Limit generacji

## 2. Routing widoku

**Ścieżka:** `/generate`

**Komponent strony:** `src/pages/generate.astro`

**Ochrona:** Wymaga uwierzytelnienia (middleware sprawdza `context.locals.user`). W przypadku braku uwierzytelnienia następuje przekierowanie do `/auth/login` z parametrem `redirect=/generate`.

**Renderowanie:**

- Strona Astro z komponentem React `GenerateWizard` jako interaktywną częścią
- Komponenty statyczne (header, footer) mogą być w layoutcie Astro
- Główna logika w komponencie React ze względu na złożoność formularza wieloetapowego

## 3. Struktura komponentów

```
generate.astro (Astro page)
└── GenerateWizard (React component - główny kontener)
    ├── StepIndicator (React component - wskaźnik kroków)
    ├── Step1DeckSelection (React component - krok 1)
    │   ├── DeckPicker (React component)
    │   └── CreateDeckInline (React component)
    ├── Step2SourceSelection (React component - krok 2)
    │   ├── TopicPicker (React component)
    │   └── TextAreaLimited (React component)
    ├── Step3Parameters (React component - krok 3)
    │   ├── ParamsSelector (React component)
    │   └── QuotaInfo (React component)
    └── NavigationButtons (React component - nawigacja między krokami)
```

**Komponenty pomocnicze:**

- `Button` (Shadcn/ui) - przyciski nawigacji i submit
- `Select`, `RadioGroup`, `Textarea` (Shadcn/ui) - elementy formularza
- `Toaster` (Sonner) - wyświetlanie komunikatów błędów i sukcesu
- `Spinner` / `LoadingState` - stany ładowania

## 4. Szczegóły komponentów

### GenerateWizard

**Opis:** Główny komponent kontenerowy zarządzający stanem formularza wieloetapowego, komunikacją z API i nawigacją między krokami.

**Główne elementy:**

- Kontener formularza z `form` elementem
- `StepIndicator` - wyświetlanie aktualnego kroku (1/3, 2/3, 3/3)
- `Step1DeckSelection`, `Step2SourceSelection`, `Step3Parameters` - kolejne kroki
- `NavigationButtons` - przyciski "Wstecz", "Dalej", "Generuj"
- Stan ładowania podczas generacji (overlay z spinnerem)

**Obsługiwane zdarzenia:**

- `onStepChange` - zmiana aktywnego kroku (prev/next)
- `onDeckSelect` - wybór talii z listy
- `onDeckCreate` - utworzenie nowej talii
- `onSourceChange` - zmiana źródła (topic/text)
- `onTopicSelect` - wybór tematu z listy
- `onTextChange` - zmiana tekstu w textarea
- `onContentTypeChange` - zmiana typu treści
- `onRegisterChange` - zmiana rejestru
- `onSubmit` - wysłanie formularza i wywołanie API

**Obsługiwana walidacja:**

- Krok 1: Talia musi być wybrana lub utworzona (walidacja w `CreateDeckInline`)
- Krok 2: Temat musi być wybrany LUB tekst musi mieć 1-5000 znaków
- Krok 3: Parametry mają wartości domyślne, ale są wymagane przed submitem
- Quota: Sprawdzenie przed wysłaniem żądania (jeśli `remaining === 0`, blokada submita)

**Typy:**

- State: `GenerationWizardState` (ViewModel)
- Props: brak (komponent główny)

**Props:** Brak (komponent główny strony)

**Custom hooks:**

- `useGenerateWizard` - zarządzanie stanem formularza, walidacją, wywołaniami API

### StepIndicator

**Opis:** Wskaźnik postępu pokazujący aktualny krok (np. "Krok 1 z 3") i status każdego kroku (ukończony/aktywny/następny).

**Główne elementy:**

- Lista wizualna kroków (1, 2, 3) z ikonami/statusami
- Wskaźnik aktualnego kroku (highlight)
- Opcjonalnie: progress bar

**Obsługiwane zdarzenia:** Brak (komponent prezentacyjny)

**Obsługiwana walidacja:** Brak

**Typy:**

- Props: `{ currentStep: number; totalSteps: number }`

### Step1DeckSelection

**Opis:** Krok 1 - wybór talii lub utworzenie nowej. Użytkownik może wybrać istniejącą talię z listy lub utworzyć nową (tytuł, opis, języki).

**Scenariusz onboardingu (brak talii):**

- Gdy `decks.length === 0`: automatycznie pokazuje się `CreateDeckInline` (bez potrzeby klikania "Utwórz nową talię")
- Formularz jest wstępnie wypełniony domyślnymi wartościami:
  - Tytuł: pusty (użytkownik musi podać)
  - Opis: pusty (użytkownik musi podać)
  - Język A: Polski (PL) - domyślnie pierwszy język z listy, gdzie `code === "pl"`
  - Język B: Angielski (EN) - domyślnie pierwszy język z listy, gdzie `code === "en"`
  - Widoczność: "private" (domyślnie)
- Komunikat pomocniczy: "To będzie Twoja pierwsza talia. Utwórz ją, aby rozpocząć generowanie par słówek."

**Gdy użytkownik ma już talie:**

- `DeckPicker` - lista rozwijana z istniejącymi taliami
- `CreateDeckInline` - formularz ukryty domyślnie, pokazuje się po kliknięciu "Utwórz nową talię"
- Przełącznik między trybem wyboru a tworzenia

**Główne elementy:**

- `DeckPicker` - lista rozwijana z istniejącymi taliami (ukryty gdy `decks.length === 0`)
- `CreateDeckInline` - formularz do utworzenia nowej talii
- Komunikat onboardingu (tylko gdy `decks.length === 0`)

**Obsługiwane zdarzenia:**

- `onDeckSelect` - wybór talii z listy
- `onModeToggle` - przełączenie między trybem wyboru a tworzenia (tylko gdy `decks.length > 0`)
- `onDeckCreate` - utworzenie nowej talii (delegacja do `CreateDeckInline`)

**Obsługiwana walidacja:**

- Talia musi być wybrana LUB utworzona przed przejściem do kroku 2
- Walidacja tworzenia talii w `CreateDeckInline`

**Typy:**

- Props: `{ decks: DeckListItemDTO[]; selectedDeckId: string | null; onDeckSelect: (deckId: string) => void; onDeckCreate: (deck: CreateDeckDTO) => Promise<DeckListItemDTO> }`

### DeckPicker

**Opis:** Lista rozwijana (Select) z istniejącymi taliami użytkownika. Wyświetla tytuł talii, języki i liczbę par.

**Główne elementy:**

- `Select` (Shadcn/ui) z listą talii
- Opcja "Utwórz nową talię" na początku listy
- Opcjonalnie: wyszukiwarka talii (jeśli lista jest długa)
- **Uwaga:** Komponent jest ukryty (`hidden`) gdy `decks.length === 0` (scenariusz onboardingu)

**Obsługiwane zdarzenia:**

- `onChange` - wybór talii z listy
- `onCreateNew` - kliknięcie opcji "Utwórz nową talię" (przełącza do trybu tworzenia)

**Obsługiwana walidacja:** Brak (walidacja na poziomie rodzica)

**Typy:**

- Props: `{ decks: DeckListItemDTO[]; selectedDeckId: string | null; onSelect: (deckId: string) => void; onCreateNew: () => void }`

### CreateDeckInline

**Opis:** Formularz do utworzenia nowej talii (tytuł, opis, język A, język B, widoczność). Wyświetla się po kliknięciu "Utwórz nową talię" LUB automatycznie gdy użytkownik nie ma żadnych talii (onboarding).

**Główne elementy:**

- Pole tekstowe: tytuł (max 200 znaków)
- Pole tekstowe: opis (max 1000 znaków)
- `Select` dla języka A (lista z `/api/languages`)
- `Select` dla języka B (lista z `/api/languages`)
- `Select` dla widoczności (private/public/unlisted, domyślnie private)
- Przycisk "Utwórz" i "Anuluj" (przycisk "Anuluj" jest ukryty w scenariuszu onboardingu)
- Komunikat pomocniczy (tylko w scenariuszu onboardingu): "To będzie Twoja pierwsza talia. Utwórz ją, aby rozpocząć generowanie par słówek."

**Domyślne wartości (onboarding):**

- Tytuł: pusty (wymagane)
- Opis: pusty (wymagane)
- Język A: automatycznie wybrany Polski (PL) - pierwszy język z listy gdzie `code === "pl"`
- Język B: automatycznie wybrany Angielski (EN) - pierwszy język z listy gdzie `code === "en"`
- Widoczność: "private" (domyślnie)

**Obsługiwane zdarzenia:**

- `onSubmit` - utworzenie talii (wywołanie `POST /api/decks`)
- `onCancel` - anulowanie i powrót do wyboru talii (tylko gdy `decks.length > 0`)

**Obsługiwana walidacja:**

- Tytuł: wymagany, 1-200 znaków
- Opis: wymagany, 1-1000 znaków
- Język A i B: wymagane, różne od siebie, poprawne UUID
- Widoczność: enum (private/public/unlisted), domyślnie private

**Typy:**

- Props: `{ languages: LanguageDTO[]; isOnboarding?: boolean; defaultLangA?: string; defaultLangB?: string; onCancel?: () => void; onCreate: (deck: CreateDeckDTO) => Promise<DeckListItemDTO> }`
- State: Lokalny stan formularza z walidacją inline i wstępnie wypełnionymi wartościami (gdy onboarding)

### Step2SourceSelection

**Opis:** Krok 2 - wybór źródła generacji: temat z predefiniowanej listy lub własny tekst. Użytkownik wybiera jedno z dwóch źródeł.

**Główne elementy:**

- `RadioGroup` (Shadcn/ui) z opcjami: "Temat" i "Własny tekst"
- `TopicPicker` - wyświetla się gdy wybrano "Temat"
- `TextAreaLimited` - wyświetla się gdy wybrano "Własny tekst"

**Obsługiwane zdarzenia:**

- `onSourceChange` - zmiana źródła (topic/text)
- `onTopicSelect` - wybór tematu (delegacja do `TopicPicker`)
- `onTextChange` - zmiana tekstu (delegacja do `TextAreaLimited`)

**Obsługiwana walidacja:**

- Jeśli źródło = "topic": temat musi być wybrany
- Jeśli źródło = "text": tekst musi mieć 1-5000 znaków

**Typy:**

- Props: `{ source: "topic" | "text"; selectedTopicId: TopicID | null; text: string; onSourceChange: (source: "topic" | "text") => void; onTopicSelect: (topicId: TopicID) => void; onTextChange: (text: string) => void }`

### TopicPicker

**Opis:** Wybór tematu z listy 20 predefiniowanych tematów. Wyświetla karty lub siatkę tematów z nazwami i opcjonalnie ikonami.

**Główne elementy:**

- Siatka tematów (grid 4 kolumny na desktop, 2 na mobile)
- Karta tematu z nazwą (np. "Travel", "Business")
- Zaznaczenie wybranego tematu (highlight)

**Obsługiwane zdarzenia:**

- `onTopicClick` - kliknięcie tematu

**Obsługiwana walidacja:** Brak

**Typy:**

- Props: `{ selectedTopicId: TopicID | null; onSelect: (topicId: TopicID) => void }`
- Lista tematów: statyczna tablica 20 `TopicID` z etykietami (np. `{ id: "travel", label: "Travel & Tourism" }`)

### TextAreaLimited

**Opis:** Pole tekstowe z limitem znaków (1-5000). Wyświetla licznik znaków i blokuje przekroczenie limitu.

**Główne elementy:**

- `Textarea` (Shadcn/ui) z `maxLength={5000}`
- Licznik znaków (np. "1234 / 5000 znaków")
- Wskaźnik wizualny gdy zbliżamy się do limitu (np. żółty przy >4000, czerwony przy >4800)

**Obsługiwane zdarzenia:**

- `onChange` - zmiana tekstu (z walidacją długości)
- `onInput` - aktualizacja licznika w czasie rzeczywistym

**Obsługiwana walidacja:**

- Tekst: 1-5000 znaków
- Walidacja inline z komunikatem błędów

**Typy:**

- Props: `{ value: string; onChange: (text: string) => void; maxLength?: number }`

### Step3Parameters

**Opis:** Krok 3 - konfiguracja parametrów generacji: typ treści i rejestr. Wyświetla również informacje o quota.

**Główne elementy:**

- `ParamsSelector` - wybór typu treści i rejestru
- `QuotaInfo` - wyświetlanie limitu dziennego i pozostałego quota

**Obsługiwane zdarzenia:**

- `onContentTypeChange` - zmiana typu treści
- `onRegisterChange` - zmiana rejestru

**Obsługiwana walidacja:**

- Parametry mają wartości domyślne, ale są wymagane przed submitem

**Typy:**

- Props: `{ contentType: GenerationContentType; register: GenerationRegister; onContentTypeChange: (type: GenerationContentType) => void; onRegisterChange: (register: GenerationRegister) => void; quota: QuotaDTO | null }`

### ParamsSelector

**Opis:** Wybór typu treści (4 opcje: auto, words, phrases, mini-phrases) i rejestru (3 opcje: neutral, informal, formal).

**Główne elementy:**

- `RadioGroup` dla typu treści z 4 opcjami
- `RadioGroup` dla rejestru z 3 opcjami
- Opcjonalnie: krótkie opisy każdej opcji (tooltip lub tekst pomocniczy)

**Obsługiwane zdarzenia:**

- `onContentTypeChange` - zmiana typu treści
- `onRegisterChange` - zmiana rejestru

**Obsługiwana walidacja:** Brak (wszystkie opcje są poprawne)

**Typy:**

- Props: `{ contentType: GenerationContentType; register: GenerationRegister; onContentTypeChange: (type: GenerationContentType) => void; onRegisterChange: (register: GenerationRegister) => void }`

### QuotaInfo

**Opis:** Wyświetlanie informacji o limicie dziennym generacji (3/dzień) i pozostałym quota. Ostrzeżenie gdy quota = 0.

**Główne elementy:**

- Wyświetlenie: "Użyto dzisiaj: X / 3"
- Wyświetlenie: "Pozostało: Y"
- Ostrzeżenie (alert) gdy `remaining === 0`
- Opcjonalnie: progress bar

**Obsługiwane zdarzenia:** Brak (komponent prezentacyjny)

**Obsługiwana walidacja:** Brak

**Typy:**

- Props: `{ quota: QuotaDTO | null; isLoading?: boolean }`

### NavigationButtons

**Opis:** Przyciski nawigacji między krokami ("Wstecz", "Dalej") oraz przycisk "Generuj" w ostatnim kroku.

**Główne elementy:**

- Przycisk "Wstecz" (ukryty w kroku 1)
- Przycisk "Dalej" (w krokach 1-2)
- Przycisk "Generuj" (w kroku 3, z disabled gdy quota = 0)
- Stan ładowania na przycisku "Generuj" podczas generacji

**Obsługiwane zdarzenia:**

- `onPrevious` - powrót do poprzedniego kroku
- `onNext` - przejście do następnego kroku (z walidacją)
- `onSubmit` - wysłanie formularza

**Obsługiwana walidacja:**

- "Dalej" jest disabled gdy aktualny krok nie jest poprawnie wypełniony
- "Generuj" jest disabled gdy quota = 0

**Typy:**

- Props: `{ currentStep: number; totalSteps: number; canGoNext: boolean; canSubmit: boolean; isLoading: boolean; onPrevious: () => void; onNext: () => void; onSubmit: () => void }`

## 5. Typy

### Typy istniejące (z `src/types.ts`)

**GenerateFromTopicDTO:**

```typescript
interface GenerateFromTopicDTO {
  topic_id: TopicID;
  deck_id: string;
  content_type?: GenerationContentType;
  register?: GenerationRegister;
  exclude_pairs?: string[];
}
```

**GenerateFromTextDTO:**

```typescript
interface GenerateFromTextDTO {
  text: string;
  deck_id: string;
  content_type?: GenerationContentType;
  register?: GenerationRegister;
  exclude_pairs?: string[];
}
```

**GenerationResponseDTO:**

```typescript
interface GenerationResponseDTO {
  generation_id: string;
  deck_id: string;
  pairs_generated: number;
  pairs: GeneratedPairDTO[];
  metadata: GenerationMetadataDTO;
  quota: Pick<QuotaDTO, "used_today" | "remaining">;
}
```

**TopicID:**

```typescript
type TopicID =
  | "travel"
  | "business"
  | "food"
  | "technology"
  | "health"
  | "education"
  | "shopping"
  | "family"
  | "hobbies"
  | "sports"
  | "nature"
  | "culture"
  | "emotions"
  | "time"
  | "weather"
  | "transport"
  | "communication"
  | "home"
  | "work"
  | "emergency";
```

**GenerationContentType:**

```typescript
type GenerationContentType = "auto" | "words" | "phrases" | "mini-phrases";
```

**GenerationRegister:**

```typescript
type GenerationRegister = "neutral" | "informal" | "formal";
```

**DeckListItemDTO:**

```typescript
interface DeckListItemDTO {
  id: string;
  owner_user_id: string;
  title: string;
  description: string;
  lang_a: LanguageRefDTO;
  lang_b: LanguageRefDTO;
  visibility: DeckVisibility;
  pairs_count: number;
  created_at: string;
  updated_at: string;
}
```

**CreateDeckDTO:**

```typescript
interface CreateDeckDTO {
  title: string;
  description: string;
  lang_a: string;
  lang_b: string;
  visibility?: DeckVisibility;
}
```

**QuotaDTO:**

```typescript
interface QuotaDTO {
  daily_limit: number;
  used_today: number;
  remaining: number;
  reset_at: string;
}
```

**LanguageDTO:**

```typescript
type LanguageDTO = Pick<Language, "id" | "code" | "name" | "name_native" | "flag_emoji" | "sort_order">;
```

**ErrorResponseDTO:**

```typescript
interface ErrorResponseDTO {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

### Nowe typy ViewModel (do utworzenia)

**GenerationWizardState:**

```typescript
interface GenerationWizardState {
  // Krok 1: Wybór talii
  selectedDeckId: string | null;
  createDeckMode: boolean;
  newDeck: Partial<CreateDeckDTO> | null;

  // Krok 2: Źródło generacji
  source: "topic" | "text";
  selectedTopicId: TopicID | null;
  text: string;

  // Krok 3: Parametry
  contentType: GenerationContentType;
  register: GenerationRegister;

  // Stan formularza
  currentStep: number;
  isLoading: boolean;
  error: string | null;
  validationErrors: Record<string, string>;
}
```

**TopicOption:**

```typescript
interface TopicOption {
  id: TopicID;
  label: string;
  description?: string;
  icon?: string; // Opcjonalnie: emoji lub nazwa ikony
}
```

**WizardStep:**

```typescript
type WizardStep = 1 | 2 | 3;
```

**ValidationError:**

```typescript
interface ValidationError {
  field: string;
  message: string;
}
```

## 6. Zarządzanie stanem

### Stan komponentu GenerateWizard

Stan zarządzany przez React hooks (`useState`, `useReducer`) w komponencie `GenerateWizard` lub w custom hook `useGenerateWizard`.

**Główne stany:**

1. `currentStep: number` - aktualny krok (1, 2, 3)
2. `selectedDeckId: string | null` - wybrana talia
3. `createDeckMode: boolean` - czy tryb tworzenia talii jest aktywny (automatycznie `true` gdy `decks.length === 0`)
4. `source: "topic" | "text"` - źródło generacji
5. `selectedTopicId: TopicID | null` - wybrany temat
6. `text: string` - tekst użytkownika
7. `contentType: GenerationContentType` - typ treści (domyślnie "auto")
8. `register: GenerationRegister` - rejestr (domyślnie "neutral")
9. `isLoading: boolean` - stan ładowania (quota, decks, generacja)
10. `error: string | null` - ogólny błąd
11. `validationErrors: Record<string, string>` - błędy walidacji per pole
12. `quota: QuotaDTO | null` - informacje o quota
13. `decks: DeckListItemDTO[]` - lista talii użytkownika (pusta lista = onboarding)
14. `languages: LanguageDTO[]` - lista języków (dla tworzenia talii)

### Custom hook: useGenerateWizard

**Cel:** Centralizacja logiki zarządzania stanem, walidacji i wywołań API.

**Zwracane wartości:**

```typescript
{
  state: GenerationWizardState;
  actions: {
    setStep: (step: number) => void;
    selectDeck: (deckId: string) => void;
    toggleCreateDeckMode: () => void;
    setSource: (source: "topic" | "text") => void;
    selectTopic: (topicId: TopicID) => void;
    setText: (text: string) => void;
    setContentType: (type: GenerationContentType) => void;
    setRegister: (register: GenerationRegister) => void;
    validateStep: (step: number) => boolean;
    goToNextStep: () => void;
    goToPreviousStep: () => void;
    createDeck: (deck: CreateDeckDTO) => Promise<void>;
    generate: () => Promise<void>;
  };
  loading: {
    quota: boolean;
    decks: boolean;
    languages: boolean;
    creatingDeck: boolean;
    generating: boolean;
  };
  errors: {
    quota: string | null;
    decks: string | null;
    languages: string | null;
    createDeck: string | null;
    generation: string | null;
    validation: Record<string, string>;
  };
}
```

**Implementacja:**

- `useState` dla wszystkich stanów
- `useEffect` do ładowania quota, decks, languages przy montowaniu
- `useCallback` dla akcji i funkcji walidacji
- `useMemo` dla obliczonych wartości (np. `canGoNext`, `canSubmit`)

### Cache i optymalizacja

- Lista talii i języków może być cache'owana (np. w `localStorage` lub kontekście React)
- Quota powinno być odświeżane przed każdą próbą generacji
- Unikanie niepotrzebnych re-renderów poprzez `React.memo` dla komponentów prezentacyjnych

## 7. Integracja API

### GET /api/users/me/quota

**Wywołanie:** Przy montowaniu komponentu `GenerateWizard` i przed każdą próbą generacji.

**Typ żądania:** `GET /api/users/me/quota`

**Headers:**

```
Authorization: Bearer {access_token}
```

**Typ odpowiedzi:** `QuotaDTO`

**Obsługa błędów:**

- `401 Unauthorized` → przekierowanie do `/auth/login`
- `500 Internal Server Error` → wyświetlenie komunikatu, możliwość retry

**Implementacja:**

```typescript
const fetchQuota = async (): Promise<QuotaDTO> => {
  const response = await fetch("/api/users/me/quota", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch quota: ${response.status}`);
  }
  return response.json();
};
```

### GET /api/decks

**Wywołanie:** Przy montowaniu komponentu `GenerateWizard`.

**Typ żądania:** `GET /api/decks?page=1&limit=100`

**Headers:**

```
Authorization: Bearer {access_token}
```

**Typ odpowiedzi:** `DecksListDTO`

**Obsługa błędów:**

- `401 Unauthorized` → przekierowanie do `/auth/login`
- `500 Internal Server Error` → wyświetlenie komunikatu, możliwość retry

**Implementacja:**

```typescript
const fetchDecks = async (): Promise<DeckListItemDTO[]> => {
  const response = await fetch("/api/decks?page=1&limit=100", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch decks: ${response.status}`);
  }
  const data: DecksListDTO = await response.json();
  return data.decks;
};
```

### GET /api/languages

**Wywołanie:** Przy montowaniu komponentu `GenerateWizard` (tylko gdy `createDeckMode === true` lub lazy load).

**Typ żądania:** `GET /api/languages`

**Headers:** Brak (endpoint publiczny)

**Typ odpowiedzi:** `LanguagesListDTO`

**Obsługa błędów:**

- `500 Internal Server Error` → wyświetlenie komunikatu, możliwość retry

**Implementacja:**

```typescript
const fetchLanguages = async (): Promise<LanguageDTO[]> => {
  const response = await fetch("/api/languages");
  if (!response.ok) {
    throw new Error(`Failed to fetch languages: ${response.status}`);
  }
  const data: LanguagesListDTO = await response.json();
  return data.languages;
};
```

### POST /api/decks

**Wywołanie:** Gdy użytkownik utworzy nową talię w kroku 1.

**Typ żądania:** `POST /api/decks`

**Headers:**

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Body:** `CreateDeckDTO`

**Typ odpowiedzi:** `CreateDeckResponseDTO`

**Obsługa błędów:**

- `401 Unauthorized` → przekierowanie do `/auth/login`
- `422 Unprocessable Entity` → wyświetlenie błędów walidacji inline
- `500 Internal Server Error` → wyświetlenie komunikatu, możliwość retry

**Implementacja:**

```typescript
const createDeck = async (deck: CreateDeckDTO): Promise<DeckListItemDTO> => {
  const response = await fetch("/api/decks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(deck),
  });
  if (!response.ok) {
    const error: ErrorResponseDTO = await response.json();
    throw new Error(error.error.message);
  }
  const data: CreateDeckResponseDTO = await response.json();
  // Konwersja CreateDeckResponseDTO do DeckListItemDTO (mapowanie lang_a, lang_b)
  return mapToDeckListItem(data);
};
```

### POST /api/generate/from-topic

**Wywołanie:** Gdy użytkownik wybierze źródło "topic" i kliknie "Generuj".

**Typ żądania:** `POST /api/generate/from-topic`

**Headers:**

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Body:** `GenerateFromTopicDTO`

**Typ odpowiedzi:** `GenerationResponseDTO`

**Obsługa błędów:**

- `401 Unauthorized` → przekierowanie do `/auth/login`
- `403 Forbidden` → wyświetlenie komunikatu o przekroczonym limicie, blokada przycisku "Generuj"
- `404 Not Found` → wyświetlenie komunikatu, możliwość wyboru innej talii
- `409 Conflict` → wyświetlenie komunikatu o trwającej generacji
- `422 Unprocessable Entity` → wyświetlenie błędów walidacji
- `500 Internal Server Error` → wyświetlenie komunikatu, możliwość retry
- `503 Service Unavailable` → wyświetlenie komunikatu, możliwość retry

**Implementacja:**

```typescript
const generateFromTopic = async (dto: GenerateFromTopicDTO): Promise<GenerationResponseDTO> => {
  const response = await fetch("/api/generate/from-topic", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const error: ErrorResponseDTO = await response.json();
    throw new Error(error.error.message);
  }
  return response.json();
};
```

### POST /api/generate/from-text

**Wywołanie:** Gdy użytkownik wybierze źródło "text" i kliknie "Generuj".

**Typ żądania:** `POST /api/generate/from-text`

**Headers:**

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Body:** `GenerateFromTextDTO`

**Typ odpowiedzi:** `GenerationResponseDTO`

**Obsługa błędów:**

- Wszystkie jak w `POST /api/generate/from-topic`, plus:
- `413 Payload Too Large` → wyświetlenie komunikatu o przekroczeniu limitu 5000 znaków

**Implementacja:**

```typescript
const generateFromText = async (dto: GenerateFromTextDTO): Promise<GenerationResponseDTO> => {
  const response = await fetch("/api/generate/from-text", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const error: ErrorResponseDTO = await response.json();
    throw new Error(error.error.message);
  }
  return response.json();
};
```

### Pobieranie access_token

Token uwierzytelniający powinien być pobierany z Supabase session (np. przez kontekst lub hook `useAuth`). W MVP można użyć `localStorage` lub `sessionStorage`, ale preferowane jest rozwiązanie przez Supabase client.

## 8. Interakcje użytkownika

### Krok 1: Wybór talii

**Scenariusz A: Użytkownik ma już talie (`decks.length > 0`):**

1. **Wybór istniejącej talii:**
   - Użytkownik klika na `DeckPicker` (Select)
   - Wyświetla się lista talii
   - Po wyborze talii → `selectedDeckId` jest ustawiony, przycisk "Dalej" jest enabled

2. **Utworzenie nowej talii:**
   - Użytkownik klika "Utwórz nową talię"
   - `CreateDeckInline` się pokazuje
   - Użytkownik wypełnia formularz (tytuł, opis, języki)
   - Po kliknięciu "Utwórz" → wywołanie `POST /api/decks`
   - Po sukcesie → nowa talia jest dodana do listy i automatycznie wybrana
   - Po błędzie → wyświetlenie błędów walidacji inline

**Scenariusz B: Onboarding - użytkownik nie ma jeszcze talii (`decks.length === 0`):**

1. **Automatyczne wyświetlenie formularza:**
   - `DeckPicker` jest ukryty (brak talii do wyboru)
   - `CreateDeckInline` jest automatycznie widoczny
   - Formularz jest wstępnie wypełniony:
     - Język A: Polski (PL) - domyślnie
     - Język B: Angielski (EN) - domyślnie
     - Widoczność: "private"
   - Komunikat pomocniczy: "To będzie Twoja pierwsza talia. Utwórz ją, aby rozpocząć generowanie par słówek."
   - Przycisk "Anuluj" jest ukryty (nie ma opcji powrotu)

2. **Utworzenie pierwszej talii:**
   - Użytkownik wypełnia tytuł i opis (wymagane)
   - Może zmienić języki (domyślnie PL↔EN)
   - Po kliknięciu "Utwórz" → wywołanie `POST /api/decks`
   - Po sukcesie → nowa talia jest automatycznie wybrana, przycisk "Dalej" jest enabled
   - Po błędzie → wyświetlenie błędów walidacji inline

### Krok 2: Wybór źródła

1. **Wybór tematu:**
   - Użytkownik wybiera opcję "Temat" w `RadioGroup`
   - `TopicPicker` się pokazuje
   - Użytkownik klika na temat (karta)
   - Wybrany temat jest zaznaczony, przycisk "Dalej" jest enabled

2. **Wybór własnego tekstu:**
   - Użytkownik wybiera opcję "Własny tekst" w `RadioGroup`
   - `TextAreaLimited` się pokazuje
   - Użytkownik wpisuje tekst (1-5000 znaków)
   - Licznik znaków aktualizuje się w czasie rzeczywistym
   - Po wpisaniu ≥1 znaku → przycisk "Dalej" jest enabled

### Krok 3: Parametry

1. **Wybór typu treści:**
   - Użytkownik wybiera opcję w `RadioGroup` (auto/words/phrases/mini-phrases)
   - Wartość jest zapisywana w stanie

2. **Wybór rejestru:**
   - Użytkownik wybiera opcję w `RadioGroup` (neutral/informal/formal)
   - Wartość jest zapisywana w stanie

3. **Przegląd quota:**
   - `QuotaInfo` wyświetla informacje o limicie
   - Jeśli `remaining === 0` → przycisk "Generuj" jest disabled, wyświetla się ostrzeżenie

### Generowanie

1. **Kliknięcie "Generuj":**
   - Sprawdzenie walidacji wszystkich kroków
   - Jeśli quota === 0 → blokada, wyświetlenie komunikatu
   - Rozpoczęcie ładowania (spinner, disable przycisków)
   - Wywołanie odpowiedniego endpointu (`POST /api/generate/from-topic` lub `POST /api/generate/from-text`)

2. **Podczas generacji:**
   - Overlay z spinnerem i komunikatem "Generowanie w toku..."
   - Wszystkie przyciski są disabled

3. **Po sukcesie:**
   - Wyświetlenie toast z komunikatem sukcesu
   - Przekierowanie do `/decks/:deckId` (gdzie `deckId` to wybrana talia)

4. **Po błędzie:**
   - Wyświetlenie toast z komunikatem błędu
   - Odblokowanie przycisków, możliwość retry lub poprawy danych

### Nawigacja między krokami

1. **Przycisk "Dalej":**
   - Walidacja aktualnego kroku
   - Jeśli walidacja przechodzi → przejście do następnego kroku
   - Jeśli nie → wyświetlenie błędów walidacji

2. **Przycisk "Wstecz":**
   - Powrót do poprzedniego kroku (bez walidacji)
   - Zachowanie wprowadzonych danych

## 9. Warunki i walidacja

### Walidacja kroku 1 (Wybór talii)

**Warunki:**

- Talia musi być wybrana (`selectedDeckId !== null`) LUB
- Nowa talia musi być utworzona (`createDeckMode === true` i formularz jest poprawnie wypełniony)

**Scenariusz onboardingu (`decks.length === 0`):**

- `createDeckMode` jest automatycznie ustawione na `true`
- Formularz jest automatycznie widoczny
- Domyślne wartości są wstępnie wypełnione (języki PL↔EN)

**Walidacja w `CreateDeckInline`:**

- Tytuł: wymagany, 1-200 znaków
- Opis: wymagany, 1-1000 znaków
- Język A: wymagany, poprawne UUID (domyślnie PL gdy onboarding)
- Język B: wymagany, poprawne UUID, różny od języka A (domyślnie EN gdy onboarding)
- Widoczność: enum (private/public/unlisted), domyślnie private

**Komponenty odpowiedzialne:**

- `Step1DeckSelection` - sprawdza czy talia jest wybrana/utworzona, automatycznie ustawia `createDeckMode = true` gdy `decks.length === 0`
- `CreateDeckInline` - walidacja formularza tworzenia talii, wstępne wypełnienie wartości (onboarding)

**Wpływ na stan interfejsu:**

- Przycisk "Dalej" jest disabled gdy warunki nie są spełnione
- Błędy walidacji są wyświetlane inline pod odpowiednimi polami
- W scenariuszu onboardingu `DeckPicker` jest ukryty, `CreateDeckInline` jest zawsze widoczny

### Walidacja kroku 2 (Źródło generacji)

**Warunki:**

- Jeśli źródło = "topic": `selectedTopicId !== null`
- Jeśli źródło = "text": `text.length >= 1 && text.length <= 5000`

**Komponenty odpowiedzialne:**

- `Step2SourceSelection` - sprawdza warunki w zależności od wybranego źródła
- `TopicPicker` - ustawia `selectedTopicId`
- `TextAreaLimited` - walidacja długości tekstu (maxLength, licznik znaków)

**Wpływ na stan interfejsu:**

- Przycisk "Dalej" jest disabled gdy warunki nie są spełnione
- `TextAreaLimited` wyświetla licznik znaków i ostrzeżenie gdy zbliżamy się do limitu (>4000 znaków)

### Walidacja kroku 3 (Parametry)

**Warunki:**

- `contentType` musi być jednym z: "auto", "words", "phrases", "mini-phrases" (ma wartość domyślną "auto")
- `register` musi być jednym z: "neutral", "informal", "formal" (ma wartość domyślną "neutral")

**Komponenty odpowiedzialne:**

- `ParamsSelector` - ustawia wartości (domyślnie poprawne)

**Wpływ na stan interfejsu:**

- Parametry mają wartości domyślne, więc walidacja zawsze przechodzi
- Przycisk "Generuj" może być disabled tylko z powodu quota === 0

### Walidacja przed generacją

**Warunki:**

- Wszystkie powyższe warunki dla kroków 1-3 muszą być spełnione
- `quota.remaining > 0` (sprawdzenie przed wysłaniem żądania)

**Komponenty odpowiedzialne:**

- `GenerateWizard` - sprawdza wszystkie warunki przed wywołaniem API
- `QuotaInfo` - wyświetla informacje o quota i ostrzeżenie gdy quota === 0

**Wpływ na stan interfejsu:**

- Przycisk "Generuj" jest disabled gdy quota === 0
- Wyświetlenie toast z komunikatem gdy użytkownik próbuje wygenerować bez quota

### Walidacja po stronie API

**Błędy walidacji API (422 Unprocessable Entity):**

- Format: `{ error: { code: "VALIDATION_ERROR", message: "...", details: [{ field: "...", message: "..." }] } }`
- Wyświetlenie błędów inline pod odpowiednimi polami

**Inne błędy API:**

- `401 Unauthorized` → przekierowanie do `/auth/login`
- `403 Forbidden` → wyświetlenie toast z komunikatem o przekroczonym limicie
- `404 Not Found` → wyświetlenie toast z komunikatem, możliwość wyboru innej talii
- `409 Conflict` → wyświetlenie toast z komunikatem o trwającej generacji
- `413 Payload Too Large` → wyświetlenie toast z komunikatem o przekroczeniu limitu 5000 znaków
- `500/503` → wyświetlenie toast z komunikatem, możliwość retry

## 10. Obsługa błędów

### Błędy sieciowe

**Scenariusz:** Brak połączenia z internetem lub timeout żądania.

**Obsługa:**

- Wyświetlenie toast z komunikatem "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."
- Możliwość retry przez użytkownika (przycisk "Spróbuj ponownie")
- Opcjonalnie: wyświetlenie stanu offline w UI

### Błędy uwierzytelniania (401)

**Scenariusz:** Token wygasł lub użytkownik nie jest zalogowany.

**Obsługa:**

- Przekierowanie do `/auth/login?redirect=/generate`
- Wyświetlenie toast z komunikatem "Sesja wygasła. Zaloguj się ponownie."

### Błędy autoryzacji (403)

**Scenariusz:** Przekroczony limit dzienny (quota === 0).

**Obsługa:**

- Wyświetlenie toast z komunikatem "Dzienny limit generacji został przekroczony. Spróbuj ponownie jutro."
- Blokada przycisku "Generuj"
- Opcjonalnie: CTA "Dowiedz się więcej" prowadzące do strony z informacjami o limitach

**Scenariusz:** Użytkownik nie jest właścicielem talii.

**Obsługa:**

- Wyświetlenie toast z komunikatem "Nie masz uprawnień do tej talii."
- Możliwość wyboru innej talii

### Błędy walidacji (422)

**Scenariusz:** Niepoprawne dane w formularzu (np. niepoprawny UUID talii, tekst za długi).

**Obsługa:**

- Wyświetlenie błędów inline pod odpowiednimi polami
- Format: `details: [{ field: "deck_id", message: "Invalid deck UUID" }]`
- Komponenty formularza wyświetlają błędy pod polami

### Błędy nieznalezienia (404)

**Scenariusz:** Talia nie istnieje lub została usunięta.

**Obsługa:**

- Wyświetlenie toast z komunikatem "Talia nie została znaleziona."
- Powrót do kroku 1 z możliwością wyboru innej talii

### Błędy konfliktu (409)

**Scenariusz:** Inna generacja jest w toku.

**Obsługa:**

- Wyświetlenie toast z komunikatem "Inna generacja jest w toku. Poczekaj na zakończenie."
- Możliwość retry po kilku sekundach

### Błędy payload too large (413)

**Scenariusz:** Tekst przekracza 5000 znaków (powinno być zablokowane przez `TextAreaLimited`, ale może być obchodzone).

**Obsługa:**

- Wyświetlenie toast z komunikatem "Tekst jest za długi. Maksymalna długość to 5000 znaków."
- Powrót do kroku 2 z możliwością skrócenia tekstu

### Błędy serwera (500, 503)

**Scenariusz:** Błąd po stronie serwera lub niedostępność usługi AI.

**Obsługa:**

- Wyświetlenie toast z komunikatem "Wystąpił błąd serwera. Spróbuj ponownie za chwilę."
- Możliwość retry przez użytkownika (przycisk "Spróbuj ponownie")
- Opcjonalnie: logowanie błędów do systemu telemetrii

### Błędy walidacji formularza (frontend)

**Scenariusz:** Użytkownik próbuje przejść do następnego kroku bez wypełnienia wymaganych pól.

**Obsługa:**

- Wyświetlenie błędów walidacji inline
- Podświetlenie pól z błędami (czerwona ramka)
- Komunikaty błędów pod polami
- Przycisk "Dalej" pozostaje disabled

### Obsługa błędów podczas tworzenia talii

**Scenariusz:** Błąd podczas wywołania `POST /api/decks`.

**Obsługa:**

- Wyświetlenie błędów walidacji inline w `CreateDeckInline`
- Jeśli błąd 409 (duplikat) → komunikat "Talia o takim tytule już istnieje."
- Jeśli błąd 500 → komunikat "Nie udało się utworzyć talii. Spróbuj ponownie."
- Formularz pozostaje otwarty, możliwość poprawy danych

### Ogólne zasady obsługi błędów

1. **Komunikaty błędów:**
   - Użyteczne i zrozumiałe dla użytkownika
   - Nie techniczne (nie wyświetlamy stack trace)
   - W języku polskim

2. **Toast notifications:**
   - Użycie Sonner (`toast.error()`, `toast.success()`)
   - Automatyczne zamykanie po 5 sekundach
   - Możliwość ręcznego zamknięcia

3. **Stany ładowania:**
   - Spinner podczas ładowania danych
   - Overlay podczas generacji (blokuje interakcję)
   - Disable przycisków podczas operacji

4. **Retry:**
   - Możliwość retry dla błędów sieciowych i serwerowych
   - Opcjonalnie: automatyczny retry z exponential backoff dla błędów 503

## 11. Kroki implementacji

### Faza 1: Przygotowanie struktury i typów

**Krok 1.1: Utworzenie pliku strony Astro**

- [ ] Utworzyć `src/pages/generate.astro`
- [ ] Zaimplementować podstawowy layout z importem komponentu React `GenerateWizard`
- [ ] Dodać ochronę trasy (middleware sprawdza `context.locals.user`)

**Krok 1.2: Utworzenie typów ViewModel**

- [ ] Utworzyć plik `src/components/generate/types.ts`
- [ ] Zdefiniować `GenerationWizardState`, `TopicOption`, `ValidationError`
- [ ] Utworzyć mapę tematów (20 tematów z etykietami)

**Krok 1.3: Utworzenie utility functions**

- [ ] Utworzyć plik `src/components/generate/utils.ts`
- [ ] Zaimplementować funkcje pomocnicze (walidacja, mapowanie danych)

### Faza 2: Komponenty prezentacyjne

**Krok 2.1: StepIndicator**

- [ ] Utworzyć `src/components/generate/StepIndicator.tsx`
- [ ] Zaimplementować wizualny wskaźnik kroków (1/3, 2/3, 3/3)
- [ ] Dodać style Tailwind

**Krok 2.2: TopicPicker**

- [ ] Utworzyć `src/components/generate/TopicPicker.tsx`
- [ ] Zaimplementować siatkę tematów (grid)
- [ ] Dodać obsługę kliknięcia i zaznaczenia tematu
- [ ] Dodać style Tailwind

**Krok 2.3: TextAreaLimited**

- [ ] Utworzyć `src/components/generate/TextAreaLimited.tsx`
- [ ] Użyć `Textarea` z Shadcn/ui
- [ ] Zaimplementować licznik znaków (1-5000)
- [ ] Dodać wskaźniki wizualne (żółty >4000, czerwony >4800)

**Krok 2.4: QuotaInfo**

- [ ] Utworzyć `src/components/generate/QuotaInfo.tsx`
- [ ] Wyświetlić informacje o quota (użyto dzisiaj, pozostało)
- [ ] Dodać ostrzeżenie gdy quota === 0
- [ ] Opcjonalnie: progress bar

**Krok 2.5: ParamsSelector**

- [ ] Utworzyć `src/components/generate/ParamsSelector.tsx`
- [ ] Użyć `RadioGroup` z Shadcn/ui dla typu treści (4 opcje)
- [ ] Użyć `RadioGroup` z Shadcn/ui dla rejestru (3 opcje)
- [ ] Dodać krótkie opisy każdej opcji (tooltip lub tekst pomocniczy)

**Krok 2.6: NavigationButtons**

- [ ] Utworzyć `src/components/generate/NavigationButtons.tsx`
- [ ] Zaimplementować przyciski "Wstecz", "Dalej", "Generuj"
- [ ] Dodać logikę disabled/enabled w zależności od stanu
- [ ] Dodać stan ładowania na przycisku "Generuj"

### Faza 3: Komponenty formularza

**Krok 3.1: DeckPicker**

- [ ] Utworzyć `src/components/generate/DeckPicker.tsx`
- [ ] Użyć `Select` z Shadcn/ui
- [ ] Wyświetlić listę talii z tytułem, językami, liczbą par
- [ ] Dodać opcję "Utwórz nową talię" na początku listy

**Krok 3.2: CreateDeckInline**

- [ ] Utworzyć `src/components/generate/CreateDeckInline.tsx`
- [ ] Zaimplementować formularz (tytuł, opis, język A, język B, widoczność)
- [ ] **Dodać obsługę onboardingu:** prop `isOnboarding` i `defaultLangA/defaultLangB`
- [ ] **Wstępne wypełnienie wartości:** gdy onboarding, automatycznie wybrać PL i EN z listy języków
- [ ] Dodać walidację inline (Zod schema lub ręczna)
- [ ] Wyświetlić błędy walidacji pod polami
- [ ] Dodać przyciski "Utwórz" i "Anuluj" (przycisk "Anuluj" ukryty gdy `isOnboarding === true`)
- [ ] Dodać komunikat pomocniczy dla onboardingu

**Krok 3.3: Step1DeckSelection**

- [ ] Utworzyć `src/components/generate/Step1DeckSelection.tsx`
- [ ] Zintegrować `DeckPicker` i `CreateDeckInline`
- [ ] **Zaimplementować logikę onboardingu:** gdy `decks.length === 0`, automatycznie ustawić `createDeckMode = true` i ukryć `DeckPicker`
- [ ] Dodać przełącznik między trybem wyboru a tworzenia (tylko gdy `decks.length > 0`)
- [ ] Zarządzać stanem wybranej talii
- [ ] Dodać komunikat pomocniczy dla onboardingu

**Krok 3.4: Step2SourceSelection**

- [ ] Utworzyć `src/components/generate/Step2SourceSelection.tsx`
- [ ] Zaimplementować `RadioGroup` z opcjami "Temat" i "Własny tekst"
- [ ] Warunkowo renderować `TopicPicker` lub `TextAreaLimited`
- [ ] Zarządzać stanem źródła, tematu i tekstu

**Krok 3.5: Step3Parameters**

- [ ] Utworzyć `src/components/generate/Step3Parameters.tsx`
- [ ] Zintegrować `ParamsSelector` i `QuotaInfo`
- [ ] Zarządzać stanem typu treści i rejestru

### Faza 4: Custom hook i zarządzanie stanem

**Krok 4.1: Utworzenie custom hook**

- [ ] Utworzyć `src/components/generate/useGenerateWizard.ts`
- [ ] Zaimplementować `useState` dla wszystkich stanów
- [ ] Zaimplementować `useEffect` do ładowania quota, decks, languages
- [ ] Zaimplementować funkcje akcji (setStep, selectDeck, etc.)
- [ ] Zaimplementować funkcje walidacji (validateStep, canGoNext, canSubmit)

**Krok 4.2: Funkcje API**

- [ ] Dodać funkcję `fetchQuota()` do hooka
- [ ] Dodać funkcję `fetchDecks()` do hooka
- [ ] Dodać funkcję `fetchLanguages()` do hooka
- [ ] Dodać funkcję `createDeck()` do hooka
- [ ] Dodać funkcję `generateFromTopic()` do hooka
- [ ] Dodać funkcję `generateFromText()` do hooka
- [ ] Dodać obsługę błędów dla każdej funkcji

### Faza 5: Główny komponent GenerateWizard

**Krok 5.1: Struktura komponentu**

- [ ] Utworzyć `src/components/generate/GenerateWizard.tsx`
- [ ] Zaimportować wszystkie komponenty kroków
- [ ] Zaimportować `useGenerateWizard` hook
- [ ] Utworzyć strukturę JSX z `StepIndicator` i krokami

**Krok 5.2: Integracja z hookiem**

- [ ] Wywołać `useGenerateWizard()` w komponencie
- [ ] Przekazać state i actions do komponentów dzieci
- [ ] Zaimplementować obsługę zdarzeń (onStepChange, onSubmit, etc.)

**Krok 5.3: Obsługa generacji**

- [ ] Zaimplementować funkcję `handleGenerate()`
- [ ] Sprawdzić walidację przed wysłaniem
- [ ] Wywołać odpowiedni endpoint (`from-topic` lub `from-text`)
- [ ] Obsłużyć sukces (toast + redirect)
- [ ] Obsłużyć błędy (toast + wyświetlenie błędów)

**Krok 5.4: Stany ładowania**

- [ ] Dodać overlay ze spinnerem podczas generacji
- [ ] Disable przycisków podczas operacji
- [ ] Wyświetlić komunikaty ładowania

### Faza 6: Integracja z Astro

**Krok 6.1: Integracja strony Astro**

- [ ] Zaktualizować `src/pages/generate.astro`
- [ ] Dodać import `GenerateWizard` z flagą `client:load`
- [ ] Dodać layout (header, footer jeśli potrzebne)
- [ ] Dodać `Toaster` (Sonner) dla toast notifications

**Krok 6.2: Ochrona trasy**

- [ ] Sprawdzić czy middleware chroni trasę `/generate`
- [ ] Dodać przekierowanie do `/auth/login?redirect=/generate` gdy brak uwierzytelnienia

### Faza 7: Obsługa błędów i walidacja

**Krok 7.1: Obsługa błędów API**

- [ ] Zaimplementować obsługę wszystkich kodów błędów (401, 403, 404, 409, 413, 422, 500, 503)
- [ ] Dodać toast notifications dla każdego typu błędu
- [ ] Dodać przekierowania gdzie potrzebne (401 → login)

**Krok 7.2: Walidacja formularza**

- [ ] Zaimplementować walidację kroku 1 (talia)
- [ ] Zaimplementować walidację kroku 2 (źródło)
- [ ] Zaimplementować walidację kroku 3 (parametry)
- [ ] Wyświetlić błędy walidacji inline

**Krok 7.3: Walidacja quota**

- [ ] Sprawdzić quota przed każdą próbą generacji
- [ ] Blokada przycisku "Generuj" gdy quota === 0
- [ ] Wyświetlenie ostrzeżenia w `QuotaInfo`

### Faza 8: Styling i UX

**Krok 8.1: Styling Tailwind**

- [ ] Dodać style do wszystkich komponentów
- [ ] Zaimplementować responsive design (mobile-first)
- [ ] Dodać focus rings dla dostępności
- [ ] Dodać hover states dla interaktywnych elementów

**Krok 8.2: Accessibility (A11y)**

- [ ] Dodać `aria-label` do przycisków
- [ ] Dodać `aria-describedby` dla pól z błędami
- [ ] Dodać keyboard navigation (Tab, Enter, Escape)
- [ ] Dodać focus management przy przejściach między krokami

**Krok 8.3: Animacje i przejścia**

- [ ] Dodać smooth transitions między krokami (opcjonalnie)
- [ ] Respektować `prefers-reduced-motion`
- [ ] Dodać loading states (skeleton, spinner)

### Faza 9: Testy i optymalizacja

**Krok 9.1: Testy manualne**

- [ ] Test 1: Wybór istniejącej talii → generacja z tematu → sukces
- [ ] Test 2: Utworzenie nowej talii → generacja z tekstu → sukces
- [ ] Test 3: Walidacja kroków (próba przejścia bez wypełnienia)
- [ ] Test 4: Obsługa błędów (401, 403, 404, 422, 500)
- [ ] Test 5: Quota === 0 → blokada generacji
- [ ] Test 6: Tekst >5000 znaków → walidacja i blokada
- [ ] Test 7: Responsive design (mobile, tablet, desktop)

**Krok 9.2: Optymalizacja**

- [ ] Sprawdzić re-rendery (React DevTools)
- [ ] Dodać `React.memo` dla komponentów prezentacyjnych
- [ ] Optymalizować `useCallback` i `useMemo` w hooku
- [ ] Sprawdzić rozmiar bundle (opcjonalnie: code splitting)

**Krok 9.3: Linting i formatowanie**

- [ ] Uruchomić `bun run lint:fix`
- [ ] Uruchomić `bun run format`
- [ ] Naprawić wszystkie błędy lintowania

### Faza 10: Dokumentacja i finalizacja

**Krok 10.1: Dokumentacja kodu**

- [ ] Dodać komentarze JSDoc do funkcji API
- [ ] Dodać komentarze do złożonych fragmentów kodu
- [ ] Udokumentować custom hook

**Krok 10.2: Finalizacja**

- [ ] Przetestować pełny flow end-to-end
- [ ] Sprawdzić wszystkie edge cases
- [ ] Zaktualizować dokumentację projektu (jeśli potrzebne)

**Krok 10.3: Code review checklist**

- [ ] Wszystkie komponenty są zgodne z wzorcami projektu
- [ ] Wszystkie typy są zdefiniowane i używane poprawnie
- [ ] Obsługa błędów jest kompletna
- [ ] Accessibility jest zaimplementowana
- [ ] Responsive design działa na wszystkich urządzeniach
