import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CHALLENGE_PAIRS_PER_ROUND, CHALLENGE_ROUND_TRANSITION_MS, CHALLENGE_ROUNDS } from "@/lib/constants/challenge";
import type { PairDTO } from "@/types";
import { useStopwatch } from "@/components/hooks/useStopwatch";

export type ChallengeGameStatus = "loading" | "ready" | "running" | "transition" | "finished";

export interface ChallengeCompletionSummary {
  totalTimeMs: number;
  incorrectAttempts: number;
  correct: number;
  roundTimesMs: number[];
}

interface UseChallengeGameOptions {
  pairs: PairDTO[] | null;
  rounds?: number;
  pairsPerRound?: number;
  onFinish?: (summary: ChallengeCompletionSummary) => void;
}

export function useChallengeGame({
  pairs,
  rounds = CHALLENGE_ROUNDS,
  pairsPerRound = CHALLENGE_PAIRS_PER_ROUND,
  onFinish,
}: UseChallengeGameOptions) {
  const {
    timeMs: elapsedTimeMs,
    start: startTimer,
    stop: stopTimer,
    reset: resetTimer,
    lap: lapTimer,
  } = useStopwatch();
  const [status, setStatus] = useState<ChallengeGameStatus>("loading");
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundPairs, setRoundPairs] = useState<PairDTO[][]>([]);
  const [completedPairs, setCompletedPairs] = useState<Set<string>>(new Set());
  const [incorrectAttempts, setIncorrectAttempts] = useState(0);
  const incorrectRef = useRef(0);
  const [roundTimesMs, setRoundTimesMs] = useState<number[]>([]);
  const roundTimesRef = useRef<number[]>([]);
  const [totalTimeMs, setTotalTimeMs] = useState<number | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalRequiredPairs = rounds * pairsPerRound;

  useEffect(() => {
    if (!pairs || pairs.length === 0) {
      setStatus("loading");
      return;
    }

    const nextPairs = chunkPairs(pairs, pairsPerRound, rounds);
    if (nextPairs.length === 0 || nextPairs.flat().length < totalRequiredPairs) {
      setStatus("loading");
      return;
    }

    setRoundPairs(nextPairs);
    setRoundIndex(0);
    setCompletedPairs(new Set());
    setIncorrectAttempts(0);
    incorrectRef.current = 0;
    roundTimesRef.current = [];
    setRoundTimesMs([]);
    setTotalTimeMs(null);
    resetTimer();
    setStatus("ready");

    return () => {
      if (transitionTimeoutRef.current !== null) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
    };
  }, [pairs, pairsPerRound, rounds, totalRequiredPairs, resetTimer]);

  const currentRoundPairs = useMemo(() => {
    return roundPairs[roundIndex] ?? [];
  }, [roundPairs, roundIndex]);

  const totalRounds = roundPairs.length || rounds;

  const start = useCallback(() => {
    if (roundPairs.length === 0) {
      return;
    }
    resetTimer();
    startTimer();
    setCompletedPairs(new Set());
    setIncorrectAttempts(0);
    incorrectRef.current = 0;
    roundTimesRef.current = [];
    setRoundTimesMs([]);
    setTotalTimeMs(null);
    setRoundIndex(0);
    setStatus("running");
  }, [roundPairs.length, resetTimer, startTimer]);

  const reset = useCallback(() => {
    if (transitionTimeoutRef.current !== null) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    resetTimer();
    setCompletedPairs(new Set());
    setIncorrectAttempts(0);
    incorrectRef.current = 0;
    roundTimesRef.current = [];
    setRoundTimesMs([]);
    setTotalTimeMs(null);
    setRoundIndex(0);
    setStatus(roundPairs.length > 0 ? "ready" : "loading");
  }, [roundPairs.length, resetTimer]);

  const handleRoundComplete = useCallback(() => {
    const lapTime = lapTimer();
    roundTimesRef.current = [...roundTimesRef.current, lapTime];
    setRoundTimesMs(roundTimesRef.current);

    const isFinalRound = roundIndex >= roundPairs.length - 1;
    if (isFinalRound) {
      const total = stopTimer();
      setTotalTimeMs(total);
      setStatus("finished");
      const summary: ChallengeCompletionSummary = {
        totalTimeMs: total,
        incorrectAttempts: incorrectRef.current,
        correct: roundPairs.length * pairsPerRound,
        roundTimesMs: roundTimesRef.current,
      };
      onFinish?.(summary);
      return;
    }

    setStatus("transition");
    transitionTimeoutRef.current = setTimeout(() => {
      setRoundIndex((prev) => prev + 1);
      setCompletedPairs(new Set());
      setStatus("running");
      transitionTimeoutRef.current = null;
    }, CHALLENGE_ROUND_TRANSITION_MS);
  }, [lapTimer, onFinish, pairsPerRound, roundIndex, roundPairs.length, stopTimer]);

  const handleMatchSuccess = useCallback(
    (pairId: string) => {
      if (status !== "running" && status !== "transition") {
        return;
      }

      setCompletedPairs((prev) => {
        if (prev.has(pairId)) {
          return prev;
        }
        const next = new Set(prev);
        next.add(pairId);
        if (next.size >= pairsPerRound) {
          handleRoundComplete();
        }
        return next;
      });
    },
    [handleRoundComplete, pairsPerRound, status]
  );

  const handleMatchFailure = useCallback(() => {
    setIncorrectAttempts((prev) => {
      const next = prev + 1;
      incorrectRef.current = next;
      return next;
    });
  }, []);

  return {
    status,
    currentRound: roundIndex + 1,
    totalRounds,
    currentRoundPairs,
    completedPairs,
    incorrectAttempts,
    totalTimeMs,
    roundTimesMs,
    elapsedTimeMs,
    requiredPairs: totalRequiredPairs,
    start,
    reset,
    handleMatchSuccess,
    handleMatchFailure,
  };
}

function chunkPairs(pairs: PairDTO[], chunkSize: number, rounds: number): PairDTO[][] {
  const result: PairDTO[][] = [];
  const needed = chunkSize * rounds;
  const limited = pairs.slice(0, needed);

  for (let index = 0; index < limited.length; index += chunkSize) {
    result.push(limited.slice(index, index + chunkSize));
  }

  return result;
}
