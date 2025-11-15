# Plan implementacji: Widok decków jako główny hub (MVP)

## 1. Przegląd i cel

**Cel biznesowy**: Stworzyć główny hub aplikacji (`/decks`), który będzie centralnym miejscem dla zalogowanych użytkowników. Wszystkie akcje (przegląd par, Challenge, Nauka, statystyki) będą dostępne w odniesieniu do wybranego decka.

**Kluczowe założenia (z odpowiedzi użytkownika)**:

1. **Widok z comboboxem**: Analogiczny do widoku generacji - używa `DeckPicker` do wyboru decka
2. **Auto-wybór ostatniego decka**: Sortowanie decków po `updated_at` (desc) - pierwszy deck z listy jest najnowszy
3. **Wydzielenie DeckPicker**: Komponent UI do wspólnego użycia
4. **Redirect przy braku decków**: Do `/generate` z CTA

## 2. Architektura rozwiązania

### 2.1. Struktura stron i routingu

```
/decks                    - główny hub (lista decków + wybrany deck z parami)
/decks?auto-select=true   - auto-wybór ostatniego decka
/decks?deck=:id           - wybór konkretnego decka
/decks/:id                - deep link do konkretnego decka (opcjonalnie, redirect do /decks?deck=:id)
```

### 2.2. Komponenty

**Wydzielone/wspólne:**

- `DeckPicker` - przeniesiony do `src/components/decks/DeckPicker.tsx` (wspólny dla generation i decks view)
- `DeckDetailView` - już istnieje w `src/components/decks/DeckDetailView.tsx`, rozszerzyć o akcje

**Nowe:**

- `DeckHubView` - główny komponent strony `/decks` (zawiera DeckPicker + DeckDetailView + akcje)
- `DeckActions` - komponent z przyciskami akcji (Learn, Challenge, Progress, Generate more)

### 2.3. Endpointy API

**Używane:**

- `GET /api/decks` - lista decków użytkownika
- `GET /api/decks/:id` - szczegóły decka
- `GET /api/decks/:id/pairs` - lista par w decku
- `PATCH /api/decks/:id` - aktualizacja decka
- `POST /api/decks/:id/pairs/:pairId/flag` - flagowanie pary

## 3. Szczegółowy plan implementacji

### Faza 1: Wydzielenie i refaktoryzacja DeckPicker

**Cel**: Przenieść `DeckPicker` do wspólnego miejsca, aby był dostępny zarówno w widoku generacji, jak i w widoku decków.

**Kroki:**

1. **Przeniesienie komponentu**
   - Z: `src/components/generate/DeckPicker.tsx`
   - Do: `src/components/decks/DeckPicker.tsx`
   - Aktualizacja importów w `src/components/generate/Step1DeckSelection.tsx`

2. **Ewentualne rozszerzenia**
   - Dodać prop `showCreateNew?: boolean` (domyślnie `true`)
   - Dodać prop `placeholder?: string` (domyślnie "Wybierz talię...")
   - Zachować obecną funkcjonalność

**Pliki do modyfikacji:**

- `src/components/generate/DeckPicker.tsx` → przenieść do `src/components/decks/DeckPicker.tsx`
- `src/components/generate/Step1DeckSelection.tsx` → zaktualizować import

### Faza 2: Auto-wybór ostatniego decka (zrealizowane)

**Cel**: Automatyczny wybór ostatnio używanego decka bez dodatkowego endpointu.

**Rozwiązanie**: Zamiast osobnego endpointu `/api/decks/last-used`, używamy sortowania decków po `updated_at` w istniejącym endpoincie `GET /api/decks`.

**Implementacja w DeckHubView:**

- Pobieranie decków z sortowaniem: `GET /api/decks?limit=100&sort=updated_at&order=desc`
- Pierwszy deck z listy jest automatycznie najnowszy (najwyższy `updated_at`)
- Gdy `autoSelectLast = true`, wybieramy `decks[0]?.id`

