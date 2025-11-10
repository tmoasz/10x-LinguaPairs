import { useCallback, useMemo, useReducer } from "react";
import { DEFAULT_WIZARD_STATE } from "./types";
import type { GenerationWizardState, WizardStep } from "./types";
import { validateStep1, validateStep2, validateStep3 } from "./utils";
import type { CreateDeckDTO, DeckListItemDTO, TopicID } from "@/types";

type WizardAction =
  | { type: "SET_STEP"; payload: WizardStep }
  | { type: "GO_NEXT" }
  | { type: "GO_PREVIOUS" }
  | { type: "SELECT_DECK"; payload: string }
  | { type: "SET_SOURCE"; payload: GenerationWizardState["source"] }
  | { type: "SET_TOPIC"; payload: TopicID | null }
  | { type: "SET_TEXT"; payload: string }
  | { type: "SET_CONTENT_TYPE"; payload: GenerationWizardState["contentType"] }
  | { type: "SET_REGISTER"; payload: GenerationWizardState["register"] }
  | { type: "SET_CREATE_DECK_MODE"; payload: boolean }
  | { type: "UPSERT_NEW_DECK"; payload: Partial<CreateDeckDTO> }
  | { type: "RESET_NEW_DECK" }
  | { type: "SYNC_WITH_DECKS"; payload: DeckListItemDTO[] };

interface UseWizardStateMachineOptions {
  quotaRemaining: number;
  isGenerating: boolean;
}

interface UseWizardStateMachineResult {
  state: GenerationWizardState;
  canGoNext: boolean;
  canSubmit: boolean;
  setStep: (step: WizardStep) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  selectDeck: (deckId: string) => void;
  setSource: (source: GenerationWizardState["source"]) => void;
  selectTopic: (topicId: TopicID | null) => void;
  setText: (text: string) => void;
  setContentType: (value: GenerationWizardState["contentType"]) => void;
  setRegister: (value: GenerationWizardState["register"]) => void;
  syncWithDecks: (decks: DeckListItemDTO[]) => void;
  seedNewDeckDefaults: (defaults: Partial<CreateDeckDTO>) => void;
}

const MIN_STEP: WizardStep = 1;
const MAX_STEP: WizardStep = 3;

function clampStep(step: number): WizardStep {
  return Math.min(MAX_STEP, Math.max(MIN_STEP, step)) as WizardStep;
}

function wizardReducer(state: GenerationWizardState, action: WizardAction): GenerationWizardState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, currentStep: clampStep(action.payload) };
    case "GO_NEXT":
      return { ...state, currentStep: clampStep(state.currentStep + 1) };
    case "GO_PREVIOUS":
      return { ...state, currentStep: clampStep(state.currentStep - 1) };
    case "SELECT_DECK":
      return {
        ...state,
        selectedDeckId: action.payload,
        createDeckMode: false,
        newDeck: null,
      };
    case "SET_SOURCE":
      return { ...state, source: action.payload };
    case "SET_TOPIC":
      return { ...state, selectedTopicId: action.payload };
    case "SET_TEXT":
      return { ...state, text: action.payload };
    case "SET_CONTENT_TYPE":
      return { ...state, contentType: action.payload };
    case "SET_REGISTER":
      return { ...state, register: action.payload };
    case "SET_CREATE_DECK_MODE":
      return { ...state, createDeckMode: action.payload };
    case "UPSERT_NEW_DECK":
      return {
        ...state,
        newDeck: {
          ...(state.newDeck ?? {}),
          ...action.payload,
        },
      };
    case "RESET_NEW_DECK":
      return { ...state, newDeck: null };
    case "SYNC_WITH_DECKS": {
      const decks = action.payload;
      if (decks.length === 0) {
        return {
          ...state,
          createDeckMode: true,
          selectedDeckId: null,
        };
      }

      const hasSelectedDeck = decks.some((deck) => deck.id === state.selectedDeckId);
      if (hasSelectedDeck) {
        return {
          ...state,
          createDeckMode: false,
        };
      }

      return {
        ...state,
        selectedDeckId: decks[0].id,
        createDeckMode: false,
        newDeck: null,
      };
    }
    default:
      return state;
  }
}

export function useWizardStateMachine({
  quotaRemaining,
  isGenerating,
}: UseWizardStateMachineOptions): UseWizardStateMachineResult {
  const [state, dispatch] = useReducer(wizardReducer, DEFAULT_WIZARD_STATE);

  const newDeckFormValid = useMemo(() => {
    if (!state.createDeckMode || !state.newDeck) {
      return false;
    }
    const { title, description, lang_a, lang_b } = state.newDeck;
    return Boolean(
      title &&
        title.length > 0 &&
        description &&
        description.length > 0 &&
        lang_a &&
        lang_b &&
        lang_a !== lang_b
    );
  }, [state.createDeckMode, state.newDeck]);

  const currentStepValid = useMemo(() => {
    switch (state.currentStep) {
      case 1:
        return validateStep1(state, newDeckFormValid);
      case 2:
        return validateStep2(state);
      case 3:
        return validateStep3(state, quotaRemaining);
      default:
        return false;
    }
  }, [state, newDeckFormValid, quotaRemaining]);

  const canGoNext = useMemo(() => currentStepValid && !isGenerating, [currentStepValid, isGenerating]);

  const canSubmit = useMemo(() => {
    return (
      validateStep1(state, true) && validateStep2(state) && validateStep3(state, quotaRemaining) && !isGenerating
    );
  }, [state, quotaRemaining, isGenerating]);

  const setStep = useCallback((step: WizardStep) => {
    dispatch({ type: "SET_STEP", payload: step });
  }, []);

  const goToNextStep = useCallback(() => {
    if (canGoNext) {
      dispatch({ type: "GO_NEXT" });
    }
  }, [canGoNext]);

  const goToPreviousStep = useCallback(() => {
    dispatch({ type: "GO_PREVIOUS" });
  }, []);

  const selectDeck = useCallback((deckId: string) => {
    dispatch({ type: "SELECT_DECK", payload: deckId });
  }, []);

  const setSource = useCallback((source: GenerationWizardState["source"]) => {
    dispatch({ type: "SET_SOURCE", payload: source });
  }, []);

  const selectTopic = useCallback((topicId: TopicID | null) => {
    dispatch({ type: "SET_TOPIC", payload: topicId });
  }, []);

  const setText = useCallback((text: string) => {
    dispatch({ type: "SET_TEXT", payload: text });
  }, []);

  const setContentType = useCallback((value: GenerationWizardState["contentType"]) => {
    dispatch({ type: "SET_CONTENT_TYPE", payload: value });
  }, []);

  const setRegister = useCallback((value: GenerationWizardState["register"]) => {
    dispatch({ type: "SET_REGISTER", payload: value });
  }, []);

  const syncWithDecks = useCallback((decks: DeckListItemDTO[]) => {
    dispatch({ type: "SYNC_WITH_DECKS", payload: decks });
  }, []);

  const seedNewDeckDefaults = useCallback((defaults: Partial<CreateDeckDTO>) => {
    dispatch({ type: "UPSERT_NEW_DECK", payload: defaults });
    dispatch({ type: "SET_CREATE_DECK_MODE", payload: true });
  }, []);

  return {
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
  };
}
