/**
 * NavigationButtons Component
 *
 * Navigation controls for wizard steps
 * Shows Back, Next, and Generate buttons based on current step
 * Handles loading and disabled states
 */

import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

interface NavigationButtonsProps {
  currentStep: number;
  totalSteps: number;
  canGoNext: boolean;
  canSubmit: boolean;
  isLoading: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export default function NavigationButtons({
  currentStep,
  totalSteps,
  canGoNext,
  canSubmit,
  isLoading,
  onPrevious,
  onNext,
  onSubmit,
}: NavigationButtonsProps) {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  return (
    <div className="flex items-center justify-between gap-4 pt-6 border-t">
      {/* Back button */}
      <Button
        type="button"
        variant="outline"
        onClick={onPrevious}
        disabled={isFirstStep || isLoading}
        className={isFirstStep ? "invisible" : ""}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Wstecz
      </Button>

      <div className="flex-1" />

      {/* Next or Generate button */}
      {isLastStep ? (
        <Button type="button" onClick={onSubmit} disabled={!canSubmit || isLoading} size="lg" className="min-w-[160px]">
          {isLoading ? (
            <>
              <div className="w-4 h-4 mr-2 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
              Generowanie...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generuj pary
            </>
          )}
        </Button>
      ) : (
        <Button type="button" onClick={onNext} disabled={!canGoNext || isLoading} size="lg" className="min-w-[120px]">
          Dalej
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      )}
    </div>
  );
}
