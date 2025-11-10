import { renderHook, act, waitFor } from "@testing-library/react";
import { useGenerateWizard } from "./useGenerateWizard";
import type { DeckListItemDTO, LanguageDTO, QuotaDTO } from "@/types";

type FetchInput = Parameters<typeof fetch>[0];

interface MockFetchConfig {
  quota?: QuotaDTO;
  decks?: DeckListItemDTO[];
  languages?: LanguageDTO[];
  generationResponse?: Record<string, unknown>;
  createDeckResponse?: DeckListItemDTO;
  delayMs?: number;
  // Error configurations
  quotaError?: { status?: number; message?: string; throwError?: boolean };
  decksError?: { status?: number; message?: string; throwError?: boolean };
  languagesError?: { status?: number; message?: string; throwError?: boolean };
  createDeckError?: { status?: number; message?: string; throwError?: boolean };
  generationError?: { status?: number; message?: string; throwError?: boolean };
}

const now = new Date().toISOString();

const polish: LanguageDTO = {
  id: "lang-pl",
  code: "pl",
  name: "Polski",
  name_native: "Polski",
  flag_emoji: "🇵🇱",
  sort_order: 1,
};

const english: LanguageDTO = {
  id: "lang-en",
  code: "en",
  name: "English",
  name_native: "English",
  flag_emoji: "🇬🇧",
  sort_order: 2,
};

const defaultQuota: QuotaDTO = {
  daily_limit: 20,
  used_today: 5,
  remaining: 15,
  reset_at: now,
};

const defaultLanguages = [polish, english];

const createDeck = (id: string): DeckListItemDTO => ({
  id,
  owner_user_id: "user-1",
  title: `Deck ${id}`,
  description: "Sample deck",
  lang_a: {
    id: polish.id,
    code: polish.code,
    name: polish.name,
    flag_emoji: polish.flag_emoji,
  },
  lang_b: {
    id: english.id,
    code: english.code,
    name: english.name,
    flag_emoji: english.flag_emoji,
  },
  visibility: "private" as DeckListItemDTO["visibility"],
  pairs_count: 0,
  created_at: now,
  updated_at: now,
});

const createFetchResponse = <T>(payload: T, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: vi.fn().mockResolvedValue(payload),
});

const buildPagination = (count: number) => ({
  page: 1,
  limit: Math.max(count, 1),
  total: count,
  total_pages: 1,
});

const originalFetch = globalThis.fetch;

const setupFetchMocks = (config: MockFetchConfig = {}) => {
  const {
    quota = defaultQuota,
    decks = [createDeck("deck-1")],
    languages = defaultLanguages,
    generationResponse = { success: true },
    createDeckResponse,
    delayMs = 0,
    quotaError,
    decksError,
    languagesError,
    createDeckError,
    generationError,
  } = config;

  const respond = <T>(payload: T, status = 200) =>
    new Promise((resolve) => {
      setTimeout(() => resolve(createFetchResponse(payload, status)), delayMs);
    });

  const respondError = (status: number, message: string) =>
    new Promise((resolve) => {
      setTimeout(
        () =>
          resolve({
            ok: false,
            status,
            json: vi.fn().mockResolvedValue({ error: { message } }),
          }),
        delayMs
      );
    });

  const respondNetworkError = () =>
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Network error")), delayMs);
    });

  const fetchMock = vi.fn((input: FetchInput, init?: RequestInit) => {
    const url = typeof input === "string" ? input : (input?.toString() ?? "");
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();

    // Handle quota errors
    if (url.startsWith("/api/users/me/quota")) {
      if (quotaError?.throwError) {
        return respondNetworkError();
      }
      if (quotaError?.status) {
        return respondError(quotaError.status, quotaError.message ?? "Failed to fetch quota");
      }
      return respond(quota);
    }

    // Handle decks errors
    if (url.startsWith("/api/decks") && method === "GET") {
      if (decksError?.throwError) {
        return respondNetworkError();
      }
      if (decksError?.status) {
        return respondError(decksError.status, decksError.message ?? "Failed to fetch decks");
      }
      return respond({
        decks,
        pagination: buildPagination(decks.length),
      });
    }

    // Handle create deck
    if (url.startsWith("/api/decks") && method === "POST") {
      if (createDeckError?.throwError) {
        return respondNetworkError();
      }
      if (createDeckError?.status) {
        return respondError(createDeckError.status, createDeckError.message ?? "Failed to create deck");
      }
      const newDeck = createDeckResponse ?? createDeck("deck-new");
      // Return response matching CreateDeckResponseDTO structure
      // Note: lang_a and lang_b should be language UUIDs (strings), not objects
      return respond({
        id: newDeck.id,
        owner_user_id: newDeck.owner_user_id,
        owner: {
          id: newDeck.owner_user_id,
          username: "testuser",
        },
        title: newDeck.title,
        description: newDeck.description,
        lang_a: newDeck.lang_a.id, // Language UUID
        lang_b: newDeck.lang_b.id, // Language UUID
        visibility: newDeck.visibility,
        pairs_count: newDeck.pairs_count,
        created_at: newDeck.created_at,
        updated_at: newDeck.updated_at,
      });
    }

    // Handle languages errors
    if (url.startsWith("/api/languages")) {
      if (languagesError?.throwError) {
        return respondNetworkError();
      }
      if (languagesError?.status) {
        return respondError(languagesError.status, languagesError.message ?? "Failed to fetch languages");
      }
      return respond({
        languages,
        count: languages.length,
      });
    }

    // Handle generation errors
    if (url === "/api/generate/from-topic" || url === "/api/generate/from-text") {
      if (generationError?.throwError) {
        return respondNetworkError();
      }
      if (generationError?.status) {
        return respondError(generationError.status, generationError.message ?? "Server error");
      }
      return respond(generationResponse);
    }

    throw new Error(`Unhandled fetch request: ${url}`);
  });

  globalThis.fetch = fetchMock as typeof fetch;

  return fetchMock;
};

