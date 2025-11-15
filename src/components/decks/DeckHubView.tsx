import { useCallback, useEffect, useState } from "react";
import DeckPicker from "@/components/decks/DeckPicker";
import DeckDetailView from "@/components/decks/DeckDetailView";
import DeckActions from "@/components/decks/DeckActions";
import type { DeckListItemDTO, DecksListDTO } from "@/types";

interface DeckHubViewProps {
  initialDeckId?: string | null;
  autoSelectLast?: boolean;
}

export default function DeckHubView({ initialDeckId = null, autoSelectLast = false }: DeckHubViewProps) {
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(initialDeckId ?? null);
  const [decks, setDecks] = useState<DeckListItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const handleDeckSelect = useCallback((deckId: string) => {
    setSelectedDeckId(deckId);
  }, []);
  const handleCreateNewDeck = useCallback(() => {
    window.location.href = "/generate";
  }, []);

  const fetchDecks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Sort by updated_at desc to get most recently used decks first
      const response = await fetch("/api/decks?limit=100&sort=updated_at&order=desc");
      const data: DecksListDTO = await response.json();
      if (!response.ok) {
        throw new Error(
          (data as unknown as { error?: { message?: string } })?.error?.message ?? "Nie udało się wczytać talii."
        );
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

  if (!loading && decks.length === 0) {
    return (
      <section className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-semibold">Nie masz jeszcze żadnej talii</h1>
        <p className="max-w-xl text-muted-foreground">
          Przejdź do kreatora i wygeneruj pierwszą talię, aby zacząć naukę. Później wróć tutaj, aby zarządzać zestawami
          i akcjami challenge.
        </p>
        <a
          href="/generate"
          className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          Utwórz pierwszą talię
        </a>
      </section>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Ładuję listę talii...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <button
          type="button"
          onClick={() => void fetchDecks()}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {selectedDeckId ? (
        <section className="space-y-6">
          <DeckActions
            deckId={selectedDeckId}
            pairsCount={decks.find((deck) => deck.id === selectedDeckId)?.pairs_count ?? 0}
          />
          <DeckPicker
            decks={decks}
            selectedDeckId={selectedDeckId}
            onSelect={handleDeckSelect}
            onCreateNew={handleCreateNewDeck}
          />
          <DeckDetailView deckId={selectedDeckId} />
        </section>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground shadow-sm">
          Wybierz talię z listy powyżej, żeby zarządzać parami i wyzwaniami.
        </div>
      )}
    </div>
  );
}
