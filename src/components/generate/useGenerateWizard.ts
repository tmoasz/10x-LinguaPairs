/**
 * useGenerateWizard Hook
 *
 * Composes smaller hooks responsible for state management, data loading
 * and API mutations required by the multi-step generation wizard.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWizardStateMachine } from "./useWizardStateMachine";
import { useWizardResources } from "./useWizardResources";
import {
  getDefaultLanguages,
  isOnboarding,
  mapCreateDeckResponseToListItem,
  formatApiError,
} from "./utils";
import type { ErrorStates, LoadingStates } from "./types";
import type {
  CreateDeckDTO,
  CreateDeckResponseDTO,
  GenerateFromTopicDTO,
  GenerateFromTextDTO,
  GenerationResponseDTO,
} from "@/types";

const LOGIN_REDIRECT = "/auth/login?redirect=/generate";

type MutationLoadingState = Pick<LoadingStates, "creatingDeck" | "generating">;
type MutationErrorState = Pick<ErrorStates, "createDeck" | "generation">;

function redirectToLogin() {
  window.location.href = LOGIN_REDIRECT;
}

export function useGenerateWizard() {
  const {
    decks,
    languages,
    quota,
    loading: resourceLoading,
    errors: resourceErrors,
    decksLoaded,
    languagesLoaded,
    fetchQuota,
    fetchDecks,
    fetchLanguages,
    addDeck,
  } = useWizardResources();

  const [mutationLoading, setMutationLoading] = useState<MutationLoadingState>({
    creatingDeck: false,
    generating: false,
  });
  const [mutationErrors, setMutationErrors] = useState<MutationErrorState>({
    createDeck: null,
    generation: null,
  });

  const {
    state,
    canGoNext,
    canSubmit,
    setStep,
    goToNextStep,
    goToPreviousStep,
    selectDeck,
    setSource,
    selectTopic,
    setText,
    setContentType,
    setRegister,
    syncWithDecks,
    seedNewDeckDefaults,
  } = useWizardStateMachine({
    quotaRemaining: quota?.remaining ?? 0,
    isGenerating: mutationLoading.generating,
  });

  // ============================================================================
  // Data loading side effects
  // ============================================================================

  useEffect(() => {
    fetchQuota().catch(() => undefined);
    fetchDecks().catch(() => undefined);
    fetchLanguages().catch(() => undefined);
  }, [fetchQuota, fetchDecks, fetchLanguages]);

  useEffect(() => {
    if (decksLoaded) {
      syncWithDecks(decks);
    }
  }, [decksLoaded, decks, syncWithDecks]);

  useEffect(() => {
    if (!decksLoaded || !languagesLoaded) {
      return;
    }
    if (!isOnboarding(decks) || languages.length === 0) {
      return;
    }
    const defaults = getDefaultLanguages(languages);
    seedNewDeckDefaults({
      lang_a: defaults.langA ?? "",
      lang_b: defaults.langB ?? "",
      visibility: "private",
    });
  }, [decksLoaded, languagesLoaded, decks, languages, seedNewDeckDefaults]);

  // ============================================================================
  // API mutations
  // ============================================================================

  const createDeckRequest = useCallback(
    async (deckData: CreateDeckDTO) => {
      setMutationLoading((prev) => ({ ...prev, creatingDeck: true }));
      setMutationErrors((prev) => ({ ...prev, createDeck: null }));

      try {
        const response = await fetch("/api/decks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(deckData),
        });

        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin();
            throw new Error("Unauthorized");
          }

          let message = "Failed to create deck";
          try {
            const errorData = await response.json();
            message = errorData.error?.message ?? message;
          } catch {
            // Ignore JSON parsing errors and fall back to default message
          }
          throw new Error(message);
        }

        const data: CreateDeckResponseDTO = await response.json();
        const newDeck = mapCreateDeckResponseToListItem(data, languages);
        addDeck(newDeck);
        return newDeck;
      } catch (error) {
        const message = formatApiError(error);
        setMutationErrors((prev) => ({ ...prev, createDeck: message }));
        throw error;
      } finally {
        setMutationLoading((prev) => ({ ...prev, creatingDeck: false }));
      }
    },
    [languages, addDeck]
  );

  const runGenerationRequest = useCallback(
    async (
      endpoint: "/api/generate/from-topic" | "/api/generate/from-text",
      payload: GenerateFromTopicDTO | GenerateFromTextDTO
    ) => {
      setMutationLoading((prev) => ({ ...prev, generating: true }));
      setMutationErrors((prev) => ({ ...prev, generation: null }));

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin();
            throw new Error("Unauthorized");
          }

          let message = "Generation failed";
          try {
            const errorData = await response.json();
            message = errorData.error?.message ?? message;
          } catch {
            // Ignore JSON parsing errors and keep default message
          }
          throw new Error(message);
        }

        const data: GenerationResponseDTO = await response.json();
        return data;
      } catch (error) {
        const message = formatApiError(error);
        setMutationErrors((prev) => ({ ...prev, generation: message }));
        throw error;
      } finally {
        setMutationLoading((prev) => ({ ...prev, generating: false }));
      }
    },
    []
  );

  const handleCreateDeck = useCallback(
    async (deckData: CreateDeckDTO) => {
      const newDeck = await createDeckRequest(deckData);
      selectDeck(newDeck.id);
      return newDeck;
    },
    [createDeckRequest, selectDeck]
  );

  const handleGenerate = useCallback(async () => {
    if (!canSubmit) {
      return;
    }

    const deckId = state.selectedDeckId;
    if (!deckId) {
      setMutationErrors((prev) => ({ ...prev, generation: "Wybierz talię" }));
      return;
    }

    try {
      if (state.source === "topic") {
        if (!state.selectedTopicId) {
          setMutationErrors((prev) => ({ ...prev, generation: "Wybierz temat" }));
          return;
        }

        const payload: GenerateFromTopicDTO = {
          topic_id: state.selectedTopicId,
          deck_id: deckId,
          content_type: state.contentType,
          register: state.register,
        };
        await runGenerationRequest("/api/generate/from-topic", payload);
      } else {
        if (!state.text || state.text.length < 10) {
          setMutationErrors((prev) => ({ ...prev, generation: "Tekst musi mieć minimum 10 znaków" }));
          return;
        }
        if (state.text.length > 5000) {
          setMutationErrors((prev) => ({ ...prev, generation: "Tekst może mieć maksymalnie 5000 znaków" }));
          return;
        }

        const payload: GenerateFromTextDTO = {
          text: state.text,
          deck_id: deckId,
          content_type: state.contentType,
          register: state.register,
        };
        await runGenerationRequest("/api/generate/from-text", payload);
      }

      window.location.href = `/decks/${deckId}`;
    } catch {
      // Error already stored in mutationErrors
    }
  }, [state, canSubmit, runGenerationRequest]);

  // ============================================================================
  // Derived helpers
  // ============================================================================

  const loading: LoadingStates = useMemo(
    () => ({
      quota: resourceLoading.quota,
      decks: resourceLoading.decks,
      languages: resourceLoading.languages,
      creatingDeck: mutationLoading.creatingDeck,
      generating: mutationLoading.generating,
    }),
    [resourceLoading, mutationLoading]
  );

  const errors: ErrorStates = useMemo(
    () => ({
      quota: resourceErrors.quota,
      decks: resourceErrors.decks,
      languages: resourceErrors.languages,
      createDeck: mutationErrors.createDeck,
      generation: mutationErrors.generation,
      validation: {},
    }),
    [resourceErrors, mutationErrors]
  );

  const defaultLanguages = useMemo(() => getDefaultLanguages(languages), [languages]);
  const onboarding = useMemo(() => isOnboarding(decks), [decks]);

  return {
    state,
    decks,
    languages,
    quota,
    loading,
    errors,
    canGoNext,
    canSubmit,
    isOnboarding: onboarding,
    defaultLanguages,
    setStep,
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
    refreshQuota: fetchQuota,
    refreshDecks: fetchDecks,
  };
}
