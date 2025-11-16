import { Button } from "@/components/ui/button";

interface ChallengeSummaryProps {
  totalTimeMs: number;
  incorrectAttempts: number;
  correct: number;
  onRestart: () => void;
}

export function ChallengeSummary({ totalTimeMs, incorrectAttempts, correct, onRestart }: ChallengeSummaryProps) {
  const medal = determineMedal(incorrectAttempts);

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
      <div>
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Wynik</p>
        <p className="mt-2 text-3xl font-semibold">{formatTime(totalTimeMs)}</p>
        <p className="text-sm text-muted-foreground">
          Poprawne pary: {correct} / {correct}
        </p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        <InfoTile label="Medal" value={medal.label} accent={medal.accent} />
        <InfoTile label="Błędne próby" value={`${incorrectAttempts}`} />
        <InfoTile label="Łączny czas" value={formatTime(totalTimeMs)} />
      </dl>

      <div className="flex flex-wrap gap-3">
        <Button onClick={onRestart} className="flex-1">
          Zacznij ponownie
        </Button>
      </div>
    </div>
  );
}

function InfoTile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-4 text-center">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={["mt-2 text-lg font-semibold", accent ?? ""].join(" ")}>{value}</p>
    </div>
  );
}

function determineMedal(incorrectAttempts: number): { label: string; accent?: string } {
  if (incorrectAttempts === 0) {
    return { label: "Złoto", accent: "text-amber-500" };
  }
  if (incorrectAttempts <= 2) {
    return { label: "Srebro", accent: "text-slate-400" };
  }
  if (incorrectAttempts <= 5) {
    return { label: "Brąz", accent: "text-orange-500" };
  }
  return { label: "Brak medalu", accent: "text-muted-foreground" };
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
