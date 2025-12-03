/**
 * DeckPicker Component
 *
 * Select dropdown with user's existing decks
 * Shows deck title, languages (with flags), and pair count
 * Hidden when user has no decks (onboarding scenario)
 */

import { useId } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import FlagIcon from "@/components/FlagIcon";
import type { DeckListItemDTO } from "@/types";

interface DeckPickerProps {
  decks: DeckListItemDTO[];
  selectedDeckId: string | null;
  onSelect: (deckId: string) => void;
  onCreateNew: () => void;
  label?: string | null;
  helperText?: string | null;
  labelHidden?: boolean;
  helperTextHidden?: boolean;
}

export default function DeckPicker({
  decks,
  selectedDeckId,
  onSelect,
  onCreateNew,
  label = "Wybierz talię",
  helperText = "Wygenerowane pary zostaną dodane do wybranej talii",
  labelHidden = false,
  helperTextHidden = false,
}: DeckPickerProps) {
  const selectId = useId();

  // Hidden when no decks (onboarding)
  if (decks.length === 0) {
    return null;
  }

  const resolvedLabel = label ?? "Wybierz talię";
  const resolvedHelperText = helperText ?? "Wygenerowane pary zostaną dodane do wybranej talii";
  const showLabel = !labelHidden && Boolean(resolvedLabel);
  const showHelperText = !helperTextHidden && Boolean(resolvedHelperText);
  const helperId = showHelperText ? `${selectId}-helper` : undefined;

  return (
    <div className="w-full space-y-2">
      {showLabel && (
        <label htmlFor={selectId} className="text-sm font-medium">
          {resolvedLabel}
        </label>
      )}

      <Select
        value={selectedDeckId ?? ""}
        onValueChange={(value) => (value === "new" ? onCreateNew() : onSelect(value))}
      >
        <SelectTrigger id={selectId} className="w-full" aria-label={resolvedLabel} aria-describedby={helperId}>
          <SelectValue placeholder="Wybierz talię..." />
        </SelectTrigger>
        <SelectContent>
          {/* Create new deck option */}
          <SelectItem value="new" className="font-medium text-primary">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>Utwórz nową talię</span>
            </div>
          </SelectItem>

          {/* Separator */}
          <div className="h-px bg-border my-1" />

          {/* Existing decks */}
          {decks.map((deck) => (
            <SelectItem key={deck.id} value={deck.id}>
              <div className="flex items-center gap-2 w-full">
                <span className="font-medium text-lg flex-1 truncate">{deck.title}</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1">
                    <FlagIcon code={deck.lang_a.code} />
                    <span className="text-muted-foreground">↔</span>
                    <FlagIcon code={deck.lang_b.code} />
                  </div>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{deck.pairs_count} par</span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showHelperText && (
        <p id={helperId} className="text-xs text-muted-foreground">
          {resolvedHelperText}
        </p>
      )}
    </div>
  );
}
