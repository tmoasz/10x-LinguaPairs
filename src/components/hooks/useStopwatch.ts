import { useCallback, useEffect, useRef, useState } from "react";

interface UseStopwatchOptions {
  autoStart?: boolean;
}

export interface StopwatchControls {
  timeMs: number;
  isRunning: boolean;
  laps: number[];
  start: () => void;
  stop: () => number;
  reset: () => void;
  lap: () => number;
}

export function useStopwatch(options: UseStopwatchOptions = {}): StopwatchControls {
  const [timeMs, setTimeMs] = useState(0);
  const [isRunning, setIsRunning] = useState(Boolean(options.autoStart));
  const [laps, setLaps] = useState<number[]>([]);
  const rafRef = useRef<number | null>(null);
  const startTimestampRef = useRef<number | null>(null);
  const lastLapRef = useRef(0);
  const resumeAfterVisibilityRef = useRef(false);
  const autoStartedRef = useRef(false);

  const tick = useCallback(() => {
    if (startTimestampRef.current === null) {
      return;
    }
    setTimeMs(Date.now() - startTimestampRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(() => {
    if (isRunning) {
      return;
    }
    startTimestampRef.current = Date.now() - timeMs;
    setIsRunning(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [isRunning, timeMs, tick]);

  const stop = useCallback((): number => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (!isRunning) {
      return timeMs;
    }
    const finalElapsed = Date.now() - (startTimestampRef.current ?? Date.now());
    setTimeMs(finalElapsed);
    setIsRunning(false);
    startTimestampRef.current = null;
    return finalElapsed;
  }, [isRunning, timeMs]);

  const reset = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsRunning(false);
    startTimestampRef.current = null;
    setTimeMs(0);
    setLaps([]);
    lastLapRef.current = 0;
  }, []);

  const lap = useCallback(() => {
    const current = timeMs;
    const lapValue = current - lastLapRef.current;
    lastLapRef.current = current;
    setLaps((prev) => [...prev, lapValue]);
    return lapValue;
  }, [timeMs]);

  useEffect(() => {
    if (options.autoStart && !autoStartedRef.current) {
      autoStartedRef.current = true;
      start();
    }
  }, [options.autoStart, start]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        resumeAfterVisibilityRef.current = isRunning;
        if (isRunning) {
          void stop();
        }
      } else if (resumeAfterVisibilityRef.current) {
        resumeAfterVisibilityRef.current = false;
        start();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isRunning, start, stop]);

  return {
    timeMs,
    isRunning,
    laps,
    start,
    stop,
    reset,
    lap,
  };
}
