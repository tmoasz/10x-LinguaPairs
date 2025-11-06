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
 * Based on TopicID enum from types.ts
 */
export const TOPICS: TopicOption[] = [
  {
    id: "travel",
    label: "Podróże i Turystyka",
    description: "Słownictwo przydatne w podróży",
    icon: "✈️",
  },
  {
    id: "business",
    label: "Biznes",
    description: "Terminologia biznesowa i korporacyjna",
    icon: "💼",
  },
  {
    id: "food",
    label: "Jedzenie i Picie",
    description: "Nazwy potraw, składników i napojów",
    icon: "🍕",
  },
  {
    id: "technology",
    label: "Technologia",
    description: "IT, programowanie, urządzenia",
    icon: "💻",
  },
  {
    id: "health",
    label: "Zdrowie",
    description: "Medycyna, fitness, dobre samopoczucie",
    icon: "🏥",
  },
  {
    id: "education",
    label: "Edukacja",
    description: "Szkoła, nauka, uniwersytet",
    icon: "📚",
  },
  {
    id: "shopping",
    label: "Zakupy",
    description: "Sklepy, ubrania, płatności",
    icon: "🛍️",
  },
  {
    id: "family",
    label: "Rodzina",
    description: "Relacje rodzinne, członkowie rodziny",
    icon: "👨‍👩‍👧‍👦",
  },
  {
    id: "hobbies",
    label: "Hobby",
    description: "Zainteresowania i pasje",
    icon: "🎨",
  },
  {
    id: "sports",
    label: "Sport",
    description: "Dyscypliny sportowe, aktywność fizyczna",
    icon: "⚽",
  },
  {
    id: "nature",
    label: "Przyroda",
    description: "Zwierzęta, rośliny, środowisko",
    icon: "🌳",
  },
  {
    id: "culture",
    label: "Kultura",
    description: "Sztuka, muzyka, literatura",
    icon: "🎭",
  },
  {
    id: "emotions",
    label: "Emocje",
    description: "Uczucia, nastroje, stany psychiczne",
    icon: "😊",
  },
  {
    id: "time",
    label: "Czas",
    description: "Dni tygodnia, miesiące, pory roku",
    icon: "⏰",
  },
  {
    id: "weather",
    label: "Pogoda",
    description: "Warunki pogodowe, klimat",
    icon: "🌤️",
  },
  {
    id: "transport",
    label: "Transport",
    description: "Środki transportu, podróżowanie",
    icon: "🚗",
  },
  {
    id: "communication",
    label: "Komunikacja",
    description: "Rozmowa, języki, media",
    icon: "💬",
  },
  {
    id: "home",
    label: "Dom",
    description: "Meble, urządzenia domowe, pomieszczenia",
    icon: "🏠",
  },
  {
    id: "work",
    label: "Praca",
    description: "Zawody, biuro, kariera",
    icon: "💼",
  },
  {
    id: "emergency",
    label: "Sytuacje Awaryjne",
    description: "Pomoc, bezpieczeństwo, nagłe wypadki",
    icon: "🚨",
  },
];

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
