# Plan implementacji: Widok decków jako główny hub (MVP)

## 1. Przegląd i cel

**Cel biznesowy**: Stworzyć główny hub aplikacji (`/decks`), który będzie centralnym miejscem dla zalogowanych użytkowników. Wszystkie akcje (przegląd par, Challenge, Nauka, statystyki) będą dostępne w odniesieniu do wybranego decka.

**Kluczowe założenia (z odpowiedzi użytkownika)**:

1. **Widok z comboboxem**: Analogiczny do widoku generacji - używa `DeckPicker` do wyboru decka
2. **Auto-wybór ostatniego decka**: Kombinacja `last_reviewed_at` → `updated_at` → `created_at`
3. **Wydzielenie DeckPicker**: Komponent UI do wspólnego użycia
4. **Redirect przy braku decków**: Do `/generate` z CTA
5. **Endpoint last-used**: `GET /api/decks/last-used` zwracający `DeckDetailDTO` lub `null`

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

**Nowy:**
- `GET /api/decks/last-used` - zwraca ostatnio użyty deck (DeckDetailDTO | null)

**Istniejące (używane):**
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

### Faza 2: Endpoint API dla ostatniego decka

**Cel**: Utworzyć endpoint zwracający ostatnio użyty deck użytkownika.

**Plik**: `src/pages/api/decks/last-used.ts`

**Logika (priorytet):**
1. Znajdź deck z najnowszym `last_reviewed_at` (z `user_pair_state`)
2. Jeśli brak → znajdź deck z najnowszym `updated_at`
3. Jeśli brak → znajdź deck z najnowszym `created_at`
4. Zwróć `DeckDetailDTO` lub `null`

**Implementacja:**

```typescript
import type { APIRoute } from "astro";
import type { DeckDetailDTO } from "@/types";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) {
    return new Response(
      JSON.stringify({
        error: {
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = context.locals.supabase;

  // Opcja 1: Ostatnio używany do nauki (z user_pair_state)
  const { data: lastUsedState } = await supabase
    .from("user_pair_state")
    .select("deck_id, last_reviewed_at")
    .eq("user_id", user.id)
    .not("last_reviewed_at", "is", null)
    .order("last_reviewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastUsedState?.deck_id) {
    // Pobierz szczegóły decka
    const { data: deck, error } = await supabase
      .from("decks")
      .select(`
        id,
        owner_user_id,
        title,
        description,
        lang_a,
        lang_b,
        visibility,
        created_at,
        updated_at,
        profiles!decks_owner_user_id_fkey(id, username)
      `)
      .eq("id", lastUsedState.deck_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (!error && deck) {
      // Pobierz języki i liczbę par
      const [langA, langB, pairsCount] = await Promise.all([
        supabase.from("languages").select("id, code, name, flag_emoji").eq("id", deck.lang_a).single(),
        supabase.from("languages").select("id, code, name, flag_emoji").eq("id", deck.lang_b).single(),
        supabase.from("pairs").select("id", { count: "exact", head: true }).eq("deck_id", deck.id).is("deleted_at", null),
      ]);

      const response: DeckDetailDTO = {
        id: deck.id,
        owner_user_id: deck.owner_user_id,
        owner: {
          id: deck.profiles.id,
          username: deck.profiles.username,
        },
        title: deck.title,
        description: deck.description,
        lang_a: langA.data!,
        lang_b: langB.data!,
        visibility: deck.visibility,
        pairs_count: pairsCount.count ?? 0,
        created_at: deck.created_at,
        updated_at: deck.updated_at,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Opcja 2: Ostatnio edytowany
  const { data: lastEdited } = await supabase
    .from("decks")
    .select(`
      id,
      owner_user_id,
      title,
      description,
      lang_a,
      lang_b,
      visibility,
      created_at,
      updated_at,
      profiles!decks_owner_user_id_fkey(id, username)
    `)
    .eq("owner_user_id", user.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastEdited) {
    // Pobierz języki i liczbę par (analogicznie jak wyżej)
    // ... (kod podobny do powyższego)
    // Zwróć DeckDetailDTO
  }

  // Brak decków
  return new Response(JSON.stringify(null), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
```

**Uwagi:**
- Użyj `.maybeSingle()` zamiast `.single()` aby uniknąć błędów gdy brak wyników
- Zwróć `null` zamiast błędu 404 gdy użytkownik nie ma decków
- Rozważ cache (np. 5 minut) dla tego endpointu

