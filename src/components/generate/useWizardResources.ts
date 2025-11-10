import { useCallback, useState } from "react";
import type {
  DeckListItemDTO,
  DecksListDTO,
  LanguageDTO,
  LanguagesListDTO,
  QuotaDTO,
} from "@/types";
import { formatApiError } from "./utils";
import type { ErrorStates, LoadingStates } from "./types";

const LOGIN_REDIRECT = "/auth/login?redirect=/generate";

type ResourceLoadingState = Pick<LoadingStates, "quota" | "decks" | "languages">;
type ResourceErrorState = Pick<ErrorStates, "quota" | "decks" | "languages">;

interface UseWizardResourcesResult {
  decks: DeckListItemDTO[];
  languages: LanguageDTO[];
  quota: QuotaDTO | null;
  loading: ResourceLoadingState;
  errors: ResourceErrorState;
  decksLoaded: boolean;
  languagesLoaded: boolean;
  fetchQuota: () => Promise<QuotaDTO | null>;
  fetchDecks: () => Promise<DeckListItemDTO[]>;
  fetchLanguages: () => Promise<LanguageDTO[]>;
  addDeck: (deck: DeckListItemDTO) => void;
}

function redirectToLogin() {
  window.location.href = LOGIN_REDIRECT;
}

export function useWizardResources(): UseWizardResourcesResult {
  const [decks, setDecks] = useState<DeckListItemDTO[]>([]);
  const [languages, setLanguages] = useState<LanguageDTO[]>([]);
  const [quota, setQuota] = useState<QuotaDTO | null>(null);

  const [loading, setLoading] = useState<ResourceLoadingState>({
    quota: false,
    decks: false,
    languages: false,
  });

  const [errors, setErrors] = useState<ResourceErrorState>({
    quota: null,
    decks: null,
    languages: null,
  });

  const [loadedFlags, setLoadedFlags] = useState({
    decks: false,
    languages: false,
  });

  const fetchQuota = useCallback(async () => {
    setLoading((prev) => ({ ...prev, quota: true }));
    setErrors((prev) => ({ ...prev, quota: null }));

    try {
      const response = await fetch("/api/users/me/quota");
      if (response.status === 401) {
        redirectToLogin();
        return null;
      }
      if (!response.ok) {
        throw new Error(`Failed to fetch quota: ${response.status}`);
      }
      const data: QuotaDTO = await response.json();
      setQuota(data);
      return data;
    } catch (error) {
      const message = formatApiError(error);
      setErrors((prev) => ({ ...prev, quota: message }));
      throw error;
    } finally {
      setLoading((prev) => ({ ...prev, quota: false }));
    }
  }, []);

  const fetchDecks = useCallback(async () => {
    setLoading((prev) => ({ ...prev, decks: true }));
    setErrors((prev) => ({ ...prev, decks: null }));

    try {
      const response = await fetch("/api/decks?page=1&limit=100");
      if (response.status === 401) {
        redirectToLogin();
        return [];
      }
      if (!response.ok) {
        throw new Error(`Failed to fetch decks: ${response.status}`);
      }
      const data: DecksListDTO = await response.json();
      setDecks(data.decks);
      return data.decks;
    } catch (error) {
      const message = formatApiError(error);
      setErrors((prev) => ({ ...prev, decks: message }));
      throw error;
    } finally {
      setLoading((prev) => ({ ...prev, decks: false }));
      setLoadedFlags((prev) => ({ ...prev, decks: true }));
    }
  }, []);

  const fetchLanguages = useCallback(async () => {
    setLoading((prev) => ({ ...prev, languages: true }));
    setErrors((prev) => ({ ...prev, languages: null }));

    try {
      const response = await fetch("/api/languages");
      if (response.status === 401) {
        redirectToLogin();
        return [];
      }
      if (!response.ok) {
        throw new Error(`Failed to fetch languages: ${response.status}`);
      }
      const data: LanguagesListDTO = await response.json();
      setLanguages(data.languages);
      return data.languages;
    } catch (error) {
      const message = formatApiError(error);
      setErrors((prev) => ({ ...prev, languages: message }));
      throw error;
    } finally {
      setLoading((prev) => ({ ...prev, languages: false }));
      setLoadedFlags((prev) => ({ ...prev, languages: true }));
    }
  }, []);

  const addDeck = useCallback((deck: DeckListItemDTO) => {
    setDecks((prev) => [...prev, deck]);
  }, []);

  return {
    decks,
    languages,
    quota,
    loading,
    errors,
    decksLoaded: loadedFlags.decks,
    languagesLoaded: loadedFlags.languages,
    fetchQuota,
    fetchDecks,
    fetchLanguages,
    addDeck,
  };
}
