/**
 * StepIndicator Component
 *
 * Visual indicator showing current step progress (1/3, 2/3, 3/3)
 * Displays status for each step: completed, active, or pending
 */

import { Check } from "lucide-react";
import type { WizardStep } from "./types";

interface StepIndicatorProps {
  currentStep: WizardStep;
  totalSteps: number;
}

export default function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
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

      {/* Desktop: Visual step indicator */}
      <div className="hidden sm:block w-full max-w-2xl">
        <div className="flex items-center justify-center">
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
                    {isCompleted ? <Check className="w-5 h-5" /> : <span className="font-semibold">{step.number}</span>}
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
    </div>
  );
}
