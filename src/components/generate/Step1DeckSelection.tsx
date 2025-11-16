/**
 * Step1DeckSelection Component
 *
 * First step of wizard: Select or create a deck
 * Handles onboarding flow (no decks yet) automatically
 * Integrates DeckPicker and CreateDeckInline
 */

import { useState, useEffect, useRef } from "react";
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
  const selectedDeck = selectedDeckId ? decks.find((deck) => deck.id === selectedDeckId) : null;
  // If onboarding, always show create form. Otherwise, allow toggle
  const [showCreateForm, setShowCreateForm] = useState(isOnboardingFlow);
  // Track previous onboarding state to detect when onboarding ends
  const prevOnboardingRef = useRef(isOnboardingFlow);

  // Synchronize showCreateForm with isOnboardingFlow
  // Only hide form when onboarding transitions from true to false (deck created)
  useEffect(() => {
    const wasOnboarding = prevOnboardingRef.current;
    const isOnboardingNow = isOnboardingFlow;

    // If we transitioned from onboarding to non-onboarding, hide the form
    if (wasOnboarding && !isOnboardingNow && showCreateForm) {
      setShowCreateForm(false);
    }

    // Update ref for next render
    prevOnboardingRef.current = isOnboardingNow;
  }, [isOnboardingFlow, showCreateForm]);

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
          <h2 className="text-xl font-semibold mb-1">Docelowa talia</h2>
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
          label="Docelowa talia"
          labelHidden
          helperTextHidden
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
      {!showCreateForm && selectedDeck && (
        <div className="p-4 border rounded-lg bg-primary/5 border-primary/20 space-y-2">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <span className="text-base">✓</span>
            <span className="font-semibold">{selectedDeck.title}</span>
          </div>
          <p className="text-sm text-foreground">
            <strong>Opis talii:</strong>{" "}
            {selectedDeck.description?.trim()?.length ? selectedDeck.description : "Brak opisu"}
          </p>
          <p className="text-xs text-muted-foreground">
            {selectedDeck.lang_a.name} ↔ {selectedDeck.lang_b.name} • {selectedDeck.pairs_count} par
          </p>
        </div>
      )}
    </div>
  );
}
