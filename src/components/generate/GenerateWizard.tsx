/**
 * GenerateWizard Component
 *
 * Main wizard container managing the three-step generation process:
 * 1. Select/create deck
 * 2. Choose generation source (topic or text)
 * 3. Configure parameters and generate
 */

import { useEffect } from "react";
import { toast } from "sonner";
import { useGenerateWizard } from "./useGenerateWizard";
import StepIndicator from "./StepIndicator";
import Step1DeckSelection from "./Step1DeckSelection";
import Step2SourceSelection from "./Step2SourceSelection";
import Step3Parameters from "./Step3Parameters";
import { Loader2 } from "lucide-react";

export default function GenerateWizard() {
  const {
    state,
    decks,
    languages,
    quota,
    loading,
    errors,
    canGoNext,
    canSubmit,
    defaultLanguages,
    goToNextStep,
    goToPreviousStep,
    selectDeck,
    setSource,
    selectTopic,
    setText,
    setContentType,
    setRegister,
    handleCreateDeck,
    handleGenerate,
  } = useGenerateWizard();

  // Show error toasts
  useEffect(() => {
    if (errors.quota) {
      toast.error("Błąd ładowania limitu", { description: errors.quota });
    }
    if (errors.decks) {
      toast.error("Błąd ładowania talii", { description: errors.decks });
    }
    if (errors.languages) {
      toast.error("Błąd ładowania języków", { description: errors.languages });
    }
    if (errors.generation) {
      toast.error("Błąd generacji", { description: errors.generation });
    }
  }, [errors]);

  // Loading state while fetching initial data
  const isInitialLoading = loading.decks || loading.languages;

  if (isInitialLoading) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Ładowanie danych...</p>
      </div>
    );
  }

  // Error state if critical data failed to load
  if (errors.decks || errors.languages) {
    return (
      <div className="w-full p-6 border border-destructive/50 rounded-lg bg-destructive/10">
        <h3 className="text-lg font-semibold text-destructive mb-2">Wystąpił błąd</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Nie udało się załadować wymaganych danych. Sprawdź połączenie i spróbuj ponownie.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Odśwież stronę
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Step Indicator with Navigation */}
      <StepIndicator
        currentStep={state.currentStep}
        totalSteps={3}
        canGoNext={canGoNext}
        canSubmit={canSubmit}
        isLoading={loading.generating}
        onPrevious={goToPreviousStep}
        onNext={goToNextStep}
        onSubmit={handleGenerate}
      />

      {/* Wizard Content */}
      <div className="bg-card border rounded-lg p-6 md:p-8 mb-6">
        {/* Step 1: Deck Selection */}
        {state.currentStep === 1 && (
          <Step1DeckSelection
            decks={decks}
            languages={languages}
            selectedDeckId={state.selectedDeckId}
            defaultLangA={defaultLanguages.langA}
            defaultLangB={defaultLanguages.langB}
            onDeckSelect={selectDeck}
            onDeckCreate={handleCreateDeck}
          />
        )}

        {/* Step 2: Source Selection */}
        {state.currentStep === 2 && (
          <Step2SourceSelection
            source={state.source}
            selectedTopicId={state.selectedTopicId}
            text={state.text}
            onSourceChange={setSource}
            onTopicSelect={selectTopic}
            onTextChange={setText}
          />
        )}

        {/* Step 3: Parameters */}
        {state.currentStep === 3 && (
          <Step3Parameters
            contentType={state.contentType}
            register={state.register}
            quota={quota}
            isLoadingQuota={loading.quota}
            onContentTypeChange={setContentType}
            onRegisterChange={setRegister}
          />
        )}
      </div>

      {/* Loading Overlay during generation */}
      {loading.generating && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border rounded-lg p-8 shadow-lg flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-1">Generowanie w toku...</h3>
              <p className="text-sm text-muted-foreground">
                AI tworzy dla Ciebie 50 nowych par słówek. To może potrwać chwilę.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