### Faza 3: Strona `/decks` - główny hub

**Plik**: `src/pages/decks/index.astro` (lub `src/pages/decks.astro`)

**Funkcjonalność SSR:**
- Sprawdź czy użytkownik jest zalogowany (middleware już to robi)
- Sprawdź query params: `?auto-select=true` lub `?deck=:id`
- Jeśli `auto-select=true`: pobierz ostatni deck z API
- Jeśli `?deck=:id`: użyj tego decka
- Przekaż deckId do komponentu React

**Implementacja:**

```astro
---
// src/pages/decks/index.astro
import Layout from "@/layouts/Layout.astro";
import DeckHubView from "@/components/decks/DeckHubView";

export const prerender = false;

const user = Astro.locals.user;
if (!user) {
  return Astro.redirect("/auth/login?redirect=/decks");
}

const url = new URL(Astro.request.url);
const autoSelect = url.searchParams.get("auto-select") === "true";
const deckIdParam = url.searchParams.get("deck");

let initialDeckId: string | null = null;

if (deckIdParam) {
  initialDeckId = deckIdParam;
} else if (autoSelect) {
  // Pobierz ostatni deck z API
  try {
    const response = await fetch(`${Astro.url.origin}/api/decks/last-used`, {
      headers: {
        Cookie: Astro.request.headers.get("Cookie") || "",
      },
    });
    if (response.ok) {
      const lastDeck = await response.json();
      if (lastDeck) {
        initialDeckId = lastDeck.id;
      }
    }
  } catch (error) {
    console.error("Failed to fetch last used deck:", error);
  }
}
---

<Layout title="Moje talie — LinguaPairs">
  <DeckHubView initialDeckId={initialDeckId} />
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

**Struktura:**

```typescript
interface DeckHubViewProps {
  initialDeckId?: string | null;
}

export default function DeckHubView({ initialDeckId }: DeckHubViewProps) {
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(initialDeckId ?? null);
  const [decks, setDecks] = useState<DeckListItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pobierz listę decków
  useEffect(() => {
    async function loadDecks() {
      try {
        const response = await fetch("/api/decks");
        const data = await response.json();
        if (response.ok) {
          setDecks(data.decks ?? []);
          
          // Auto-wybór jeśli nie wybrano i jest initialDeckId
          if (!selectedDeckId && initialDeckId) {
            setSelectedDeckId(initialDeckId);
          } else if (!selectedDeckId && data.decks?.length > 0) {
            // Jeśli brak initialDeckId, wybierz pierwszy
            setSelectedDeckId(data.decks[0].id);
          }
        } else {
          setError(data.error?.message ?? "Nie udało się wczytać talii");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Błąd podczas ładowania");
      } finally {
        setLoading(false);
      }
    }
    loadDecks();
  }, []);

  // Pusty stan
  if (!loading && decks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <h2 className="text-2xl font-semibold">Nie masz jeszcze żadnych talii</h2>
        <p className="text-muted-foreground">Utwórz swoją pierwszą talię i zacznij generować pary słówek</p>
        <a
          href="/generate"
          className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Utwórz pierwszą talię
        </a>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return <div className="text-center py-12">Ładuję talie...</div>;
  }

  // Error state
  if (error) {
    return <div className="text-center py-12 text-destructive">{error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* DeckPicker */}
      <div className="max-w-2xl">
        <DeckPicker
          decks={decks}
          selectedDeckId={selectedDeckId}
          onSelect={setSelectedDeckId}
          onCreateNew={() => {
            window.location.href = "/generate";
          }}
        />
      </div>

      {/* DeckDetailView + Actions */}
      {selectedDeckId ? (
        <div className="space-y-6">
          <DeckActions deckId={selectedDeckId} />
          <DeckDetailView deckId={selectedDeckId} />
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          Wybierz talię z listy powyżej
        </div>
      )}
    </div>
  );
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
2. ✅ **Faza 2**: Endpoint `/api/decks/last-used`
3. ✅ **Faza 3**: Strona `/decks` (podstawowa)
4. ✅ **Faza 4**: Komponent DeckHubView
5. ✅ **Faza 5**: Komponent DeckActions
6. ✅ **Faza 6**: Redirect logic
7. ✅ **Faza 7**: Deep linking (opcjonalnie)

## 7. Uwagi techniczne

1. **Performance**: 
   - Rozważyć cache dla `last-used` endpointu (5-10 minut)
   - Lazy loading dla DeckDetailView jeśli deck ma dużo par

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

