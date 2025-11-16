import type { ChallengeLeaderboardEntryDTO } from "@/types";

interface ChallengeLeaderboardProps {
  entries: ChallengeLeaderboardEntryDTO[];
  myBest?: ChallengeLeaderboardEntryDTO | null;
  isLoading?: boolean;
}

export function ChallengeLeaderboard({ entries, myBest, isLoading = false }: ChallengeLeaderboardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Top 10</p>
          <h3 className="text-xl font-semibold">Tablica wyników</h3>
        </div>
        {myBest ? (
          <div className="mt-4 rounded-xl border border-border/60 bg-background/70 p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Twój najlepszy wynik</p>
            <p className="mt-1 font-semibold">{formatTime(myBest.total_time_ms)}</p>
            <p className="text-muted-foreground">
              Błędy: {myBest.incorrect} • {new Date(myBest.created_at).toLocaleDateString()}
            </p>
          </div>
        ) : null}
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-2 pr-4">Lp</th>
              <th className="py-2 pr-4">Gracz</th>
              <th className="py-2 pr-4">Czas</th>
              <th className="py-2 pr-4">Błędy</th>
              <th className="py-2 pr-4">Data</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-muted-foreground">
                  Ładuję ranking...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-muted-foreground">
                  Brak zapisanych wyników dla tej talii.
                </td>
              </tr>
            ) : (
              entries.map((entry, index) => (
                <tr
                  key={entry.id}
                  className={[
                    "border-t border-border/60",
                    entry.is_current_user ? "bg-primary/5 font-semibold" : "",
                  ].join(" ")}
                >
                  <td className="py-2 pr-4">{index + 1}</td>
                  <td className="py-2 pr-4">{entry.player_name}</td>
                  <td className="py-2 pr-4 font-mono">{formatTime(entry.total_time_ms)}</td>
                  <td className="py-2 pr-4">{entry.incorrect}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{formatDate(entry.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}
