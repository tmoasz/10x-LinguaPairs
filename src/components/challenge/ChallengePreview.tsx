import { Play, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MatchingGrid } from "@/components/challenge/MatchingGrid";
import { ChallengeTimer } from "@/components/challenge/ChallengeTimer";
import { ChallengeSummary } from "@/components/challenge/ChallengeSummary";
import { ChallengeLeaderboard } from "@/components/challenge/ChallengeLeaderboard";
import { useChallengeGame } from "@/components/challenge/useChallengeGame";
import { Button } from "@/components/ui/button";
import FlagIcon from "@/components/FlagIcon";
import { CHALLENGE_REQUIRED_PAIRS } from "@/lib/constants/challenge";
import { MOCK_CHALLENGE_DECK, getMockChallengePairs } from "@/components/challenge/challenge.mock";
import type { ChallengeLeaderboardEntryDTO } from "@/types";

const PREVIEW_STORAGE_KEY = "linguapairs.challenge.preview.results";
const PREVIEW_MAX_RESULTS = 10;

export default function ChallengePreview() {
  const mockPairs = useMemo(() => getMockChallengePairs(), []);

  const [history, setHistory] = useState<ChallengeLeaderboardEntryDTO[]>([]);

  const game = useChallengeGame({
    pairs: mockPairs,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREVIEW_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as ChallengeLeaderboardEntryDTO[];
      if (Array.isArray(parsed)) {
        setHistory(parsed);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  useEffect(() => {
    if (game.status !== "finished" || typeof game.totalTimeMs !== "number") {
      return;
    }
    const nextEntry: ChallengeLeaderboardEntryDTO = {
      id: `local-${Date.now()}`,
      deck_id: MOCK_CHALLENGE_DECK.id,
      user_id: "local-guest",
      total_time_ms: game.totalTimeMs,
      incorrect: game.incorrectAttempts,
      correct: CHALLENGE_REQUIRED_PAIRS,
      created_at: new Date().toISOString(),
      player_name: "Anonimowy",
      is_current_user: true,
    };

    setHistory((prev) => {
      const nextHistory = [nextEntry, ...prev].slice(0, PREVIEW_MAX_RESULTS);
      try {
        localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(nextHistory));
      } catch {
        // ignore storage errors
      }
      return nextHistory;
    });
  }, [game.status, game.totalTimeMs, game.incorrectAttempts]);

  const showFinishedView = game.status === "finished" && typeof game.totalTimeMs === "number";

  return (
    <section className="space-y-6 rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{MOCK_CHALLENGE_DECK.title}</h2>
          <p className="text-sm text-muted-foreground">{MOCK_CHALLENGE_DECK.description}</p>
        </div>
      </header>

      {showFinishedView && game.totalTimeMs !== null ? (
        <ChallengeSummary
          totalTimeMs={game.totalTimeMs}
          incorrectAttempts={game.incorrectAttempts}
          correct={CHALLENGE_REQUIRED_PAIRS}
          onRestart={game.reset}
          deckId={MOCK_CHALLENGE_DECK.id}
        />
      ) : (
        <>
          <div className="space-y-3">
            <MatchingGrid
              pairs={game.currentRoundPairs}
              completedPairs={game.completedPairs}
              disabled={game.status !== "running"}
              onMatchSuccess={game.handleMatchSuccess}
              onMatchFailure={game.handleMatchFailure}
              leftLabel={
                <LanguageBadge code={MOCK_CHALLENGE_DECK.lang_a.code} label={MOCK_CHALLENGE_DECK.lang_a.name} />
              }
              rightLabel={
                <LanguageBadge code={MOCK_CHALLENGE_DECK.lang_b.code} label={MOCK_CHALLENGE_DECK.lang_b.name} />
              }
              obscureCells={game.status === "ready"}
            />
          </div>
          <div className="flex justify-center">
            {game.status === "ready" ? (
              <Button onClick={game.start}>
                <Play className="mr-2 h-4 w-4" aria-hidden />
                Kliknij Start, aby odsłonić pary
              </Button>
            ) : (
              <Button variant="outline" onClick={game.reset}>
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                Restart
              </Button>
            )}
          </div>
          <ChallengeTimer
            elapsedTimeMs={game.elapsedTimeMs}
            roundTimesMs={game.roundTimesMs}
            totalRounds={game.totalRounds}
            status={game.status}
            totalTimeMs={game.totalTimeMs}
          />
        </>
      )}
      <ChallengeLeaderboard entries={history} myBest={history[0] ?? null} isLoading={false} />
    </section>
  );
}

function LanguageBadge({ code, label }: { code: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <FlagIcon code={code} size="sm" />
      {label}
    </span>
  );
}
