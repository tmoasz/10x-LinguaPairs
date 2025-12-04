import { Play, RefreshCw, Dices } from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { MatchingGrid } from "@/components/challenge/MatchingGrid";
import { ChallengeTimer } from "@/components/challenge/ChallengeTimer";
import { ChallengeSummary } from "@/components/challenge/ChallengeSummary";
import { ChallengeLeaderboard } from "@/components/challenge/ChallengeLeaderboard";
import { useChallengeGame } from "@/components/challenge/useChallengeGame";
import { Button } from "@/components/ui/button";
import FlagIcon from "@/components/FlagIcon";
import { CHALLENGE_REQUIRED_PAIRS } from "@/lib/constants/challenge";
import { MOCK_CHALLENGE_DECK, getMockChallengePairs } from "@/components/challenge/challenge.mock";
import { guestIdentityService } from "@/lib/services/guest-identity";
import type { ChallengeLeaderboardEntryDTO } from "@/types";
import { logger } from "@/lib/utils/logger";

interface DemoResult {
  id: string;
  guest_id: string;
  total_time_ms: number;
  incorrect: number;
  created_at: string;
  guest_name: string;
}

export default function ChallengePreview() {
  const mockPairs = useMemo(() => getMockChallengePairs(), []);

  // Identity state
  const [guestName, setGuestName] = useState<string>("Anonim");

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<ChallengeLeaderboardEntryDTO[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  // Handle game finish
  const handleGameFinish = useCallback(async (summary: { totalTimeMs: number; incorrectAttempts: number }) => {
    if (typeof summary.totalTimeMs !== "number") return;

    const { guestId, guestName } = guestIdentityService.getIdentity();

    try {
      await fetch("/api/challenge/demo/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest_id: guestId,
          guest_name: guestName,
          total_time_ms: summary.totalTimeMs,
          incorrect: summary.incorrectAttempts,
        }),
      });
      await fetchLeaderboard(guestId);
    } catch (error) {
      logger.error("Failed to submit demo score", error);
    }
  }, []);

  const game = useChallengeGame({
    pairs: mockPairs,
    onFinish: handleGameFinish,
  });

  const fetchLeaderboard = async (currentGuestId: string) => {
    setIsLoadingLeaderboard(true);
    try {
      const res = await fetch("/api/challenge/demo/leaderboard");
      if (!res.ok) throw new Error("Failed to fetch leaderboard");

      const data = await res.json();

      const mapped: ChallengeLeaderboardEntryDTO[] = (data as DemoResult[]).map((row) => ({
        id: row.id,
        deck_id: "demo",
        user_id: row.guest_id,
        total_time_ms: row.total_time_ms,
        incorrect: row.incorrect,
        correct: CHALLENGE_REQUIRED_PAIRS,
        created_at: row.created_at,
        player_name: row.guest_name,
        is_current_user: row.guest_id === currentGuestId,
      }));

      setLeaderboard(mapped);
    } catch (error) {
      logger.error("Error loading demo leaderboard", error);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  const handleRegenerateName = () => {
    const newName = guestIdentityService.regenerateName();
    setGuestName(newName);

    // Optimistically update own name in leaderboard if present
    setLeaderboard((prev) => prev.map((entry) => (entry.is_current_user ? { ...entry, player_name: newName } : entry)));
  };

  // Initialize identity and load leaderboard
  useEffect(() => {
    const { guestId: id, guestName: name } = guestIdentityService.getIdentity();
    setGuestName(name);
    void fetchLeaderboard(id);
  }, []);

  const showFinishedView = game.status === "finished" && typeof game.totalTimeMs === "number";

  const myBest = useMemo(() => leaderboard.find((e) => e.is_current_user) ?? null, [leaderboard]);

  return (
    <section className="space-y-6 rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{MOCK_CHALLENGE_DECK.title}</h2>
          <p className="text-sm text-muted-foreground">{MOCK_CHALLENGE_DECK.description}</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Grasz jako:</span>
          <div className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 bg-background/50">
            <span className="font-medium">{guestName}</span>
            <button
              onClick={handleRegenerateName}
              title="Wylosuj nową nazwę"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Dices className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {showFinishedView && game.totalTimeMs !== null ? (
        <ChallengeSummary
          totalTimeMs={game.totalTimeMs}
          incorrectAttempts={game.incorrectAttempts}
          correct={CHALLENGE_REQUIRED_PAIRS}
          onRestart={game.reset}
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

      <div className="pt-4 border-t border-border">
        <h3 className="mb-4 text-lg font-semibold">Tablica wyników (Demo)</h3>
        <ChallengeLeaderboard entries={leaderboard} myBest={myBest} isLoading={isLoadingLeaderboard} />
      </div>
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
