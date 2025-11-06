/**
 * Utility functions for Generate Wizard
 *
 * Contains validation helpers, data mapping functions,
 * and other utilities used by the wizard components.
 */

import type { CreateDeckDTO, CreateDeckResponseDTO, DeckListItemDTO, LanguageDTO, LanguageRefDTO } from "@/types";
import type { GenerationWizardState, ValidationError } from "./types";

/**
 * Validates deck selection (Step 1)
 * Returns true if user has selected a deck OR is creating a new one
 */
export function validateStep1(state: GenerationWizardState, newDeckFormValid: boolean): boolean {
  if (state.createDeckMode) {
    return newDeckFormValid;
  }
  return state.selectedDeckId !== null;
}

/**
 * Validates source selection (Step 2)
 * Returns true if user has selected a topic OR entered valid text
 */
export function validateStep2(state: GenerationWizardState): boolean {
  if (state.source === "topic") {
    return state.selectedTopicId !== null;
  }
  // Text source - minimum 10 characters for meaningful context
  return state.text.length >= 10 && state.text.length <= 5000;
}

/**
 * Validates parameters (Step 3)
 * Parameters have defaults, so always valid unless quota is 0
 */
export function validateStep3(state: GenerationWizardState, quotaRemaining: number): boolean {
  // Content type and register have defaults, so check quota
  return quotaRemaining > 0;
}

/**
 * Validates CreateDeckDTO form data
 * Returns validation errors or empty object if valid
 */
export function validateCreateDeck(deck: Partial<CreateDeckDTO>): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!deck.title || deck.title.trim().length === 0) {
    errors.title = "Tytuł jest wymagany";
  } else if (deck.title.length > 200) {
    errors.title = "Tytuł może mieć maksymalnie 200 znaków";
  }

  if (!deck.description || deck.description.trim().length === 0) {
    errors.description = "Opis jest wymagany";
  } else if (deck.description.length > 1000) {
    errors.description = "Opis może mieć maksymalnie 1000 znaków";
  }

  if (!deck.lang_a) {
    errors.lang_a = "Język A jest wymagany";
  }

  if (!deck.lang_b) {
    errors.lang_b = "Język B jest wymagany";
  }

  if (deck.lang_a && deck.lang_b && deck.lang_a === deck.lang_b) {
    errors.lang_b = "Języki muszą być różne";
  }

  return errors;
}

/**
 * Validates text input (for text source)
 * Returns error message or null if valid
 */
export function validateText(text: string): string | null {
  if (text.length === 0) {
    return "Tekst nie może być pusty";
  }
  if (text.length < 10) {
    return "Tekst musi mieć minimum 10 znaków";
  }
  if (text.length > 5000) {
    return "Tekst może mieć maksymalnie 5000 znaków";
  }
  return null;
}

/**
 * Maps CreateDeckResponseDTO to DeckListItemDTO
 * Resolves language UUIDs to full LanguageRefDTO objects
 */
export function mapCreateDeckResponseToListItem(
  response: CreateDeckResponseDTO,
  languages: LanguageDTO[]
): DeckListItemDTO {
  const langA = languages.find((l) => l.id === response.lang_a);
  const langB = languages.find((l) => l.id === response.lang_b);

  if (!langA || !langB) {
    throw new Error("Language not found in languages list");
  }

  const langARef: LanguageRefDTO = {
    id: langA.id,
    code: langA.code,
    name: langA.name,
  };

  const langBRef: LanguageRefDTO = {
    id: langB.id,
    code: langB.code,
    name: langB.name,
  };

  return {
    id: response.id,
    owner_user_id: response.owner_user_id,
    title: response.title,
    description: response.description,
    lang_a: langARef,
    lang_b: langBRef,
    visibility: response.visibility,
    pairs_count: response.pairs_count,
    created_at: response.created_at,
    updated_at: response.updated_at,
  };
}

/**
 * Gets default language IDs for onboarding
 * Returns Polish (PL) and English (EN) if available
 */
export function getDefaultLanguages(languages: LanguageDTO[]): {
  langA: string | null;
  langB: string | null;
} {
  const polish = languages.find((l) => l.code.toLowerCase() === "pl");
  const english = languages.find((l) => l.code.toLowerCase() === "en");

  return {
    langA: polish?.id ?? null,
    langB: english?.id ?? null,
  };
}

/**
 * Checks if user is in onboarding flow (no decks yet)
 */
export function isOnboarding(decks: DeckListItemDTO[]): boolean {
  return decks.length === 0;
}

/**
 * Formats error message from API response
 */
export function formatApiError(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return "Wystąpił nieoczekiwany błąd";
}

/**
 * Converts validation errors array to record
 */
export function validationErrorsToRecord(errors: ValidationError[]): Record<string, string> {
  return errors.reduce(
    (acc, err) => {
      acc[err.field] = err.message;
      return acc;
    },
    {} as Record<string, string>
  );
}

/**
 * Checks if text length is sufficient for generation context
 * Returns warning level and message based on text length:
 * - "danger" (<10 chars): Bardzo mało precyzyjny opis
 * - "warning" (10-49 chars): Mało precyzyjny opis - dodaj więcej szczegółów
 * - null (>=50 chars): Wystarczający kontekst
 */
export function getTextLengthWarningLevel(length: number): {
  level: "danger" | "warning" | null;
  message: string | null;
} {
  if (length === 0) {
    return { level: null, message: null };
  }
  if (length < 10) {
    return { level: "danger", message: "Tekst musi mieć minimum 10 znaków" };
  }
  if (length < 50) {
    return { level: "warning", message: "Mało precyzyjny opis - dodaj więcej szczegółów dla lepszych wyników" };
  }
  return { level: null, message: null };
}

/**
 * Formats quota display text
 */
export function formatQuotaText(used: number, limit: number): string {
  return `Użyto dzisiaj: ${used} / ${limit}`;
}

/**
 * Gets user-friendly error message based on error code
 */
export function getErrorMessageForCode(code: string, defaultMessage: string): string {
  const errorMessages: Record<string, string> = {
    UNAUTHORIZED: "Sesja wygasła. Zaloguj się ponownie.",
    QUOTA_EXCEEDED: "Dzienny limit generacji został przekroczony. Spróbuj ponownie jutro.",
    DECK_NOT_FOUND: "Talia nie została znaleziona.",
    GENERATION_IN_PROGRESS: "Inna generacja jest w toku. Poczekaj na zakończenie.",
    PAYLOAD_TOO_LARGE: "Tekst jest za długi. Maksymalna długość to 5000 znaków.",
    VALIDATION_ERROR: "Dane formularza są nieprawidłowe.",
    INTERNAL_ERROR: "Wystąpił błąd serwera. Spróbuj ponownie za chwilę.",
    SERVICE_UNAVAILABLE: "Usługa jest tymczasowo niedostępna. Spróbuj ponownie za chwilę.",
  };

  return errorMessages[code] ?? defaultMessage;
}
