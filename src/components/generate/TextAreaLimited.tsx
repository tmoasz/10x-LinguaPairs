/**
 * TextAreaLimited Component
 *
 * Textarea with character limit (1-5000 chars)
 * Displays character counter and context quality warnings
 * Visual indicators for text length (danger/warning/ok)
 */

import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { getTextLengthWarningLevel } from "./utils";

interface TextAreaLimitedProps {
  value: string;
  onChange: (text: string) => void;
  maxLength?: number;
  placeholder?: string;
  disabled?: boolean;
}

export default function TextAreaLimited({
  value,
  onChange,
  maxLength = 5000,
  placeholder = "Wpisz tekst, z którego AI wygeneruje pary słówek...",
  disabled = false,
}: TextAreaLimitedProps) {
  const currentLength = value.length;
  const warningInfo = getTextLengthWarningLevel(currentLength);
  const remainingChars = maxLength - currentLength;

  // Calculate percentage for visual indicator
  const percentage = (currentLength / maxLength) * 100;

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor="text-input" className="text-sm font-medium">
          Własny tekst
        </label>
        <span className={`text-xs font-medium ${remainingChars < 100 ? "text-destructive" : "text-muted-foreground"}`}>
          {currentLength} / {maxLength} znaków
        </span>
      </div>

      {/* Textarea */}
      <Textarea
        id="text-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        rows={8}
        className={`
          resize-none
          ${warningInfo.level === "danger" ? "border-destructive focus-visible:ring-destructive" : ""}
          ${warningInfo.level === "warning" ? "border-yellow-500 focus-visible:ring-yellow-500" : ""}
        `}
        aria-describedby="text-counter text-warning"
      />

      {/* Progress bar showing text length */}
      <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
        <div
          className={`h-full transition-all duration-200 ${
            warningInfo.level === "danger"
              ? "bg-destructive"
              : warningInfo.level === "warning"
                ? "bg-yellow-500"
                : "bg-primary"
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {/* Warning/info messages */}
      {warningInfo.level && warningInfo.message && (
        <div
          id="text-warning"
          className={`flex items-start gap-2 p-3 rounded-md text-sm ${
            warningInfo.level === "danger"
              ? "bg-destructive/10 text-destructive"
              : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
          }`}
        >
          {warningInfo.level === "danger" ? (
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          )}
          <span>{warningInfo.message}</span>
        </div>
      )}

      {/* Helper text */}
      {!warningInfo.level && currentLength > 0 && (
        <p className="text-sm text-muted-foreground">
          Tekst wygląda dobrze! AI użyje go do wygenerowania odpowiednich par słówek.
        </p>
      )}

      {currentLength === 0 && (
        <p className="text-sm text-muted-foreground">
          Opisz temat lub kontekst, dla którego chcesz wygenerować pary słówek (minimum 10 znaków dla najlepszych
          wyników).
        </p>
      )}
    </div>
  );
}
