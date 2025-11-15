/**
 * Step1DeckSelection Component
 *
 * First step of wizard: Select or create a deck
 * Handles onboarding flow (no decks yet) automatically
 * Integrates DeckPicker and CreateDeckInline
 */

import { useState } from "react";
import DeckPicker from "@/components/decks/DeckPicker";
import CreateDeckInline from "./CreateDeckInline";
import { isOnboarding } from "./utils";
import type { DeckListItemDTO, LanguageDTO, CreateDeckDTO } from "@/types";

interface Step1DeckSelectionProps {
  decks: DeckListItemDTO[];
  languages: LanguageDTO[];
  selectedDeckId: string | null;
  defaultLangA: string | null;
  defaultLangB: string | null;
  onDeckSelect: (deckId: string) => void;
  onDeckCreate: (deck: CreateDeckDTO) => Promise<DeckListItemDTO>;
}

export default function Step1DeckSelection({
  decks,
  languages,
  selectedDeckId,
  defaultLangA,
  defaultLangB,
  onDeckSelect,
  onDeckCreate,
}: Step1DeckSelectionProps) {
  const isOnboardingFlow = isOnboarding(decks);

  // If onboarding, always show create form. Otherwise, allow toggle
  const [showCreateForm, setShowCreateForm] = useState(isOnboardingFlow);

  const handleCreateDeck = async (deckData: CreateDeckDTO) => {
    const newDeck = await onDeckCreate(deckData);
    // After creating, select it and hide form (unless onboarding)
    onDeckSelect(newDeck.id);
    if (!isOnboardingFlow) {
      setShowCreateForm(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {!isOnboardingFlow && (
        <div>
          <h2 className="text-xl font-semibold mb-1">Wybierz talię</h2>
          <p className="text-sm text-muted-foreground">Wygenerowane pary słówek zostaną dodane do wybranej talii</p>
        </div>
      )}

      {/* Show DeckPicker only if not onboarding and not in create mode */}
      {!isOnboardingFlow && !showCreateForm && (
        <DeckPicker
          decks={decks}
          selectedDeckId={selectedDeckId}
          onSelect={onDeckSelect}
          onCreateNew={() => setShowCreateForm(true)}
        />
      )}

      {/* Show CreateDeckInline in onboarding OR when user clicks "Create new" */}
      {(isOnboardingFlow || showCreateForm) && (
        <CreateDeckInline
          languages={languages}
          isOnboarding={isOnboardingFlow}
          defaultLangA={defaultLangA ?? undefined}
          defaultLangB={defaultLangB ?? undefined}
          onCancel={!isOnboardingFlow ? () => setShowCreateForm(false) : undefined}
          onCreate={handleCreateDeck}
        />
      )}

      {/* Show selected deck info when deck is selected (not in create mode) */}
      {!showCreateForm && selectedDeckId && (
        <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
          <p className="text-sm text-foreground">
            ✓ <strong>Wybrana talia:</strong> {decks.find((d) => d.id === selectedDeckId)?.title ?? "Nieznana talia"}
          </p>
        </div>
      )}
    </div>
  );
}
