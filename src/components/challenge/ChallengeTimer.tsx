import type { ChallengeGameStatus } from "@/components/challenge/useChallengeGame";

interface ChallengeTimerProps {
  elapsedTimeMs: number;
  roundTimesMs: number[];
  totalRounds: number;
  status: ChallengeGameStatus;
  totalTimeMs: number | null;
}

export function ChallengeTimer({ elapsedTimeMs, roundTimesMs, totalRounds, status, totalTimeMs }: ChallengeTimerProps) {
  const isFinished = status === "finished";
  const displayTime = isFinished && totalTimeMs !== null ? totalTimeMs : elapsedTimeMs;

  return (
    <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
      <div className="text-sm uppercase tracking-wide text-muted-foreground">Czas całkowity</div>
      <div className="mt-2 text-4xl font-semibold font-mono tabular-nums">{formatTime(displayTime)}</div>
      <ul className="mt-4 space-y-2 text-sm font-mono text-muted-foreground">
        {Array.from({ length: totalRounds }).map((_, index) => {
          const lap = roundTimesMs[index];
          const label = `Runda ${index + 1}`;
          const isRecorded = typeof lap === "number";
          return (
            <li
              key={label}
              className={
                isRecorded ? "text-foreground flex items-center justify-between" : "flex items-center justify-between"
              }
            >
              <span>{label}</span>
              <span className={isRecorded ? "font-semibold" : "text-muted-foreground"}>
                {isRecorded ? formatTime(lap) : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  const milliseconds = Math.floor(ms % 1000)
    .toString()
    .padStart(3, "0");
  return `${minutes}:${seconds}.${milliseconds}`;
}
