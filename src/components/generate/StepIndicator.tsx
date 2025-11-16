/**
 * StepIndicator Component
 *
 * Visual indicator showing current step progress (1/3, 2/3, 3/3)
 * Displays status for each step: completed, active, or pending
 * Includes navigation buttons (Back/Next) at the progress level
 */

import { Check, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WizardStep } from "./types";

interface StepIndicatorProps {
  currentStep: WizardStep;
  totalSteps: number;
  canGoNext: boolean;
  canSubmit: boolean;
  isLoading: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export default function StepIndicator({
  currentStep,
  totalSteps,
  canGoNext,
  canSubmit,
  isLoading,
  onPrevious,
  onNext,
  onSubmit,
}: StepIndicatorProps) {
  const steps = [
    { number: 1, label: "Wybór talii" },
    { number: 2, label: "Źródło generacji" },
    { number: 3, label: "Parametry" },
  ];

  return (
    <div className="w-full mb-8 flex flex-col items-center" aria-label="Progress indicator">
      {/* Mobile: Simple text indicator */}
      <div className="block sm:hidden text-center mb-4">
        <p className="text-sm text-muted-foreground">
          Krok {currentStep} z {totalSteps}
        </p>
      </div>

      {/* Desktop: Visual step indicator with navigation buttons */}
      <div className="hidden sm:block w-full max-w-4xl">
        <div className="flex items-center justify-center gap-4">
          {/* Back button - before step 1 */}
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
            disabled={currentStep === 1 || isLoading}
            className={currentStep === 1 ? "invisible" : ""}
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Wstecz
          </Button>

          {/* Steps */}
          <div className="flex items-center">
            {steps.map((step, index) => {
              const isCompleted = step.number < currentStep;
              const isActive = step.number === currentStep;
              const isLast = index === steps.length - 1;

              return (
                <div key={step.number} className="flex items-center">
                  {/* Step circle */}
                  <div className="flex flex-col items-center min-w-[120px]">
                    <div
                      className={`
                        flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                        ${
                          isCompleted
                            ? "bg-primary border-primary text-primary-foreground"
                            : isActive
                              ? "bg-background border-primary text-primary"
                              : "bg-background border-muted text-muted-foreground"
                        }
                      `}
                      aria-current={isActive ? "step" : undefined}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <span className="font-semibold">{step.number}</span>
                      )}
                    </div>

                    {/* Step label */}
                    <span
                      className={`
                        mt-2 text-xs font-medium text-center whitespace-nowrap
                        ${isActive ? "text-foreground" : "text-muted-foreground"}
                      `}
                    >
                      {step.label}
                    </span>
                  </div>

                  {/* Connector line */}
                  {!isLast && (
                    <div
                      className={`
                        w-20 h-0.5 mx-2 transition-all
                        ${isCompleted ? "bg-primary" : "bg-muted"}
                      `}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Next/Generate button - after step 3 */}
          {currentStep === totalSteps ? (
            <Button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit || isLoading}
              size="sm"
              className="min-w-[140px]"
            >
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
            <Button
              type="button"
              onClick={onNext}
              disabled={!canGoNext || isLoading}
              size="sm"
              className="min-w-[100px]"
            >
              Dalej
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar (optional visual enhancement) */}
      <div className="mt-6 w-full bg-muted rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-primary h-full transition-all duration-300 ease-in-out"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-label={`Progress: step ${currentStep} of ${totalSteps}`}
        />
      </div>

      {/* Mobile Navigation Buttons */}
      <div className="flex sm:hidden mt-6 w-full items-center justify-between gap-4">
        {/* Back button */}
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          disabled={currentStep === 1 || isLoading}
          className={currentStep === 1 ? "invisible" : ""}
          size="sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Wstecz
        </Button>

        <div className="flex-1" />

        {/* Next or Generate button */}
        {currentStep === totalSteps ? (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit || isLoading}
            size="sm"
            className="min-w-[140px]"
          >
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
          <Button type="button" onClick={onNext} disabled={!canGoNext || isLoading} size="sm" className="min-w-[100px]">
            Dalej
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
