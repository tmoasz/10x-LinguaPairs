/**
 * useGenerateWizard Hook
 *
 * Custom hook managing the entire wizard state, validation, and API calls
 * Handles loading data (decks, languages, quota), form state, and generation
 */

import { useState, useEffect, useCallback } from "react";
import {
  validateStep1,
  validateStep2,
  validateStep3,
  getDefaultLanguages,
  isOnboarding,
  mapCreateDeckResponseToListItem,
  formatApiError,
} from "./utils";
import { DEFAULT_WIZARD_STATE } from "./types";
import type { GenerationWizardState, WizardStep, LoadingStates, ErrorStates } from "./types";
import type {
  DeckListItemDTO,
  LanguageDTO,
  QuotaDTO,
  CreateDeckDTO,
  GenerateFromTopicDTO,
  GenerateFromTextDTO,
  GenerationResponseDTO,
  CreateDeckResponseDTO,
  DecksListDTO,
  LanguagesListDTO,
  TopicID,
} from "@/types";

export function useGenerateWizard() {
  // Main wizard state
  const [state, setState] = useState<GenerationWizardState>(DEFAULT_WIZARD_STATE);

  // Data from API
  const [decks, setDecks] = useState<DeckListItemDTO[]>([]);
  const [languages, setLanguages] = useState<LanguageDTO[]>([]);
  const [quota, setQuota] = useState<QuotaDTO | null>(null);

  // Loading states
  const [loading, setLoading] = useState<LoadingStates>({
    quota: false,
    decks: false,
    languages: false,
    creatingDeck: false,
    generating: false,
  });

  // Error states
  const [errors, setErrors] = useState<ErrorStates>({
    quota: null,
    decks: null,
    languages: null,
    createDeck: null,
    generation: null,
    validation: {},
  });

  // ============================================================================
  // API Functions
  // ============================================================================

  const fetchQuota = useCallback(async () => {
    setLoading((prev) => ({ ...prev, quota: true }));
    setErrors((prev) => ({ ...prev, quota: null }));

    try {
      const response = await fetch("/api/users/me/quota");
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/auth/login?redirect=/generate";
          return;
        }
        throw new Error(`Failed to fetch quota: ${response.status}`);
      }
      const data: QuotaDTO = await response.json();
      setQuota(data);
    } catch (error) {
      const message = formatApiError(error);
      setErrors((prev) => ({ ...prev, quota: message }));
    } finally {
      setLoading((prev) => ({ ...prev, quota: false }));
    }
  }, []);

  const fetchDecks = useCallback(async () => {
    setLoading((prev) => ({ ...prev, decks: true }));
    setErrors((prev) => ({ ...prev, decks: null }));

    try {
      const response = await fetch("/api/decks?page=1&limit=100");
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/auth/login?redirect=/generate";
          return;
        }
        throw new Error(`Failed to fetch decks: ${response.status}`);
      }
      const data: DecksListDTO = await response.json();
      setDecks(data.decks);

      // Check if onboarding and set createDeckMode
      if (isOnboarding(data.decks)) {
        setState((prev) => ({ ...prev, createDeckMode: true }));
      } else if (data.decks.length > 0) {
        // Auto-select first deck (newest, as API sorts by created_at desc)
        // Only if not already selected
        setState((prev) => {
          if (!prev.selectedDeckId) {
            return {
              ...prev,
              selectedDeckId: data.decks[0].id,
              createDeckMode: false,
            };
          }
          return prev;
        });
      }
    } catch (error) {
      const message = formatApiError(error);
      setErrors((prev) => ({ ...prev, decks: message }));
    } finally {
      setLoading((prev) => ({ ...prev, decks: false }));
    }
  }, []);

  const fetchLanguages = useCallback(async () => {
    setLoading((prev) => ({ ...prev, languages: true }));
    setErrors((prev) => ({ ...prev, languages: null }));

    try {
      const response = await fetch("/api/languages");
      if (!response.ok) {
        throw new Error(`Failed to fetch languages: ${response.status}`);
      }
      const data: LanguagesListDTO = await response.json();
      setLanguages(data.languages);
    } catch (error) {
      const message = formatApiError(error);
      setErrors((prev) => ({ ...prev, languages: message }));
    } finally {
      setLoading((prev) => ({ ...prev, languages: false }));
    }
  }, []);

  const createDeck = useCallback(
    async (deckData: CreateDeckDTO): Promise<DeckListItemDTO> => {
      setLoading((prev) => ({ ...prev, creatingDeck: true }));
      setErrors((prev) => ({ ...prev, createDeck: null }));

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
            window.location.href = "/auth/login?redirect=/generate";
            throw new Error("Unauthorized");
          }
          const errorData = await response.json();
          throw new Error(errorData.error?.message ?? "Failed to create deck");
        }

        const data: CreateDeckResponseDTO = await response.json();
        const newDeck = mapCreateDeckResponseToListItem(data, languages);

        // Add to decks list
        setDecks((prev) => [...prev, newDeck]);

        return newDeck;
      } catch (error) {
        const message = formatApiError(error);
        setErrors((prev) => ({ ...prev, createDeck: message }));
        throw error;
      } finally {
        setLoading((prev) => ({ ...prev, creatingDeck: false }));
      }
    },
    [languages]
  );

  const generateFromTopic = useCallback(async (dto: GenerateFromTopicDTO): Promise<GenerationResponseDTO> => {
    setLoading((prev) => ({ ...prev, generating: true }));
    setErrors((prev) => ({ ...prev, generation: null }));

    try {
      const response = await fetch("/api/generate/from-topic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/auth/login?redirect=/generate";
          throw new Error("Unauthorized");
        }
        const errorData = await response.json();
        throw new Error(errorData.error?.message ?? "Generation failed");
      }

      const data: GenerationResponseDTO = await response.json();
      return data;
    } catch (error) {
      const message = formatApiError(error);
      setErrors((prev) => ({ ...prev, generation: message }));
      throw error;
    } finally {
      setLoading((prev) => ({ ...prev, generating: false }));
    }
  }, []);

  const generateFromText = useCallback(async (dto: GenerateFromTextDTO): Promise<GenerationResponseDTO> => {
    setLoading((prev) => ({ ...prev, generating: true }));
    setErrors((prev) => ({ ...prev, generation: null }));

    try {
      const response = await fetch("/api/generate/from-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dto),
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/auth/login?redirect=/generate";
          throw new Error("Unauthorized");
        }
        const errorData = await response.json();
        throw new Error(errorData.error?.message ?? "Generation failed");
      }

      const data: GenerationResponseDTO = await response.json();
      return data;
    } catch (error) {
      const message = formatApiError(error);
      setErrors((prev) => ({ ...prev, generation: message }));
      throw error;
    } finally {
      setLoading((prev) => ({ ...prev, generating: false }));
    }
  }, []);

  // ============================================================================
  // Validation Functions
  // ============================================================================

  const validateCurrentStep = useCallback((): boolean => {
    const newDeckFormValid =
      state.createDeckMode &&
      state.newDeck?.title !== undefined &&
      state.newDeck.title.length > 0 &&
      state.newDeck?.description !== undefined &&
      state.newDeck.description.length > 0 &&
      state.newDeck?.lang_a !== undefined &&
      state.newDeck?.lang_b !== undefined &&
      state.newDeck.lang_a !== state.newDeck.lang_b;

    switch (state.currentStep) {
      case 1:
        return validateStep1(state, newDeckFormValid);
      case 2:
        return validateStep2(state);
      case 3:
        return validateStep3(state, quota?.remaining ?? 0);
      default:
        return false;
    }
  }, [
    state.currentStep,
    state.createDeckMode,
    state.newDeck,
    state.selectedDeckId,
    state.source,
    state.selectedTopicId,
    state.text,
    quota,
  ]);

  const canGoNext = useCallback((): boolean => {
    return validateCurrentStep() && !loading.generating;
  }, [validateCurrentStep, loading.generating]);

  const canSubmit = useCallback((): boolean => {
    return (
      validateStep1(state, true) &&
      validateStep2(state) &&
      validateStep3(state, quota?.remaining ?? 0) &&
      !loading.generating
    );
  }, [
    state.selectedDeckId,
    state.createDeckMode,
    state.source,
    state.selectedTopicId,
    state.text,
    state.contentType,
    state.register,
    quota,
    loading.generating,
  ]);

  // ============================================================================
  // Action Functions
  // ============================================================================

  const setStep = useCallback((step: WizardStep) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  const goToNextStep = useCallback(() => {
    if (canGoNext()) {
      setState((prev) => ({ ...prev, currentStep: (prev.currentStep + 1) as WizardStep }));
    }
  }, [canGoNext]);

  const goToPreviousStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(1, prev.currentStep - 1) as WizardStep,
    }));
  }, []);

  const selectDeck = useCallback((deckId: string) => {
    setState((prev) => ({
      ...prev,
      selectedDeckId: deckId,
      createDeckMode: false,
      newDeck: null,
    }));
  }, []);

  const setSource = useCallback((source: "topic" | "text") => {
    setState((prev) => ({ ...prev, source }));
  }, []);

  const selectTopic = useCallback((topicId: TopicID) => {
    setState((prev) => ({ ...prev, selectedTopicId: topicId }));
  }, []);

  const setText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, text }));
  }, []);

  const setContentType = useCallback((contentType: typeof state.contentType) => {
    setState((prev) => ({ ...prev, contentType }));
  }, []);

  const setRegister = useCallback((register: typeof state.register) => {
    setState((prev) => ({ ...prev, register }));
  }, []);

  const handleCreateDeck = useCallback(
    async (deckData: CreateDeckDTO): Promise<DeckListItemDTO> => {
      const newDeck = await createDeck(deckData);
      // Auto-select the new deck
      setState((prev) => ({
        ...prev,
        selectedDeckId: newDeck.id,
        createDeckMode: false,
        newDeck: null,
      }));
      return newDeck;
    },
    [createDeck]
  );

  const handleGenerate = useCallback(async () => {
    if (!canSubmit()) {
      return;
    }

    const deckId = state.selectedDeckId;
    if (!deckId) {
      setErrors((prev) => ({ ...prev, generation: "Wybierz talię" }));
      return;
    }

    try {
      if (state.source === "topic") {
        if (!state.selectedTopicId) {
          setErrors((prev) => ({ ...prev, generation: "Wybierz temat" }));
          return;
        }

        await generateFromTopic({
          topic_id: state.selectedTopicId,
          deck_id: deckId,
          content_type: state.contentType,
          register: state.register,
        });
      } else {
        if (!state.text || state.text.length < 10) {
          setErrors((prev) => ({ ...prev, generation: "Tekst musi mieć minimum 10 znaków" }));
          return;
        }
        if (state.text.length > 5000) {
          setErrors((prev) => ({ ...prev, generation: "Tekst może mieć maksymalnie 5000 znaków" }));
          return;
        }

        await generateFromText({
          text: state.text,
          deck_id: deckId,
          content_type: state.contentType,
          register: state.register,
        });
      }

      // Success - redirect to deck detail
      window.location.href = `/decks/${deckId}`;
    } catch {
      // Error already set in generate functions - silent fail with toast
    }
  }, [state, canSubmit, generateFromTopic, generateFromText]);

  // ============================================================================
  // Initial Data Loading
  // ============================================================================

  useEffect(() => {
    // Load all data on mount
    Promise.all([fetchQuota(), fetchDecks(), fetchLanguages()]);
  }, [fetchQuota, fetchDecks, fetchLanguages]);

  // Auto-set default languages when languages are loaded and in onboarding
  useEffect(() => {
    if (languages.length > 0 && isOnboarding(decks)) {
      const defaults = getDefaultLanguages(languages);
      setState((prev) => ({
        ...prev,
        newDeck: {
          ...prev.newDeck,
          lang_a: defaults.langA ?? "",
          lang_b: defaults.langB ?? "",
          visibility: "private",
        },
      }));
    }
  }, [languages, decks]);

  // ============================================================================
  // Return Values
  // ============================================================================

  return {
    // State
    state,
    decks,
    languages,
    quota,
    loading,
    errors,

    // Computed values
    canGoNext: canGoNext(),
    canSubmit: canSubmit(),
    isOnboarding: isOnboarding(decks),
    defaultLanguages: getDefaultLanguages(languages),

    // Actions
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

    // Refresh functions
    refreshQuota: fetchQuota,
    refreshDecks: fetchDecks,
  };
}
