import { BookOpen, Sparkles, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

interface NavigationProps {
  user?: {
    email: string | null;
    user_metadata?: {
      avatar_url?: string;
    };
  } | null;
  showLinks?: boolean;
}

interface ActiveDeck {
  id: string;
  name: string;
}

export const Navigation: React.FC<NavigationProps> = ({ user, showLinks = true }) => {
  const [activeDeck, setActiveDeck] = useState<ActiveDeck | null>(null);
  const shouldShowLinks = showLinks && !!user;

  useEffect(() => {
    const checkActiveDeck = () => {
      const stored = localStorage.getItem("lingua_active_deck");
      if (stored) {
        try {
          setActiveDeck(JSON.parse(stored));
        } catch {
          // Ignore error
        }
      }
    };

    checkActiveDeck();
    window.addEventListener("lingua_active_deck_change", checkActiveDeck);
    return () => window.removeEventListener("lingua_active_deck_change", checkActiveDeck);
  }, []);

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-6 md:gap-8">
          <a href="/" className="flex items-center space-x-2 font-bold">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                ></path>
              </svg>
            </span>
            <span className="hidden font-bold sm:inline-block">LinguaPairs</span>
          </a>
          {shouldShowLinks && (
            <div className="flex gap-6 md:gap-8">
              <a
                href={activeDeck ? `/generate?deck=${activeDeck.id}` : "/generate"}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Sparkles className="h-4 w-4" />
                <span>Generuj</span>
              </a>
              <a
                href="/decks"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <BookOpen className="h-4 w-4" />
                <span>Talie</span>
              </a>
              <a
                href={activeDeck ? `/challenge/user/${activeDeck.id}` : "/challenge/user"}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Trophy className="h-4 w-4" />
                <span>Challenge</span>
              </a>
            </div>
          )}
          {/* Active deck indicator - shown when deck is selected */}
          {shouldShowLinks && activeDeck && (
            <div className="hidden items-center gap-1.5 rounded-md border border-border/50 bg-muted/50 px-2 py-1 md:flex">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">Talia:</span>
              <span className="max-w-[120px] truncate text-xs font-medium text-foreground">{activeDeck.name}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {user && <UserMenu user={user} />}
        </div>
      </div>
    </nav>
  );
};
