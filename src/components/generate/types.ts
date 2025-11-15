/**
 * Type definitions for Generate Wizard
 *
 * Contains ViewModel types, topic definitions, and utility types
 * for the multi-step generation wizard.
 */

import type {
  TopicID,
  GenerationContentType,
  GenerationRegister,
  CreateDeckDTO,
  DeckListItemDTO,
  LanguageDTO,
  QuotaDTO,
} from "@/types";
import { TOPIC_DEFINITIONS } from "@/lib/constants/topics";

/**
 * Main wizard state - tracks all form data and UI state
 */
export interface GenerationWizardState {
  // Krok 1: Wybór talii
  selectedDeckId: string | null;
  createDeckMode: boolean;
  newDeck: Partial<CreateDeckDTO> | null;

  // Krok 2: Źródło generacji
  source: "topic" | "text";
  selectedTopicId: TopicID | null;
  text: string;

  // Krok 3: Parametry
  contentType: GenerationContentType;
  register: GenerationRegister;

  // Stan formularza
  currentStep: WizardStep;
  isLoading: boolean;
  error: string | null;
  validationErrors: Record<string, string>;
}

/**
 * Wizard step number (1, 2, or 3)
 */
export type WizardStep = 1 | 2 | 3;

/**
 * Topic option with display information
 */
export interface TopicOption {
  id: TopicID;
  label: string;
  description: string;
  icon: string; // Emoji icon
}

/**
 * Validation error for a specific field
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Loading states for different async operations
 */
export interface LoadingStates {
  quota: boolean;
  decks: boolean;
  languages: boolean;
  creatingDeck: boolean;
  generating: boolean;
}

/**
 * Error states for different operations
 */
export interface ErrorStates {
  quota: string | null;
  decks: string | null;
  languages: string | null;
  createDeck: string | null;
  generation: string | null;
  validation: Record<string, string>;
}

/**
 * Wizard data - all required data for the wizard
 */
export interface WizardData {
  decks: DeckListItemDTO[];
  languages: LanguageDTO[];
  quota: QuotaDTO | null;
}

/**
 * Predefined topics with labels, descriptions and icons
 * Generated from TOPIC_DEFINITIONS (single source of truth in @/lib/constants/topics)
 */
export const TOPICS: TopicOption[] = (Object.keys(TOPIC_DEFINITIONS) as TopicID[]).map((id) => ({
  id,
  ...TOPIC_DEFINITIONS[id],
}));

/**
 * Default values for wizard state
 */
export const DEFAULT_WIZARD_STATE: GenerationWizardState = {
  selectedDeckId: null,
  createDeckMode: false,
  newDeck: null,
  source: "topic",
  selectedTopicId: null,
  text: "",
  contentType: "auto",
  register: "neutral",
  currentStep: 1,
  isLoading: false,
  error: null,
  validationErrors: {},
};

/**
 * Content type options with labels and descriptions
 */
export const CONTENT_TYPE_OPTIONS: {
  value: GenerationContentType;
  label: string;
  description: string;
}[] = [
  {
    value: "auto",
    label: "Automatyczny",
    description: "AI zdecyduje co najlepsze dla tego kontekstu",
  },
  {
    value: "words",
    label: "Pojedyncze słowa",
    description: "Tylko pojedyncze słowa i ich tłumaczenia",
  },
  {
    value: "mini-phrases",
    label: "Krótkie frazy",
    description: "Krótkie wyrażenia i zwroty (2-4 słowa)",
  },
  {
    value: "phrases",
    label: "Frazy",
    description: "Dłuższe frazy i zdania",
  },
];

/**
 * Register options with labels and descriptions
 */
export const REGISTER_OPTIONS: {
  value: GenerationRegister;
  label: string;
  description: string;
}[] = [
  {
    value: "neutral",
    label: "Neutralny",
    description: "Uniwersalne słownictwo na co dzień",
  },
  {
    value: "informal",
    label: "Nieformalny",
    description: "Potoczny język, slang",
  },
  {
    value: "formal",
    label: "Formalny",
    description: "Oficjalny, biznesowy ton",
  },
];
