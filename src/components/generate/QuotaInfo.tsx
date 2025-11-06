/**
 * QuotaInfo Component
 *
 * Displays daily generation quota information
 * Shows used/remaining generations and reset time
 * Warning when quota is exhausted
 */

import { AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { QuotaDTO } from "@/types";

interface QuotaInfoProps {
  quota: QuotaDTO | null;
  isLoading?: boolean;
}

export default function QuotaInfo({ quota, isLoading = false }: QuotaInfoProps) {
  if (isLoading) {
    return (
      <div className="w-full p-4 border rounded-lg bg-muted/50 animate-pulse">
        <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-2" />
        <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
      </div>
    );
  }

  if (!quota) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Nie udało się pobrać informacji o limicie</AlertTitle>
        <AlertDescription>Spróbuj odświeżyć stronę lub skontaktuj się z pomocą techniczną.</AlertDescription>
      </Alert>
    );
  }

  const isQuotaExhausted = quota.remaining === 0;
  const quotaPercentage = (quota.used_today / quota.daily_limit) * 100;

  // Format reset time
  const resetDate = new Date(quota.reset_at);
  const resetTime = resetDate.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Dzienny limit generacji</h3>
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          Reset o {resetTime}
        </span>
      </div>

      {/* Quota exhausted warning */}
      {isQuotaExhausted ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Limit generacji wyczerpany</AlertTitle>
          <AlertDescription>
            Wykorzystałeś wszystkie dostępne generacje na dzisiaj ({quota.daily_limit}/{quota.daily_limit}).
            <br />
            Nowy limit zostanie odblokowany o godzinie {resetTime}.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Quota usage display */}
          <div className="p-4 border rounded-lg bg-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">
                  Pozostało: {quota.remaining} / {quota.daily_limit}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">Użyto: {quota.used_today}</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  quotaPercentage >= 100 ? "bg-destructive" : quotaPercentage >= 66 ? "bg-yellow-500" : "bg-primary"
                }`}
                style={{ width: `${quotaPercentage}%` }}
                role="progressbar"
                aria-valuenow={quota.used_today}
                aria-valuemin={0}
                aria-valuemax={quota.daily_limit}
                aria-label={`Wykorzystano ${quota.used_today} z ${quota.daily_limit} generacji`}
              />
            </div>
          </div>

          {/* Low quota warning */}
          {quota.remaining === 1 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Ostatnia generacja</AlertTitle>
              <AlertDescription>To Twoja ostatnia dostępna generacja dzisiaj. Wykorzystaj ją mądrze!</AlertDescription>
            </Alert>
          )}
        </>
      )}

      {/* Info text */}
      <p className="text-xs text-muted-foreground">
        Każda generacja tworzy 30 nowych par słówek. Limit resetuje się codziennie o północy (00:00) w Twojej strefie
        czasowej.
      </p>
    </div>
  );
}