**Zalety:**

- Brak dodatkowego endpointu (prostsze API)
- Mniej requestów HTTP (jeden zamiast dwóch)
- `updated_at` jest dobrym proxy dla "ostatnio użytego" (decki są aktualizowane przy przeglądaniu/flagowaniu par)

### Faza 3: Strona `/decks` - główny hub

**Plik**: `src/pages/decks/index.astro` (lub `src/pages/decks.astro`)

**Funkcjonalność SSR:**

- Sprawdź czy użytkownik jest zalogowany (middleware już to robi)
- Sprawdź query params: `?auto-select=true` lub `?deck=:id`
- Jeśli `?deck=:id`: użyj tego decka jako `initialDeckId`
- Jeśli `auto-select=true` lub brak parametrów: przekaż `autoSelectLast={true}` do komponentu
- Komponent React sam wybierze pierwszy deck z posortowanej listy

**Implementacja:**

```astro
---
// src/pages/decks/index.astro
import Layout from "@/layouts/Layout.astro";
import DeckHubView from "@/components/decks/DeckHubView";

export const prerender = false;

const user = Astro.locals.user;
if (!user || !user.id) {
  return Astro.redirect(`/auth/login?redirect=${encodeURIComponent("/decks")}`);
}

const url = new URL(Astro.request.url);
const deckIdParam = url.searchParams.get("deck");
const autoSelectQuery = url.searchParams.get("auto-select") === "true";
const shouldAutoSelect = autoSelectQuery || !deckIdParam;
---

<Layout title="Moje talie — LinguaPairs">
  <main class="min-h-screen bg-background">
    <div class="mx-auto w-full max-w-5xl px-4 py-10">
      <DeckHubView initialDeckId={deckIdParam ?? null} autoSelectLast={shouldAutoSelect} client:only="react" />
    </div>
  </main>
</Layout>
```

### Faza 4: Komponent DeckHubView

**Plik**: `src/components/decks/DeckHubView.tsx`

**Funkcjonalność:**

- Wyświetla `DeckPicker` na górze (combobox do wyboru decka)
- Wyświetla `DeckDetailView` dla wybranego decka
- Wyświetla `DeckActions` z przyciskami akcji
- Obsługuje pusty stan (brak decków) z CTA do `/generate`
- Obsługuje loading state podczas pobierania decków
- Auto-wybór ostatniego decka na podstawie sortowania po `updated_at`

**Struktura:**

```typescript
interface DeckHubViewProps {
  initialDeckId?: string | null;
  autoSelectLast?: boolean;
}

export default function DeckHubView({ initialDeckId = null, autoSelectLast = false }: DeckHubViewProps) {
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(initialDeckId ?? null);
  const [decks, setDecks] = useState<DeckListItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pobierz listę decków z sortowaniem po updated_at
  const fetchDecks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Sort by updated_at desc to get most recently used decks first
      const response = await fetch("/api/decks?limit=100&sort=updated_at&order=desc");
      const data: DecksListDTO = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message ?? "Nie udało się wczytać talii.");
      }
      setDecks(data.decks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się wczytać talii.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDecks();
  }, [fetchDecks]);

  // Auto-wybór decka
  useEffect(() => {
    if (decks.length === 0) {
      setSelectedDeckId(null);
      return;
    }
    if (selectedDeckId && decks.some((deck) => deck.id === selectedDeckId)) {
      return;
    }

    let nextId: string | null = null;

    if (initialDeckId && decks.some((deck) => deck.id === initialDeckId)) {
      nextId = initialDeckId;
    } else if (autoSelectLast) {
      // Decks are already sorted by updated_at desc, so first deck is the most recently used
      nextId = decks[0]?.id ?? null;
    }

    if (!nextId) {
      nextId = decks[0]?.id ?? null;
    }

    setSelectedDeckId(nextId);
  }, [decks, selectedDeckId, initialDeckId, autoSelectLast]);

  // ... reszta komponentu (pusty stan, loading, error, render) ...
}
```

