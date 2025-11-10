/**
 * Unit tests for Generate Wizard utilities
 *
 * Tests cover validation functions, data mapping, error handling,
 * and business logic with edge cases and boundary conditions.
 */

import type { CreateDeckDTO, CreateDeckResponseDTO, DeckListItemDTO, LanguageDTO } from "@/types";
import type { GenerationWizardState } from "./types";
import {
  validateStep1,
  validateStep2,
  validateStep3,
  validateCreateDeck,
  validateText,
  mapCreateDeckResponseToListItem,
  getDefaultLanguages,
  isOnboarding,
  formatApiError,
  validationErrorsToRecord,
  getTextLengthWarningLevel,
  formatQuotaText,
  getErrorMessageForCode,
} from "./utils";

describe("Generate Wizard Utils", () => {
  describe("validateStep1", () => {
    it("should return true when deck is selected", () => {
      const state: GenerationWizardState = {
        selectedDeckId: "deck-123",
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

      expect(validateStep1(state, false)).toBe(true);
    });

    it("should return false when no deck is selected and not in create mode", () => {
      const state: GenerationWizardState = {
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

      expect(validateStep1(state, false)).toBe(false);
    });

    it("should return true when in create mode and form is valid", () => {
      const state: GenerationWizardState = {
        selectedDeckId: null,
        createDeckMode: true,
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

      expect(validateStep1(state, true)).toBe(true);
    });

    it("should return false when in create mode and form is invalid", () => {
      const state: GenerationWizardState = {
        selectedDeckId: null,
        createDeckMode: true,
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

      expect(validateStep1(state, false)).toBe(false);
    });
  });

  describe("validateStep2", () => {
    it("should return true when topic is selected", () => {
      const state: GenerationWizardState = {
        selectedDeckId: "deck-123",
        createDeckMode: false,
        newDeck: null,
        source: "topic",
        selectedTopicId: "travel",
        text: "",
        contentType: "auto",
        register: "neutral",
        currentStep: 1,
        isLoading: false,
        error: null,
        validationErrors: {},
      };

      expect(validateStep2(state)).toBe(true);
    });

    it("should return false when topic source is selected but no topic chosen", () => {
      const state: GenerationWizardState = {
        selectedDeckId: "deck-123",
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

      expect(validateStep2(state)).toBe(false);
    });

    it("should return true when text source has valid length (minimum 10 chars)", () => {
      const state: GenerationWizardState = {
        selectedDeckId: "deck-123",
        createDeckMode: false,
        newDeck: null,
        source: "text",
        selectedTopicId: null,
        text: "This is a valid text input with at least 10 characters",
        contentType: "auto",
        register: "neutral",
        currentStep: 1,
        isLoading: false,
        error: null,
        validationErrors: {},
      };

      expect(validateStep2(state)).toBe(true);
    });

    it("should return true when text source has exactly 10 characters", () => {
      const state: GenerationWizardState = {
        selectedDeckId: "deck-123",
        createDeckMode: false,
        newDeck: null,
        source: "text",
        selectedTopicId: null,
        text: "1234567890",
        contentType: "auto",
        register: "neutral",
        currentStep: 1,
        isLoading: false,
        error: null,
        validationErrors: {},
      };

      expect(validateStep2(state)).toBe(true);
    });

    it("should return false when text source has less than 10 characters", () => {
      const state: GenerationWizardState = {
        selectedDeckId: "deck-123",
        createDeckMode: false,
        newDeck: null,
        source: "text",
        selectedTopicId: null,
        text: "Short",
        contentType: "auto",
        register: "neutral",
        currentStep: 1,
        isLoading: false,
        error: null,
        validationErrors: {},
      };

      expect(validateStep2(state)).toBe(false);
    });

    it("should return false when text source is empty", () => {
      const state: GenerationWizardState = {
        selectedDeckId: "deck-123",
        createDeckMode: false,
        newDeck: null,
        source: "text",
        selectedTopicId: null,
        text: "",
        contentType: "auto",
        register: "neutral",
        currentStep: 1,
        isLoading: false,
        error: null,
        validationErrors: {},
      };

      expect(validateStep2(state)).toBe(false);
    });

    it("should return true when text source has maximum length (5000 chars)", () => {
      const state: GenerationWizardState = {
        selectedDeckId: "deck-123",
        createDeckMode: false,
        newDeck: null,
        source: "text",
        selectedTopicId: null,
        text: "a".repeat(5000),
        contentType: "auto",
        register: "neutral",
        currentStep: 1,
        isLoading: false,
        error: null,
        validationErrors: {},
      };

      expect(validateStep2(state)).toBe(true);
    });

    it("should return false when text source exceeds maximum length (5001 chars)", () => {
      const state: GenerationWizardState = {
        selectedDeckId: "deck-123",
        createDeckMode: false,
        newDeck: null,
        source: "text",
        selectedTopicId: null,
        text: "a".repeat(5001),
        contentType: "auto",
        register: "neutral",
        currentStep: 1,
        isLoading: false,
        error: null,
        validationErrors: {},
      };

      expect(validateStep2(state)).toBe(false);
    });
  });

  describe("validateStep3", () => {
    it("should return true when quota is greater than 0", () => {
      const state: GenerationWizardState = {
        selectedDeckId: "deck-123",
        createDeckMode: false,
        newDeck: null,
        source: "topic",
        selectedTopicId: "travel",
        text: "",
        contentType: "auto",
        register: "neutral",
        currentStep: 1,
        isLoading: false,
        error: null,
        validationErrors: {},
      };

      expect(validateStep3(state, 5)).toBe(true);
    });

    it("should return false when quota is 0", () => {
      const state: GenerationWizardState = {
        selectedDeckId: "deck-123",
        createDeckMode: false,
        newDeck: null,
        source: "topic",
        selectedTopicId: "travel",
        text: "",
        contentType: "auto",
        register: "neutral",
        currentStep: 1,
        isLoading: false,
        error: null,
        validationErrors: {},
      };

      expect(validateStep3(state, 0)).toBe(false);
    });

    it("should return false when quota is negative", () => {
      const state: GenerationWizardState = {
        selectedDeckId: "deck-123",
        createDeckMode: false,
        newDeck: null,
        source: "topic",
        selectedTopicId: "travel",
        text: "",
        contentType: "auto",
        register: "neutral",
        currentStep: 1,
        isLoading: false,
        error: null,
        validationErrors: {},
      };

      expect(validateStep3(state, -1)).toBe(false);
    });

    it("should return true when quota is exactly 1", () => {
      const state: GenerationWizardState = {
        selectedDeckId: "deck-123",
        createDeckMode: false,
        newDeck: null,
        source: "topic",
        selectedTopicId: "travel",
        text: "",
        contentType: "auto",
        register: "neutral",
        currentStep: 1,
        isLoading: false,
        error: null,
        validationErrors: {},
      };

      expect(validateStep3(state, 1)).toBe(true);
    });
  });

  describe("validateCreateDeck", () => {
    it("should return empty errors object for valid deck data", () => {
      const deck: CreateDeckDTO = {
        title: "My Deck",
        description: "A valid description",
        lang_a: "lang-uuid-1",
        lang_b: "lang-uuid-2",
        visibility: "private",
      };

      const errors = validateCreateDeck(deck);
      expect(errors).toEqual({});
    });

    it("should return error when title is missing", () => {
      const deck: Partial<CreateDeckDTO> = {
        description: "A valid description",
        lang_a: "lang-uuid-1",
        lang_b: "lang-uuid-2",
      };

      const errors = validateCreateDeck(deck);
      expect(errors.title).toBe("Tytuł jest wymagany");
    });

    it("should return error when title is empty string", () => {
      const deck: Partial<CreateDeckDTO> = {
        title: "",
        description: "A valid description",
        lang_a: "lang-uuid-1",
        lang_b: "lang-uuid-2",
      };

      const errors = validateCreateDeck(deck);
      expect(errors.title).toBe("Tytuł jest wymagany");
    });

    it("should return error when title is only whitespace", () => {
      const deck: Partial<CreateDeckDTO> = {
        title: "   ",
        description: "A valid description",
        lang_a: "lang-uuid-1",
        lang_b: "lang-uuid-2",
      };

      const errors = validateCreateDeck(deck);
      expect(errors.title).toBe("Tytuł jest wymagany");
    });

    it("should return error when title exceeds 200 characters", () => {
      const deck: Partial<CreateDeckDTO> = {
        title: "a".repeat(201),
        description: "A valid description",
        lang_a: "lang-uuid-1",
        lang_b: "lang-uuid-2",
      };

      const errors = validateCreateDeck(deck);
      expect(errors.title).toBe("Tytuł może mieć maksymalnie 200 znaków");
    });

    it("should accept title with exactly 200 characters", () => {
      const deck: Partial<CreateDeckDTO> = {
        title: "a".repeat(200),
        description: "A valid description",
        lang_a: "lang-uuid-1",
        lang_b: "lang-uuid-2",
      };

      const errors = validateCreateDeck(deck);
      expect(errors.title).toBeUndefined();
    });

    it("should return error when description is missing", () => {
      const deck: Partial<CreateDeckDTO> = {
        title: "My Deck",
        lang_a: "lang-uuid-1",
        lang_b: "lang-uuid-2",
      };

      const errors = validateCreateDeck(deck);
      expect(errors.description).toBe("Opis jest wymagany");
    });

    it("should return error when description is empty string", () => {
      const deck: Partial<CreateDeckDTO> = {
        title: "My Deck",
        description: "",
        lang_a: "lang-uuid-1",
        lang_b: "lang-uuid-2",
      };

      const errors = validateCreateDeck(deck);
      expect(errors.description).toBe("Opis jest wymagany");
    });

    it("should return error when description is only whitespace", () => {
      const deck: Partial<CreateDeckDTO> = {
        title: "My Deck",
        description: "   ",
        lang_a: "lang-uuid-1",
        lang_b: "lang-uuid-2",
      };

      const errors = validateCreateDeck(deck);
      expect(errors.description).toBe("Opis jest wymagany");
    });

    it("should return error when description exceeds 1000 characters", () => {
      const deck: Partial<CreateDeckDTO> = {
        title: "My Deck",
        description: "a".repeat(1001),
        lang_a: "lang-uuid-1",
        lang_b: "lang-uuid-2",
      };

      const errors = validateCreateDeck(deck);
      expect(errors.description).toBe("Opis może mieć maksymalnie 1000 znaków");
    });

    it("should accept description with exactly 1000 characters", () => {
      const deck: Partial<CreateDeckDTO> = {
        title: "My Deck",
        description: "a".repeat(1000),
        lang_a: "lang-uuid-1",
        lang_b: "lang-uuid-2",
      };

      const errors = validateCreateDeck(deck);
      expect(errors.description).toBeUndefined();
    });

    it("should return error when lang_a is missing", () => {
      const deck: Partial<CreateDeckDTO> = {
        title: "My Deck",
        description: "A valid description",
        lang_b: "lang-uuid-2",
      };

      const errors = validateCreateDeck(deck);
      expect(errors.lang_a).toBe("Język A jest wymagany");
    });

    it("should return error when lang_b is missing", () => {
      const deck: Partial<CreateDeckDTO> = {
        title: "My Deck",
        description: "A valid description",
        lang_a: "lang-uuid-1",
      };

      const errors = validateCreateDeck(deck);
      expect(errors.lang_b).toBe("Język B jest wymagany");
    });

    it("should return error when lang_a and lang_b are the same", () => {
      const deck: Partial<CreateDeckDTO> = {
        title: "My Deck",
        description: "A valid description",
        lang_a: "lang-uuid-1",
        lang_b: "lang-uuid-1",
      };

      const errors = validateCreateDeck(deck);
      expect(errors.lang_b).toBe("Języki muszą być różne");
    });

    it("should return multiple errors when multiple fields are invalid", () => {
      const deck: Partial<CreateDeckDTO> = {
        title: "",
        description: "",
        lang_a: "lang-uuid-1",
        lang_b: "lang-uuid-1",
      };

      const errors = validateCreateDeck(deck);
      expect(errors.title).toBe("Tytuł jest wymagany");
      expect(errors.description).toBe("Opis jest wymagany");
      expect(errors.lang_b).toBe("Języki muszą być różne");
    });
  });

  describe("validateText", () => {
    it("should return null for valid text (10-5000 chars)", () => {
      expect(validateText("This is a valid text input")).toBeNull();
    });

    it("should return error when text is empty", () => {
      expect(validateText("")).toBe("Tekst nie może być pusty");
    });

    it("should return error when text has less than 10 characters", () => {
      expect(validateText("Short")).toBe("Tekst musi mieć minimum 10 znaków");
    });

    it("should return null when text has exactly 10 characters", () => {
      expect(validateText("1234567890")).toBeNull();
    });

    it("should return null when text has exactly 5000 characters", () => {
      expect(validateText("a".repeat(5000))).toBeNull();
    });

    it("should return error when text exceeds 5000 characters", () => {
      expect(validateText("a".repeat(5001))).toBe("Tekst może mieć maksymalnie 5000 znaków");
    });

    it("should return error when text has 9 characters (boundary)", () => {
      expect(validateText("123456789")).toBe("Tekst musi mieć minimum 10 znaków");
    });
  });

  describe("mapCreateDeckResponseToListItem", () => {
    const mockLanguages: LanguageDTO[] = [
      {
        id: "lang-uuid-1",
        code: "pl",
        name: "Polish",
        name_native: "Polski",
        flag_emoji: "🇵🇱",
        sort_order: 1,
      },
      {
        id: "lang-uuid-2",
        code: "en",
        name: "English",
        name_native: "English",
        flag_emoji: "🇬🇧",
        sort_order: 2,
      },
    ];

    it("should map response to list item correctly", () => {
      const response: CreateDeckResponseDTO = {
        id: "deck-123",
        owner_user_id: "user-123",
        owner: {
          id: "user-123",
          username: "testuser",
        },
        title: "My Deck",
        description: "A test deck",
        lang_a: "lang-uuid-1",
        lang_b: "lang-uuid-2",
        visibility: "private",
        pairs_count: 0,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const result = mapCreateDeckResponseToListItem(response, mockLanguages);

      expect(result.id).toBe("deck-123");
      expect(result.title).toBe("My Deck");
      expect(result.description).toBe("A test deck");
      expect(result.lang_a.id).toBe("lang-uuid-1");
      expect(result.lang_a.code).toBe("pl");
      expect(result.lang_a.name).toBe("Polish");
      expect(result.lang_b.id).toBe("lang-uuid-2");
      expect(result.lang_b.code).toBe("en");
      expect(result.lang_b.name).toBe("English");
      expect(result.visibility).toBe("private");
      expect(result.pairs_count).toBe(0);
    });

    it("should throw error when lang_a is not found in languages list", () => {
      const response: CreateDeckResponseDTO = {
        id: "deck-123",
        owner_user_id: "user-123",
        owner: {
          id: "user-123",
          username: "testuser",
        },
        title: "My Deck",
        description: "A test deck",
        lang_a: "non-existent-lang",
        lang_b: "lang-uuid-2",
        visibility: "private",
        pairs_count: 0,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      expect(() => mapCreateDeckResponseToListItem(response, mockLanguages)).toThrow(
        "Language not found in languages list"
      );
    });

    it("should throw error when lang_b is not found in languages list", () => {
      const response: CreateDeckResponseDTO = {
        id: "deck-123",
        owner_user_id: "user-123",
        owner: {
          id: "user-123",
          username: "testuser",
        },
        title: "My Deck",
        description: "A test deck",
        lang_a: "lang-uuid-1",
        lang_b: "non-existent-lang",
        visibility: "private",
        pairs_count: 0,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      expect(() => mapCreateDeckResponseToListItem(response, mockLanguages)).toThrow(
        "Language not found in languages list"
      );
    });
  });

  describe("getDefaultLanguages", () => {
    it("should return Polish and English when both are available", () => {
      const languages: LanguageDTO[] = [
        {
          id: "lang-pl",
          code: "pl",
          name: "Polish",
          name_native: "Polski",
          flag_emoji: "🇵🇱",
          sort_order: 1,
        },
        {
          id: "lang-en",
          code: "en",
          name: "English",
          name_native: "English",
          flag_emoji: "🇬🇧",
          sort_order: 2,
        },
      ];

      const result = getDefaultLanguages(languages);
      expect(result.langA).toBe("lang-pl");
      expect(result.langB).toBe("lang-en");
    });

    it("should return null when Polish is not available", () => {
      const languages: LanguageDTO[] = [
        {
          id: "lang-en",
          code: "en",
          name: "English",
          name_native: "English",
          flag_emoji: "🇬🇧",
          sort_order: 1,
        },
      ];

      const result = getDefaultLanguages(languages);
      expect(result.langA).toBeNull();
      expect(result.langB).toBe("lang-en");
    });

    it("should return null when English is not available", () => {
      const languages: LanguageDTO[] = [
        {
          id: "lang-pl",
          code: "pl",
          name: "Polish",
          name_native: "Polski",
          flag_emoji: "🇵🇱",
          sort_order: 1,
        },
      ];

      const result = getDefaultLanguages(languages);
      expect(result.langA).toBe("lang-pl");
      expect(result.langB).toBeNull();
    });

    it("should return null for both when neither is available", () => {
      const languages: LanguageDTO[] = [
        {
          id: "lang-de",
          code: "de",
          name: "German",
          name_native: "Deutsch",
          flag_emoji: "🇩🇪",
          sort_order: 1,
        },
      ];

      const result = getDefaultLanguages(languages);
      expect(result.langA).toBeNull();
      expect(result.langB).toBeNull();
    });

    it("should handle case-insensitive code matching", () => {
      const languages: LanguageDTO[] = [
        {
          id: "lang-pl",
          code: "PL",
          name: "Polish",
          name_native: "Polski",
          flag_emoji: "🇵🇱",
          sort_order: 1,
        },
        {
          id: "lang-en",
          code: "EN",
          name: "English",
          name_native: "English",
          flag_emoji: "🇬🇧",
          sort_order: 2,
        },
      ];

      const result = getDefaultLanguages(languages);
      expect(result.langA).toBe("lang-pl");
      expect(result.langB).toBe("lang-en");
    });

    it("should return null for both when languages array is empty", () => {
      const result = getDefaultLanguages([]);
      expect(result.langA).toBeNull();
      expect(result.langB).toBeNull();
    });
  });

  describe("isOnboarding", () => {
    it("should return true when decks array is empty", () => {
      expect(isOnboarding([])).toBe(true);
    });

    it("should return false when decks array has items", () => {
      const decks: DeckListItemDTO[] = [
        {
          id: "deck-1",
          owner_user_id: "user-1",
          title: "Deck 1",
          description: "Description",
          lang_a: {
            id: "lang-1",
            code: "pl",
            name: "Polish",
            flag_emoji: "🇵🇱",
          },
          lang_b: {
            id: "lang-2",
            code: "en",
            name: "English",
            flag_emoji: "🇬🇧",
          },
          visibility: "private",
          pairs_count: 0,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      expect(isOnboarding(decks)).toBe(false);
    });

    it("should return false when decks array has multiple items", () => {
      const decks: DeckListItemDTO[] = [
        {
          id: "deck-1",
          owner_user_id: "user-1",
          title: "Deck 1",
          description: "Description",
          lang_a: {
            id: "lang-1",
            code: "pl",
            name: "Polish",
            flag_emoji: "🇵🇱",
          },
          lang_b: {
            id: "lang-2",
            code: "en",
            name: "English",
            flag_emoji: "🇬🇧",
          },
          visibility: "private",
          pairs_count: 0,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "deck-2",
          owner_user_id: "user-1",
          title: "Deck 2",
          description: "Description",
          lang_a: {
            id: "lang-1",
            code: "pl",
            name: "Polish",
            flag_emoji: "🇵🇱",
          },
          lang_b: {
            id: "lang-2",
            code: "en",
            name: "English",
            flag_emoji: "🇬🇧",
          },
          visibility: "private",
          pairs_count: 0,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      expect(isOnboarding(decks)).toBe(false);
    });
  });

  describe("formatApiError", () => {
    it("should return string when error is a string", () => {
      expect(formatApiError("Simple error message")).toBe("Simple error message");
    });

    it("should return message when error is an Error instance", () => {
      const error = new Error("Error message");
      expect(formatApiError(error)).toBe("Error message");
    });

    it("should return message property when error is an object with message", () => {
      const error = { message: "Object error message" };
      expect(formatApiError(error)).toBe("Object error message");
    });

    it("should return default message when error is null", () => {
      expect(formatApiError(null)).toBe("Wystąpił nieoczekiwany błąd");
    });

    it("should return default message when error is undefined", () => {
      expect(formatApiError(undefined)).toBe("Wystąpił nieoczekiwany błąd");
    });

    it("should return default message when error is an object without message", () => {
      const error = { code: "ERROR_CODE" };
      expect(formatApiError(error)).toBe("Wystąpił nieoczekiwany błąd");
    });

    it("should convert message to string when message is not a string", () => {
      const error = { message: 123 };
      expect(formatApiError(error)).toBe("123");
    });

    it("should handle empty string error", () => {
      expect(formatApiError("")).toBe("");
    });
  });

  describe("validationErrorsToRecord", () => {
    it("should convert validation errors array to record", () => {
      const errors = [
        { field: "title", message: "Title is required" },
        { field: "description", message: "Description is required" },
      ];

      const result = validationErrorsToRecord(errors);
      expect(result).toEqual({
        title: "Title is required",
        description: "Description is required",
      });
    });

    it("should return empty object when errors array is empty", () => {
      const result = validationErrorsToRecord([]);
      expect(result).toEqual({});
    });

    it("should handle single error", () => {
      const errors = [{ field: "title", message: "Title is required" }];
      const result = validationErrorsToRecord(errors);
      expect(result).toEqual({
        title: "Title is required",
      });
    });

    it("should overwrite duplicate field names with last value", () => {
      const errors = [
        { field: "title", message: "First message" },
        { field: "title", message: "Second message" },
      ];

      const result = validationErrorsToRecord(errors);
      expect(result).toEqual({
        title: "Second message",
      });
    });
  });

  describe("getTextLengthWarningLevel", () => {
    it("should return null for empty text", () => {
      const result = getTextLengthWarningLevel(0);
      expect(result.level).toBeNull();
      expect(result.message).toBeNull();
    });

    it("should return danger level for text less than 10 characters", () => {
      const result = getTextLengthWarningLevel(9);
      expect(result.level).toBe("danger");
      expect(result.message).toBe("Tekst musi mieć minimum 10 znaków");
    });

    it("should return danger level for text with exactly 9 characters", () => {
      const result = getTextLengthWarningLevel(9);
      expect(result.level).toBe("danger");
    });

    it("should return warning level for text between 10 and 49 characters", () => {
      const result = getTextLengthWarningLevel(25);
      expect(result.level).toBe("warning");
      expect(result.message).toBe("Mało precyzyjny opis - dodaj więcej szczegółów dla lepszych wyników");
    });

    it("should return warning level for text with exactly 10 characters", () => {
      const result = getTextLengthWarningLevel(10);
      expect(result.level).toBe("warning");
    });

    it("should return warning level for text with exactly 49 characters", () => {
      const result = getTextLengthWarningLevel(49);
      expect(result.level).toBe("warning");
    });

    it("should return null for text with 50 or more characters", () => {
      const result = getTextLengthWarningLevel(50);
      expect(result.level).toBeNull();
      expect(result.message).toBeNull();
    });

    it("should return null for text with exactly 50 characters", () => {
      const result = getTextLengthWarningLevel(50);
      expect(result.level).toBeNull();
    });

    it("should return null for very long text", () => {
      const result = getTextLengthWarningLevel(1000);
      expect(result.level).toBeNull();
      expect(result.message).toBeNull();
    });
  });

  describe("formatQuotaText", () => {
    it("should format quota text correctly", () => {
      expect(formatQuotaText(5, 10)).toBe("Użyto dzisiaj: 5 / 10");
    });

    it("should handle zero used", () => {
      expect(formatQuotaText(0, 10)).toBe("Użyto dzisiaj: 0 / 10");
    });

    it("should handle zero limit", () => {
      expect(formatQuotaText(0, 0)).toBe("Użyto dzisiaj: 0 / 0");
    });

    it("should handle large numbers", () => {
      expect(formatQuotaText(999, 1000)).toBe("Użyto dzisiaj: 999 / 1000");
    });

    it("should handle equal used and limit", () => {
      expect(formatQuotaText(10, 10)).toBe("Użyto dzisiaj: 10 / 10");
    });
  });

  describe("getErrorMessageForCode", () => {
    it("should return specific message for UNAUTHORIZED", () => {
      expect(getErrorMessageForCode("UNAUTHORIZED", "Default")).toBe("Sesja wygasła. Zaloguj się ponownie.");
    });

    it("should return specific message for QUOTA_EXCEEDED", () => {
      expect(getErrorMessageForCode("QUOTA_EXCEEDED", "Default")).toBe(
        "Dzienny limit generacji został przekroczony. Spróbuj ponownie jutro."
      );
    });

    it("should return specific message for DECK_NOT_FOUND", () => {
      expect(getErrorMessageForCode("DECK_NOT_FOUND", "Default")).toBe("Talia nie została znaleziona.");
    });

    it("should return specific message for GENERATION_IN_PROGRESS", () => {
      expect(getErrorMessageForCode("GENERATION_IN_PROGRESS", "Default")).toBe(
        "Inna generacja jest w toku. Poczekaj na zakończenie."
      );
    });

    it("should return specific message for PAYLOAD_TOO_LARGE", () => {
      expect(getErrorMessageForCode("PAYLOAD_TOO_LARGE", "Default")).toBe(
        "Tekst jest za długi. Maksymalna długość to 5000 znaków."
      );
    });

    it("should return specific message for VALIDATION_ERROR", () => {
      expect(getErrorMessageForCode("VALIDATION_ERROR", "Default")).toBe("Dane formularza są nieprawidłowe.");
    });

    it("should return specific message for INTERNAL_ERROR", () => {
      expect(getErrorMessageForCode("INTERNAL_ERROR", "Default")).toBe(
        "Wystąpił błąd serwera. Spróbuj ponownie za chwilę."
      );
    });

    it("should return specific message for SERVICE_UNAVAILABLE", () => {
      expect(getErrorMessageForCode("SERVICE_UNAVAILABLE", "Default")).toBe(
        "Usługa jest tymczasowo niedostępna. Spróbuj ponownie za chwilę."
      );
    });

    it("should return default message for unknown error code", () => {
      expect(getErrorMessageForCode("UNKNOWN_ERROR", "Custom default message")).toBe("Custom default message");
    });

    it("should return default message for empty string code", () => {
      expect(getErrorMessageForCode("", "Default message")).toBe("Default message");
    });
  });
});
