import { BookOpen, Plus, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeckActionsProps {
  deckId: string;
  pairsCount?: number;
}

const ACTIONS = [
  {
    label: "Rozpocznij naukę",
    href: (deckId: string) => `/learn/user/${deckId}`,
    icon: BookOpen,
    variant: "default" as const,
    minPairs: 1,
  },
  {
    label: "Tryb Challenge",
    href: (deckId: string) => `/challenge/user/${deckId}`,
    icon: Trophy,
    variant: "default" as const,
    minPairs: 30,
  },
  {
    label: "Pokaż postęp",
    href: (deckId: string) => `/decks/${deckId}/progress`,
    icon: Sparkles,
    variant: "outline" as const,
    minPairs: 1,
  },
  {
    label: "Generuj więcej",
    href: (deckId: string) => `/generate?deck=${deckId}`,
    icon: Plus,
    variant: "outline" as const,
    minPairs: 0,
  },
];

export default function DeckActions({ deckId, pairsCount = 0 }: DeckActionsProps) {
  return (
    <div className="flex flex-wrap gap-3" data-testid="deck-actions">
      {ACTIONS.map(({ label, href, icon: Icon, variant, minPairs }) => {
        const disabled = pairsCount < minPairs;
        return (
          <Button key={label} asChild={!disabled} variant={variant} disabled={disabled}>
            {disabled ? (
              <span className="flex items-center gap-2 cursor-not-allowed">
                <Icon className="h-4 w-4" aria-hidden />
                <span>{label}</span>
              </span>
            ) : (
              <a href={href(deckId)} className="flex items-center gap-2">
                <Icon className="h-4 w-4" aria-hidden />
                <span>{label}</span>
              </a>
            )}
          </Button>
        );
      })}
    </div>
  );
}