### Faza 5: Komponent DeckActions

**Plik**: `src/components/decks/DeckActions.tsx`

**Funkcjonalność:**

- Przyciski akcji dla wybranego decka:
  - **Nauka** → `/learn/user/:deckId`
  - **Challenge** → `/challenge/user/:deckId`
  - **Progres** → `/decks/:deckId/progress` (lub modal)
  - **Generuj więcej** → `/generate?deck=:deckId`

**Implementacja:**

```typescript
import { BookOpen, Trophy, TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeckActionsProps {
  deckId: string;
}

export default function DeckActions({ deckId }: DeckActionsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        asChild
        variant="default"
        className="flex items-center gap-2"
      >
        <a href={`/learn/user/${deckId}`}>
          <BookOpen className="w-4 h-4" />
          Nauka
        </a>
      </Button>

      <Button
        asChild
        variant="default"
        className="flex items-center gap-2"
      >
        <a href={`/challenge/user/${deckId}`}>
          <Trophy className="w-4 h-4" />
          Challenge
        </a>
      </Button>

      <Button
        asChild
        variant="outline"
        className="flex items-center gap-2"
      >
        <a href={`/decks/${deckId}/progress`}>
          <TrendingUp className="w-4 h-4" />
          Progres
        </a>
      </Button>

      <Button
        asChild
        variant="outline"
        className="flex items-center gap-2"
      >
        <a href={`/generate?deck=${deckId}`}>
          <Plus className="w-4 h-4" />
          Generuj więcej
        </a>
      </Button>
    </div>
  );
}
```

### Faza 6: Redirect logic po zalogowaniu

**Miejsce 1: Middleware** (`src/middleware/index.ts`)

**Logika:**

- Jeśli użytkownik jest zalogowany i trafia na `/`:
  - Sprawdź czy ma decki
  - Jeśli ma → redirect do `/decks?auto-select=true`
  - Jeśli nie ma → redirect do `/generate`

**Implementacja:**

```typescript
// W middleware/index.ts, po sprawdzeniu user
if (user && url.pathname === "/") {
  // Sprawdź czy użytkownik ma decki
  const { data: decks } = await supabase
    .from("decks")
    .select("id")
    .eq("owner_user_id", user.id)
    .is("deleted_at", null)
    .limit(1);

  if (decks && decks.length > 0) {
    return redirect("/decks?auto-select=true");
  } else {
    return redirect("/generate");
  }
}
```

**Miejsce 2: LoginForm** (`src/components/auth/LoginForm.tsx`)

**Logika:**

- Po udanym logowaniu:
  - Jeśli `redirect` param istnieje → użyj go
  - W przeciwnym razie → sprawdź czy użytkownik ma decki
  - Jeśli ma → redirect do `/decks?auto-select=true`
  - Jeśli nie ma → redirect do `/generate`

**Implementacja:**

```typescript
// W LoginForm.tsx, po udanym logowaniu
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  // ... logika logowania ...

  if (success) {
    // Sprawdź redirect param
    const urlParams = new URLSearchParams(window.location.search);
    const redirectParam = urlParams.get("redirect");

    if (redirectParam && redirectParam.startsWith("/")) {
      window.location.href = redirectParam;
      return;
    }

    // Sprawdź czy użytkownik ma decki
    try {
      const decksResponse = await fetch("/api/decks?limit=1");
      const decksData = await decksResponse.json();

      if (decksData.decks && decksData.decks.length > 0) {
        window.location.href = "/decks?auto-select=true";
      } else {
        window.location.href = "/generate";
      }
    } catch (error) {
      // Fallback do /decks
      window.location.href = "/decks";
    }
  }
}
```

### Faza 7: Deep linking `/decks/:id`