describe("useGenerateWizard", () => {
  let locationMock: Location;

  beforeEach(() => {
    // Mock window.location (jsdom provides window in test environment)
    let hrefValue = "http://localhost/";
    const locationProps: Partial<Location> = {
      assign: vi.fn((next: string) => {
        hrefValue = next;
      }),
      replace: vi.fn((next: string) => {
        hrefValue = next;
      }),
      reload: vi.fn(),
      ancestorOrigins: [] as unknown as DOMStringList,
      origin: "http://localhost",
      protocol: "http:",
      host: "localhost",
      hostname: "localhost",
      port: "",
      pathname: "/",
      search: "",
      hash: "",
    };

    locationMock = locationProps as Location;

    // Define href as a property with getter/setter
    Object.defineProperty(locationMock, "href", {
      configurable: true,
      enumerable: true,
      get: () => hrefValue,
      set: (value: string) => {
        hrefValue = value;
      },
    });

    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: locationMock,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("enables onboarding mode and seeds default languages when user has no decks", async () => {
    setupFetchMocks({ decks: [], languages: defaultLanguages });

    const { result } = renderHook(() => useGenerateWizard());

    await waitFor(() => {
      expect(result.current.state.createDeckMode).toBe(true);
    });

    expect(result.current.isOnboarding).toBe(true);
    expect(result.current.state.newDeck?.lang_a).toBe(polish.id);
    expect(result.current.state.newDeck?.lang_b).toBe(english.id);
    expect(result.current.defaultLanguages).toEqual({
      langA: polish.id,
      langB: english.id,
    });
  });

  it("auto-selects the newest deck when decks exist", async () => {
    const decks = [createDeck("deck-newest"), createDeck("deck-older")];
    setupFetchMocks({ decks });

    const { result } = renderHook(() => useGenerateWizard());

    await waitFor(() => {
      expect(result.current.state.selectedDeckId).toBe("deck-newest");
    });

    expect(result.current.state.createDeckMode).toBe(false);
    expect(result.current.decks).toHaveLength(2);
  });

  it("blocks advancing to the next step until a deck becomes available", async () => {
    setupFetchMocks({ decks: [createDeck("deck-validated")], delayMs: 5 });

    const { result } = renderHook(() => useGenerateWizard());

    await act(async () => {
      result.current.goToNextStep();
    });
    expect(result.current.state.currentStep).toBe(1);

    await waitFor(() => {
      expect(result.current.state.selectedDeckId).toBe("deck-validated");
    });

    await act(async () => {
      result.current.goToNextStep();
    });
    expect(result.current.state.currentStep).toBe(2);
  });

  it("submits topic generation when all business rules are satisfied", async () => {
    const fetchMock = setupFetchMocks({
      decks: [createDeck("deck-topic")],
      generationResponse: { deck_id: "deck-topic" },
    });

    const { result } = renderHook(() => useGenerateWizard());

    await waitFor(() => {
      expect(result.current.state.selectedDeckId).toBe("deck-topic");
    });

    await act(async () => {
      result.current.selectTopic("travel");
    });

    await act(async () => {
      await result.current.handleGenerate();
    });

    const topicCall = fetchMock.mock.calls.find(([url]: [FetchInput]) => String(url) === "/api/generate/from-topic");
    expect(topicCall).toBeDefined();
    expect(window.location.href).toBe("/decks/deck-topic");
  });

  it("prevents text-based generation when the provided text is outside length limits", async () => {
    const fetchMock = setupFetchMocks();

    const { result } = renderHook(() => useGenerateWizard());

    await waitFor(() => {
      expect(result.current.state.selectedDeckId).toBe("deck-1");
    });

    await act(async () => {
      result.current.setSource("text");
      result.current.setText("short");
    });

    expect(result.current.canSubmit).toBe(false);

    await act(async () => {
      await result.current.handleGenerate();
    });

    const textCall = fetchMock.mock.calls.find(([url]: [FetchInput]) => String(url) === "/api/generate/from-text");
    expect(textCall).toBeUndefined();

    await act(async () => {
      result.current.setText("a".repeat(20));
    });

    expect(result.current.canSubmit).toBe(true);

    await act(async () => {
      await result.current.handleGenerate();
    });

    const successfulTextCall = fetchMock.mock.calls.find(
      ([url]: [FetchInput]) => String(url) === "/api/generate/from-text"
    );
    expect(successfulTextCall).toBeDefined();
    expect(window.location.href).toBe("/decks/deck-1");
  });

  // ============================================================================
  // API Error Handling Tests
  // ============================================================================

  describe("API Error Handling", () => {
    it("handles quota fetch error (401) and redirects to login", async () => {
      setupFetchMocks({ quotaError: { status: 401 } });

      const { result } = renderHook(() => useGenerateWizard());

      await waitFor(() => {
        expect(result.current.errors.quota).toBeDefined();
      });

      expect(window.location.href).toBe("/auth/login?redirect=/generate");
    });

    it("handles quota fetch error (500)", async () => {
      setupFetchMocks({ quotaError: { status: 500, message: "Server error" } });

      const { result } = renderHook(() => useGenerateWizard());

      await waitFor(() => {
        expect(result.current.errors.quota).toBe("Failed to fetch quota: 500");
      });

      expect(result.current.loading.quota).toBe(false);
    });

    it("handles quota fetch network error", async () => {
      setupFetchMocks({ quotaError: { throwError: true } });

      const { result } = renderHook(() => useGenerateWizard());

      await waitFor(() => {
        expect(result.current.errors.quota).toBe("Network error");
      });

      expect(result.current.loading.quota).toBe(false);
    });

    it("handles decks fetch error (401) and redirects to login", async () => {
      setupFetchMocks({ decksError: { status: 401 } });

      const { result } = renderHook(() => useGenerateWizard());

      await waitFor(() => {
        expect(result.current.errors.decks).toBeDefined();
      });

      expect(window.location.href).toBe("/auth/login?redirect=/generate");
    });

    it("handles decks fetch error (500)", async () => {
      setupFetchMocks({ decksError: { status: 500, message: "Server error" } });

      const { result } = renderHook(() => useGenerateWizard());

      await waitFor(() => {
        expect(result.current.errors.decks).toBe("Failed to fetch decks: 500");
      });

      expect(result.current.loading.decks).toBe(false);
    });

    it("handles decks fetch network error", async () => {
      setupFetchMocks({ decksError: { throwError: true } });

      const { result } = renderHook(() => useGenerateWizard());

      await waitFor(() => {
        expect(result.current.errors.decks).toBe("Network error");
      });

      expect(result.current.loading.decks).toBe(false);
    });

    it("handles languages fetch error (500)", async () => {
      setupFetchMocks({ languagesError: { status: 500, message: "Server error" } });

      const { result } = renderHook(() => useGenerateWizard());

      await waitFor(() => {
        expect(result.current.errors.languages).toBe("Failed to fetch languages: 500");
      });

      expect(result.current.loading.languages).toBe(false);
    });

    it("handles languages fetch network error", async () => {
      setupFetchMocks({ languagesError: { throwError: true } });

      const { result } = renderHook(() => useGenerateWizard());

      await waitFor(() => {
        expect(result.current.errors.languages).toBe("Network error");
      });

      expect(result.current.loading.languages).toBe(false);
    });

    it("handles create deck error (401) and redirects to login", async () => {
      setupFetchMocks({
        decks: [],
        createDeckError: { status: 401 },
      });

      const { result } = renderHook(() => useGenerateWizard());

      await waitFor(() => {
        expect(result.current.state.createDeckMode).toBe(true);
        expect(result.current.languages.length).toBeGreaterThan(0);
      });

      await act(async () => {
        try {
          await result.current.handleCreateDeck({
            title: "New Deck",
            description: "Description",
            lang_a: polish.id,
            lang_b: english.id,
            visibility: "private",
          });
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.errors.createDeck).toBeDefined();
        // Check if redirect happened (401 should trigger redirect before error is set)
        expect(window.location.href).toBe("/auth/login?redirect=/generate");
      });
    });

    it("handles create deck error (500)", async () => {
      setupFetchMocks({
        decks: [],
        createDeckError: { status: 500, message: "Server error" },
      });

      const { result } = renderHook(() => useGenerateWizard());

      await waitFor(() => {
        expect(result.current.state.createDeckMode).toBe(true);
        expect(result.current.languages.length).toBeGreaterThan(0);
      });

      await act(async () => {
        try {
          await result.current.handleCreateDeck({
            title: "New Deck",
            description: "Description",
            lang_a: polish.id,
            lang_b: english.id,
            visibility: "private",
          });
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.errors.createDeck).toBe("Server error");
      });

      expect(result.current.loading.creatingDeck).toBe(false);
    });

    it("handles create deck network error", async () => {
      setupFetchMocks({
        decks: [],
        createDeckError: { throwError: true },
      });

      const { result } = renderHook(() => useGenerateWizard());

      await waitFor(() => {
        expect(result.current.state.createDeckMode).toBe(true);
        expect(result.current.languages.length).toBeGreaterThan(0);
      });

      await act(async () => {
        try {
          await result.current.handleCreateDeck({
            title: "New Deck",
            description: "Description",
            lang_a: polish.id,
            lang_b: english.id,
            visibility: "private",
          });
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.errors.createDeck).toBe("Network error");
      });

      expect(result.current.loading.creatingDeck).toBe(false);
    });

    it("handles topic generation error (401) and redirects to login", async () => {
      setupFetchMocks({
        decks: [createDeck("deck-1")],
        generationError: { status: 401 },
      });

      const { result } = renderHook(() => useGenerateWizard());

      await waitFor(() => {
        expect(result.current.state.selectedDeckId).toBe("deck-1");
      });

      await act(async () => {
        result.current.selectTopic("travel");
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.errors.generation).toBeDefined();
      });

      expect(window.location.href).toBe("/auth/login?redirect=/generate");
    });

    it("handles topic generation error (500)", async () => {
      setupFetchMocks({
        decks: [createDeck("deck-1")],
        generationError: { status: 500, message: "Server error" },
      });

      const { result } = renderHook(() => useGenerateWizard());

      await waitFor(() => {
        expect(result.current.state.selectedDeckId).toBe("deck-1");
      });

      await act(async () => {
        result.current.selectTopic("travel");
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.errors.generation).toBe("Server error");
      });

      expect(result.current.loading.generating).toBe(false);
      // Should not redirect on error
      expect(window.location.href).not.toContain("/decks/");
    });

    it("handles topic generation network error", async () => {
      setupFetchMocks({
        decks: [createDeck("deck-1")],
        generationError: { throwError: true },
      });

      const { result } = renderHook(() => useGenerateWizard());

      await waitFor(() => {
        expect(result.current.state.selectedDeckId).toBe("deck-1");
      });

      await act(async () => {
        result.current.selectTopic("travel");
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.errors.generation).toBe("Network error");
      });

      expect(result.current.loading.generating).toBe(false);
    });

    it("handles text generation error (401) and redirects to login", async () => {
      setupFetchMocks({
        decks: [createDeck("deck-1")],
        generationError: { status: 401 },
      });

      const { result } = renderHook(() => useGenerateWizard());

      await waitFor(() => {
        expect(result.current.state.selectedDeckId).toBe("deck-1");
      });

      await act(async () => {
        result.current.setSource("text");
        result.current.setText("a".repeat(20));
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.errors.generation).toBeDefined();
      });

      expect(window.location.href).toBe("/auth/login?redirect=/generate");
    });

    it("handles text generation error (500)", async () => {
      setupFetchMocks({
        decks: [createDeck("deck-1")],
        generationError: { status: 500, message: "Server error" },
      });

      const { result } = renderHook(() => useGenerateWizard());

      await waitFor(() => {
        expect(result.current.state.selectedDeckId).toBe("deck-1");
      });

      await act(async () => {
        result.current.setSource("text");
        result.current.setText("a".repeat(20));
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.errors.generation).toBe("Server error");
      });

      expect(result.current.loading.generating).toBe(false);
      expect(window.location.href).not.toContain("/decks/");
    });

    it("handles text generation network error", async () => {
      setupFetchMocks({
        decks: [createDeck("deck-1")],
        generationError: { throwError: true },
      });

      const { result } = renderHook(() => useGenerateWizard());

      await waitFor(() => {
        expect(result.current.state.selectedDeckId).toBe("deck-1");
      });

      await act(async () => {
        result.current.setSource("text");
        result.current.setText("a".repeat(20));
      });

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.errors.generation).toBe("Network error");
      });

      expect(result.current.loading.generating).toBe(false);
    });
  });

  // ============================================================================
  // Full User Flow Tests
  // ============================================================================

  describe("Full User Flows", () => {
    it("completes full flow: create deck -> select topic -> generate", async () => {
      const fetchMock = setupFetchMocks({
        decks: [],
        createDeckResponse: createDeck("deck-new"),
        generationResponse: { deck_id: "deck-new" },
      });

      const { result } = renderHook(() => useGenerateWizard());

      // Wait for onboarding mode and languages to load
      await waitFor(() => {
        expect(result.current.state.createDeckMode).toBe(true);
        expect(result.current.languages.length).toBeGreaterThan(0);
      });

      // Create new deck
      await act(async () => {
        await result.current.handleCreateDeck({
          title: "My New Deck",
          description: "A new deck",
          lang_a: polish.id,
          lang_b: english.id,
          visibility: "private",
        });
      });

      // Verify deck was created and selected
      await waitFor(() => {
        expect(result.current.state.selectedDeckId).toBe("deck-new");
        expect(result.current.state.createDeckMode).toBe(false);
      });

      // Move to step 2
      await act(async () => {
        result.current.goToNextStep();
      });
      expect(result.current.state.currentStep).toBe(2);

      // Select topic
      await act(async () => {
        result.current.selectTopic("travel");
      });

      // Move to step 3
      await act(async () => {
        result.current.goToNextStep();
      });
      expect(result.current.state.currentStep).toBe(3);

      // Generate
      await act(async () => {
        await result.current.handleGenerate();
      });

      // Verify generation was called
      const topicCall = fetchMock.mock.calls.find(([url]: [FetchInput]) => String(url) === "/api/generate/from-topic");
      expect(topicCall).toBeDefined();
      expect(window.location.href).toBe("/decks/deck-new");
    });

    it("completes full flow: create deck -> select text -> generate", async () => {
      const fetchMock = setupFetchMocks({
        decks: [],
        createDeckResponse: createDeck("deck-text"),
        generationResponse: { deck_id: "deck-text" },
      });

      const { result } = renderHook(() => useGenerateWizard());

      // Wait for onboarding mode and languages to load
      await waitFor(() => {
        expect(result.current.state.createDeckMode).toBe(true);
        expect(result.current.languages.length).toBeGreaterThan(0);
      });

      // Create new deck
      await act(async () => {
        await result.current.handleCreateDeck({
          title: "Text Deck",
          description: "For text generation",
          lang_a: polish.id,
          lang_b: english.id,
          visibility: "private",
        });
      });

      // Verify deck was created
      await waitFor(() => {
        expect(result.current.state.selectedDeckId).toBe("deck-text");
      });

      // Move to step 2 and switch to text source
      await act(async () => {
        result.current.goToNextStep();
        result.current.setSource("text");
        result.current.setText("This is a sample text for generation that is long enough");
      });

      // Move to step 3
      await act(async () => {
        result.current.goToNextStep();
      });

      // Generate
      await act(async () => {
        await result.current.handleGenerate();
      });

      // Verify generation was called
      const textCall = fetchMock.mock.calls.find(([url]: [FetchInput]) => String(url) === "/api/generate/from-text");
      expect(textCall).toBeDefined();
      expect(window.location.href).toBe("/decks/deck-text");
    });

    it("switches between topic and text sources", async () => {
      setupFetchMocks({ decks: [createDeck("deck-1")] });

      const { result } = renderHook(() => useGenerateWizard());

      await waitFor(() => {
        expect(result.current.state.selectedDeckId).toBe("deck-1");
      });

      // Start with topic
      await act(async () => {
        result.current.goToNextStep();
        result.current.setSource("topic");
        result.current.selectTopic("travel");
      });

      expect(result.current.state.source).toBe("topic");
      expect(result.current.state.selectedTopicId).toBe("travel");
      expect(result.current.state.text).toBe("");

      // Switch to text
      await act(async () => {
        result.current.setSource("text");
        result.current.setText("Sample text for generation");
      });

      expect(result.current.state.source).toBe("text");
      // Note: selectedTopicId may not be cleared when switching sources
      expect(result.current.state.text).toBe("Sample text for generation");

      // Switch back to topic
      await act(async () => {
        result.current.setSource("topic");
        result.current.selectTopic("business");
      });

      expect(result.current.state.source).toBe("topic");
      expect(result.current.state.selectedTopicId).toBe("business");
      expect(result.current.state.text).toBe("Sample text for generation"); // Text is preserved
    });

    it("switches between existing decks", async () => {
      const decks = [createDeck("deck-1"), createDeck("deck-2"), createDeck("deck-3")];
      setupFetchMocks({ decks });

      const { result } = renderHook(() => useGenerateWizard());

      // Wait for auto-selection
      await waitFor(() => {
        expect(result.current.state.selectedDeckId).toBe("deck-1");
      });

      // Switch to second deck
      await act(async () => {
        result.current.selectDeck("deck-2");
      });

      expect(result.current.state.selectedDeckId).toBe("deck-2");
      expect(result.current.state.createDeckMode).toBe(false);

      // Switch to third deck
      await act(async () => {
        result.current.selectDeck("deck-3");
      });

      expect(result.current.state.selectedDeckId).toBe("deck-3");
      expect(result.current.state.createDeckMode).toBe(false);
    });

    it("switches from existing deck to another deck", async () => {
      const decks = [createDeck("deck-1"), createDeck("deck-2")];
      setupFetchMocks({ decks });

      const { result } = renderHook(() => useGenerateWizard());

      await waitFor(() => {
        expect(result.current.state.selectedDeckId).toBe("deck-1");
      });

      // Switch to another deck
      await act(async () => {
        result.current.selectDeck("deck-2");
      });

      expect(result.current.state.createDeckMode).toBe(false);
      expect(result.current.state.selectedDeckId).toBe("deck-2");
      expect(result.current.state.newDeck).toBe(null);

      // Switch back to first deck
      await act(async () => {
        result.current.selectDeck("deck-1");
      });

      expect(result.current.state.createDeckMode).toBe(false);
      expect(result.current.state.selectedDeckId).toBe("deck-1");
    });

    it("navigates through all steps forward and backward", async () => {
      setupFetchMocks({ decks: [createDeck("deck-1")] });

      const { result } = renderHook(() => useGenerateWizard());

      await waitFor(() => {
        expect(result.current.state.selectedDeckId).toBe("deck-1");
      });

      // Step 1 -> Step 2
      await act(async () => {
        result.current.goToNextStep();
      });
      expect(result.current.state.currentStep).toBe(2);

      // Step 2 -> Step 3 (need to select topic first for validation)
      await act(async () => {
        result.current.selectTopic("travel");
      });
      await act(async () => {
        result.current.goToNextStep();
      });
      expect(result.current.state.currentStep).toBe(3);

      // Step 3 -> Step 2
      await act(async () => {
        result.current.goToPreviousStep();
      });
      expect(result.current.state.currentStep).toBe(2);

      // Step 2 -> Step 1
      await act(async () => {
        result.current.goToPreviousStep();
      });
      expect(result.current.state.currentStep).toBe(1);

      // Cannot go below step 1
      await act(async () => {
        result.current.goToPreviousStep();
      });
      expect(result.current.state.currentStep).toBe(1);
    });
  });
});
