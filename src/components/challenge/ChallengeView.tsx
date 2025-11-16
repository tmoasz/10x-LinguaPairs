import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Play, RefreshCw } from "lucide-react";
import { MatchingGrid } from "@/components/challenge/MatchingGrid";
import { ChallengeTimer } from "@/components/challenge/ChallengeTimer";
import { ChallengeSummary } from "@/components/challenge/ChallengeSummary";
import { ChallengeLeaderboard } from "@/components/challenge/ChallengeLeaderboard";
import { useChallengeGame, type ChallengeCompletionSummary } from "@/components/challenge/useChallengeGame";
import { Button } from "@/components/ui/button";
import FlagIcon from "@/components/FlagIcon";
import { CHALLENGE_REQUIRED_PAIRS } from "@/lib/constants/challenge";
import type { ChallengeLeaderboardDTO, ChallengePairsResponseDTO, ChallengeResultDTO, DeckDetailDTO } from "@/types";

interface ChallengeViewProps {
  deckId: string;
}

interface ApiError extends Error {
  code?: string;
  status?: number;
}

export default function ChallengeView({ deckId }: ChallengeViewProps) {
  const [deck, setDeck] = useState<DeckDetailDTO | null>(null);
  const [deckLoading, setDeckLoading] = useState(true);
  const [viewError, setViewError] = useState<string | null>(null);

  const [pairsResponse, setPairsResponse] = useState<ChallengePairsResponseDTO | null>(null);
  const [pairsLoading, setPairsLoading] = useState(true);
  const [pairsError, setPairsError] = useState<string | null>(null);
  const [notEnoughPairs, setNotEnoughPairs] = useState(false);

  const [leaderboard, setLeaderboard] = useState<ChallengeLeaderboardDTO | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  const [savingResult, setSavingResult] = useState(false);
  const [resultError, setResultError] = useState<string | null>(null);

  const loadDeck = useCallback(async () => {
    setDeckLoading(true);
    setViewError(null);
    try {
      const data = await fetchJson<DeckDetailDTO>(`/api/decks/${deckId}`);
      setDeck(data);
    } catch (error) {
      console.error("Failed to load deck", error);
      setViewError(error instanceof Error ? error.message : "Nie udało się wczytać talii.");
    } finally {
      setDeckLoading(false);
    }
  }, [deckId]);

  const loadPairs = useCallback(async () => {
    setPairsLoading(true);
    setPairsError(null);
    setNotEnoughPairs(false);
    try {
      const data = await fetchJson<ChallengePairsResponseDTO>(`/api/decks/${deckId}/challenge-pairs`);
      setPairsResponse(data);
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.code === "NOT_ENOUGH_PAIRS") {
        setNotEnoughPairs(true);
      }
      setPairsError(apiError.message ?? "Nie udało się pobrać par.");
      setPairsResponse(null);
    } finally {
      setPairsLoading(false);
    }
  }, [deckId]);

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    try {
      const data = await fetchJson<ChallengeLeaderboardDTO>(`/api/challenge/decks/${deckId}/top`);
      setLeaderboard(data);
    } catch (error) {
      console.error("Failed to load leaderboard", error);
    } finally {
      setLeaderboardLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    void loadDeck();
    void loadPairs();
    void loadLeaderboard();
  }, [loadDeck, loadPairs, loadLeaderboard]);

  const handleGameFinish = useCallback(
    async (summary: ChallengeCompletionSummary) => {
      setSavingResult(true);
      setResultError(null);
      try {
        await fetchJson<ChallengeResultDTO>("/api/challenge/results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deck_id: deckId,
            total_time_ms: summary.totalTimeMs,
            incorrect: summary.incorrectAttempts,
            correct: summary.correct,
            round_times_ms: summary.roundTimesMs,
          }),
        });
        await loadLeaderboard();
      } catch (error) {
        console.error("Failed to save challenge result", error);
        setResultError(error instanceof Error ? error.message : "Nie udało się zapisać wyniku.");
      } finally {
        setSavingResult(false);
      }
    },
    [deckId, loadLeaderboard]
  );

  const game = useChallengeGame({
    pairs: pairsResponse?.pairs ?? null,
    onFinish: handleGameFinish,
  });

  const isInitialLoading = deckLoading || pairsLoading;
  const showFinishedView = game.status === "finished" && typeof game.totalTimeMs === "number";

  const handleStart = () => {
    setResultError(null);
    game.start();
  };

  const handleRestart = () => {
    setResultError(null);
    void loadPairs();
    game.reset();
  };

  if (viewError) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-destructive">{viewError}</div>
    );
  }

  if (isInitialLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card/60 p-10 text-center text-muted-foreground">
        Ładuję tryb Challenge...
      </div>
    );
  }

  if (!deck) {
    return null;
  }

  if (notEnoughPairs || deck.pairs_count < CHALLENGE_REQUIRED_PAIRS) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <AlertTriangle className="mt-1 h-6 w-6 text-amber-500" aria-hidden />
          <div>
            <h2 className="text-xl font-semibold text-amber-900">Za mało par w talii</h2>
            <p className="mt-2 text-amber-900/80">
              Tryb Challenge wymaga co najmniej {CHALLENGE_REQUIRED_PAIRS} par. Obecnie talia ma {deck.pairs_count}.
            </p>
            <div className="mt-4">
              <Button asChild>
                <a href={`/decks/${deck.id}`}>Przejdź do talii</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{deck.title}</h1>
            <p className="text-sm text-muted-foreground">
              {deck.lang_a.name} ↔ {deck.lang_b.name} • {deck.pairs_count} par
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/decks">Powrót do talii</a>
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Wylosujemy 3 rundy po 5 par. Dopasuj tłumaczenia jak najszybciej, unikaj błędów i powalcz o medal.
        </p>
      </header>

      {showFinishedView && game.totalTimeMs !== null ? (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <ChallengeSummary
            totalTimeMs={game.totalTimeMs}
            incorrectAttempts={game.incorrectAttempts}
            correct={CHALLENGE_REQUIRED_PAIRS}
            onRestart={handleRestart}
          />
          <ChallengeLeaderboard
            entries={leaderboard?.entries ?? []}
            myBest={leaderboard?.my_best}
            isLoading={leaderboardLoading}
          />
          {resultError ? (
            <p className="text-sm text-destructive lg:col-span-2">Nie udało się zapisać wyniku: {resultError}</p>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Aktualna runda</h2>
                  <p className="text-sm text-muted-foreground">
                    {game.currentRound} / {game.totalRounds} • Błędne próby: {game.incorrectAttempts}
                  </p>
                </div>
              </div>
              {pairsError ? <p className="mt-3 text-sm text-destructive">{pairsError}</p> : null}
              {resultError ? (
                <p className="mt-3 text-sm text-destructive">Nie udało się zapisać wyniku: {resultError}</p>
              ) : null}
              {savingResult ? <p className="mt-3 text-sm text-muted-foreground">Zapisuję wynik w rankingu...</p> : null}

              <div className="mt-6 relative">
                <MatchingGrid
                  pairs={game.currentRoundPairs}
                  completedPairs={game.completedPairs}
                  disabled={game.status !== "running"}
                  onMatchSuccess={game.handleMatchSuccess}
                  onMatchFailure={game.handleMatchFailure}
                  leftLabel={<LanguageColumnLabel code={deck.lang_a.code} name={deck.lang_a.name} />}
                  rightLabel={<LanguageColumnLabel code={deck.lang_b.code} name={deck.lang_b.name} />}
                  obscureCells={game.status === "ready"}
                />
                {game.status === "transition" ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/85">
                    <p className="text-lg font-semibold">Ładuję kolejną rundę...</p>
                  </div>
                ) : null}
              </div>
              <div className="mt-4 flex justify-center">
                {game.status === "ready" ? (
                  <Button onClick={handleStart} disabled={pairsLoading || !pairsResponse}>
                    <Play className="mr-2 h-4 w-4" aria-hidden />
                    Kliknij Start, aby odsłonić pary
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handleRestart}>
                    <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                    Restart
                  </Button>
                )}
              </div>
            </section>

            <ChallengeTimer
              elapsedTimeMs={game.elapsedTimeMs}
              roundTimesMs={game.roundTimesMs}
              totalRounds={game.totalRounds}
              status={game.status}
              totalTimeMs={game.totalTimeMs}
            />
          </div>
        </>
      )}

      {!showFinishedView ? (
        <section>
          <ChallengeLeaderboard
            entries={leaderboard?.entries ?? []}
            myBest={leaderboard?.my_best}
            isLoading={leaderboardLoading}
          />
        </section>
      ) : null}
    </div>
  );
}

function LanguageColumnLabel({ code, name }: { code: string; name: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
      <FlagIcon code={code} size="sm" />
      <span className="truncate">{name}</span>
    </span>
  );
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = (payload as { error?: { message?: string } })?.error?.message ?? "Żądanie nie powiodło się.";
    const error: ApiError = new Error(message);
    error.status = response.status;
    error.code = (payload as { error?: { code?: string } })?.error?.code;
    throw error;
  }

  return payload as T;
}