**Plik**: `src/pages/decks/[id].astro`

**Funkcjonalność:**

- Redirect do `/decks?deck=:id` (zachowanie spójności z głównym widokiem)

**Implementacja:**

```astro
---
// src/pages/decks/[id].astro
export const prerender = false;

const { id } = Astro.params;
if (!id) {
  return Astro.redirect("/decks");
}

// Redirect do głównego widoku z parametrem deck
return Astro.redirect(`/decks?deck=${id}`);
---
```

## 4. Testy i weryfikacja

### 4.1. Scenariusze testowe

1. **Użytkownik z deckami loguje się po raz pierwszy**
   - ✅ Redirect do `/decks?auto-select=true`
   - ✅ Ostatni deck jest automatycznie wybrany
   - ✅ Lista par jest widoczna

2. **Użytkownik bez decków loguje się**
   - ✅ Redirect do `/generate`
   - ✅ Wyświetla się CTA do utworzenia pierwszego decka

3. **Użytkownik wraca na `/` będąc zalogowanym**
   - ✅ Redirect do `/decks?auto-select=true` (jeśli ma decki)
   - ✅ Redirect do `/generate` (jeśli nie ma decków)

4. **Wybór decka z comboboxa**
   - ✅ DeckDetailView aktualizuje się
   - ✅ Lista par się zmienia
   - ✅ Akcje są dostępne

5. **Deep link `/decks/:id`**
   - ✅ Redirect do `/decks?deck=:id`
   - ✅ Deck jest wybrany i widoczny

6. **Akcje na decku**
   - ✅ "Nauka" → `/learn/user/:deckId`
   - ✅ "Challenge" → `/challenge/user/:deckId`
   - ✅ "Progres" → `/decks/:deckId/progress`
   - ✅ "Generuj więcej" → `/generate?deck=:deckId`

### 4.2. Edge cases

- **Brak decków**: Pusty stan z CTA do `/generate`
- **Błąd API**: Komunikat błędu z możliwością odświeżenia
- **Deck został usunięty**: Obsługa 404, powrót do listy decków
- **Brak par w decku**: Komunikat w DeckDetailView

## 5. Zgodność z PRD

✅ **US-011**: Progres Leitner - dostępny przez akcję "Progres"  
✅ **US-008**: Nauka łączeniem - dostępna przez akcję "Nauka"  
✅ **US-010**: Tryb Challenge - dostępny przez akcję "Challenge"  
✅ **US-007**: Przegląd par - lista par w DeckDetailView  
✅ **US-001/US-002**: Generacja - dostępna przez akcję "Generuj więcej" lub `/generate`

## 6. Kolejność implementacji (MVP)

1. ✅ **Faza 1**: Wydzielenie DeckPicker
2. ✅ **Faza 2**: Auto-wybór ostatniego decka (sortowanie przez `updated_at`)
3. ✅ **Faza 3**: Strona `/decks` (podstawowa)
4. ✅ **Faza 4**: Komponent DeckHubView
5. ✅ **Faza 5**: Komponent DeckActions
6. ✅ **Faza 6**: Redirect logic
7. ✅ **Faza 7**: Deep linking (opcjonalnie)

## 7. Uwagi techniczne

1. **Performance**:
   - Lazy loading dla DeckDetailView jeśli deck ma dużo par
   - Sortowanie decków po `updated_at` jest wykonywane po stronie bazy danych (efektywne)

2. **RLS**:
   - Wszystkie zapytania muszą respektować RLS (użytkownik widzi tylko swoje decki)

3. **Offline**:
   - Rozważyć cache ostatniego decka w localStorage dla PWA

4. **Accessibility**:
   - DeckPicker powinien być dostępny klawiaturą
   - Akcje powinny mieć odpowiednie aria-labels

5. **Error handling**:
   - Graceful degradation przy błędach API
   - Komunikaty błędów w języku polskim
