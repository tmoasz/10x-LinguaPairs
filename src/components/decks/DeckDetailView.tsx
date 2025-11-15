import { useEffect, useMemo, useState } from "react";
import DeckPicker from "@/components/decks/DeckPicker";
import FlagIcon from "@/components/FlagIcon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { DeckDetailDTO, DeckListItemDTO, DecksListDTO, PairDTO } from "@/types";

interface DeckDetailViewProps {
  deckId: string;
}

interface PairsListResponse {
  pairs: PairDTO[];
  pagination: {
    page: number;
    page_size: number;
    limit?: number;
    total: number;
    total_pages: number;
  };
}

type LoadState = "loading" | "ready" | "error";

const visibilityLabels: Record<DeckDetailDTO["visibility"], string> = {
  private: "Prywatna",
  public: "Publiczna",
  unlisted: "Niepubliczna",
};

export default function DeckDetailView({ deckId }: DeckDetailViewProps) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deck, setDeck] = useState<DeckDetailDTO | null>(null);
  const [pairs, setPairs] = useState<PairDTO[]>([]);
  const [pairPagination, setPairPagination] = useState<PairsListResponse["pagination"] | null>(null);
  const [userDecks, setUserDecks] = useState<DeckListItemDTO[] | null>(null);
  const [draftMeta, setDraftMeta] = useState({
    description: "",
    visibility: "public" as DeckDetailDTO["visibility"],
  });
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [flaggedPairs, setFlaggedPairs] = useState<Record<string, boolean>>({});
  const [flagError, setFlagError] = useState<string | null>(null);
  const [pairsError, setPairsError] = useState<string | null>(null);
  const [flagModal, setFlagModal] = useState<{ pairId: string; termA: string; termB: string } | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [isSubmittingFlag, setIsSubmittingFlag] = useState(false);
  const [isLoadingMorePairs, setIsLoadingMorePairs] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ pairId: string; termA: string; termB: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingPair, setIsDeletingPair] = useState(false);

  const canManageDeck = Boolean(deck?.can_manage);

  useEffect(() => {
    let ignore = false;
    async function loadDecksList() {
      try {
        const response = await fetch("/api/decks?limit=100");
        if (ignore) return;
        if (response.status === 401 || response.status === 403) {
          setUserDecks([]);
          return;
        }
        const data = await parseResponse<DecksListDTO>(response);
        if (!ignore) {
          setUserDecks(data.decks ?? []);
        }
      } catch (error) {
        console.error("Failed to load user's decks list", error);
        if (!ignore) {
          setUserDecks([]);
        }
      }
    }
    loadDecksList();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadDeckData() {
      setLoadState("loading");
      setErrorMessage(null);

      try {
        const [deckResponse, pairsResponse] = await Promise.all([
          fetch(`/api/decks/${deckId}`),
          fetch(`/api/decks/${deckId}/pairs`),
        ]);

        const parsedDeck = await parseResponse<DeckDetailDTO>(deckResponse);
        const parsedPairs = await parseResponse<PairsListResponse>(pairsResponse);

        if (ignore) {
          return;
        }

        setDeck(parsedDeck);
        setPairs(parsedPairs.pairs ?? []);
        setPairPagination(parsedPairs.pagination);
        setPairsError(null);
        setFlaggedPairs(buildFlaggedMap(parsedPairs.pairs ?? []));
        setDraftMeta({
          description: parsedDeck.description ?? "",
          visibility: parsedDeck.visibility,
        });
        setLoadState("ready");
      } catch (error) {
        if (ignore) {
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : "Nie udało się wczytać talii.");
        setLoadState("error");
      }
    }

    loadDeckData();

    return () => {
      ignore = true;
    };
  }, [deckId]);

  const hasMetaChanges = useMemo(() => {
    if (!deck) {
      return false;
    }

    return (deck.description ?? "") !== draftMeta.description || deck.visibility !== draftMeta.visibility;
  }, [deck, draftMeta]);

  const deckOptions = useMemo<DeckListItemDTO[]>(() => {
    if (userDecks && userDecks.length > 0) {
      return userDecks;
    }

    if (!deck) {
      return [];
    }

    return [
      {
        id: deck.id,
        owner_user_id: deck.owner_user_id,
        title: deck.title,
        description: deck.description ?? "",
        lang_a: deck.lang_a,
        lang_b: deck.lang_b,
        visibility: deck.visibility,
        pairs_count: pairPagination?.total ?? pairs.length,
        created_at: deck.created_at,
        updated_at: deck.updated_at,
      },
    ];
  }, [deck, pairs.length, pairPagination, userDecks]);

  async function handleSaveMeta() {
    if (!deck || !hasMetaChanges) {
      return;
    }

    setIsSavingMeta(true);
    setMetaError(null);

    try {
      const payload: Partial<Pick<DeckDetailDTO, "description" | "visibility">> = {};
      if ((deck.description ?? "") !== draftMeta.description) {
        payload.description = draftMeta.description;
      }
      if (deck.visibility !== draftMeta.visibility) {
        payload.visibility = draftMeta.visibility;
      }

      const response = await fetch(`/api/decks/${deckId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const updatedDeck = await parseResponse<DeckDetailDTO>(response);
      setDeck(updatedDeck);
      setDraftMeta({
        description: updatedDeck.description ?? "",
        visibility: updatedDeck.visibility,
      });
    } catch (error) {
      setMetaError(error instanceof Error ? error.message : "Nie udało się zapisać zmian.");
    } finally {
      setIsSavingMeta(false);
    }
  }

  function openFlagModal(pair: PairDTO) {
    setFlagModal({
      pairId: pair.id,
      termA: pair.term_a,
      termB: pair.term_b,
    });
    setFlagReason("");
    setFlagError(null);
  }

  function closeFlagModal() {
    setFlagModal(null);
    setFlagError(null);
  }

  function openDeleteModal(pair: PairDTO) {
    if (!canManageDeck) {
      return;
    }
    setDeleteModal({
      pairId: pair.id,
      termA: pair.term_a,
      termB: pair.term_b,
    });
    setDeleteError(null);
  }

  function closeDeleteModal() {
    setDeleteModal(null);
    setDeleteError(null);
  }

  async function submitFlag() {
    if (!flagModal) {
      return;
    }

    const trimmedReason = flagReason.trim();
    if (!trimmedReason) {
      setFlagError("Wpisz krótki opis błędu (min. 3 znaki).");
      return;
    }

    setIsSubmittingFlag(true);
    setFlagError(null);

    try {
      const response = await fetch(`/api/decks/${deckId}/pairs/${flagModal.pairId}/flag`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: trimmedReason,
        }),
      });

      await parseResponse(response);
      closeFlagModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nie udało się zgłosić pary.";
      setFlagError(message);
    } finally {
      setIsSubmittingFlag(false);
    }
  }

  async function confirmDeletePair() {
    if (!deleteModal) {
      return;
    }

    setIsDeletingPair(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/decks/${deckId}/pairs/${deleteModal.pairId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }

      setPairs((prev) => prev.filter((pair) => pair.id !== deleteModal.pairId));
      setFlaggedPairs((prev) => {
        if (!prev[deleteModal.pairId]) {
          return prev;
        }
        const { [deleteModal.pairId]: _removed, ...rest } = prev;
        void _removed;
        return rest;
      });
      setPairPagination((prev) => {
        if (!prev) {
          return prev;
        }
        const nextTotal = Math.max(0, prev.total - 1);
        const nextTotalPages = nextTotal > 0 ? Math.max(1, Math.ceil(nextTotal / prev.page_size)) : 1;
        return {
          ...prev,
          page_size: prev.page_size,
          limit: prev.page_size,
          total: nextTotal,
          total_pages: nextTotalPages,
          page: Math.min(prev.page, nextTotalPages),
        };
      });
      setDeck((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          pairs_count: Math.max(0, prev.pairs_count - 1),
        };
      });
      closeDeleteModal();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Nie udało się usunąć pary.");
    } finally {
      setIsDeletingPair(false);
    }
  }

  async function loadMorePairs() {
    if (!pairPagination || isLoadingMorePairs) {
      return;
    }

    const nextPage = pairPagination.page + 1;
    if (nextPage > pairPagination.total_pages) {
      return;
    }

    setIsLoadingMorePairs(true);
    setPairsError(null);
    try {
      const response = await fetch(`/api/decks/${deckId}/pairs?page=${nextPage}`);
      const data = await parseResponse<PairsListResponse>(response);
      setPairs((prev) => [...prev, ...(data.pairs ?? [])]);
      setFlaggedPairs((prev) => ({ ...prev, ...buildFlaggedMap(data.pairs ?? []) }));
      setPairPagination(data.pagination);
    } catch (error) {
      console.error("Failed to load more pairs", error);
      setPairsError("Nie udało się wczytać kolejnych par.");
    } finally {
      setIsLoadingMorePairs(false);
    }
  }

  function handleDeckSelect(nextDeckId: string) {
    if (!nextDeckId || nextDeckId === deckId) {
      return;
    }
    window.location.href = `/decks/${nextDeckId}`;
  }

  function handleCreateDeckShortcut() {
    window.location.href = "/generate";
  }

  if (loadState === "loading") {
    return (
      <div className="rounded-xl border border-border bg-card px-6 py-8 text-center text-muted-foreground shadow-sm">
        Ładuję dane talii...
      </div>
    );
  }

  if (loadState === "error" || !deck) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-6 py-8 text-center text-destructive shadow-sm">
        {errorMessage ?? "Nie udało się wczytać talii."}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
          <div className="space-y-6 p-6">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Twoje talie</p>
              <DeckPicker
                decks={deckOptions}
                selectedDeckId={deck.id}
                onSelect={handleDeckSelect}
                onCreateNew={handleCreateDeckShortcut}
              />
            </div>

            <div className="space-y-4 rounded-xl border border-border/50 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold">{deck.title}</h1>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {pairPagination?.total ?? pairs.length} par
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <LanguagePair langA={deck.lang_a} langB={deck.lang_b} />
                <span>•</span>
                <span>Właściciel: {deck.owner.username}</span>
                <span>•</span>
                <span>Widoczność: {visibilityLabels[deck.visibility]}</span>
              </div>
              <TooltipProvider delayDuration={150}>
                <div className="space-y-4 rounded-xl border border-border/50 bg-background/60 p-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="deck-description-input">
                        Opis
                      </label>
                      <Tooltip>
                        <TooltipTrigger className="text-xs text-muted-foreground underline underline-offset-2">
                          Dlaczego ważny?
                        </TooltipTrigger>
                        <TooltipContent>
                          Lepszy opis = lepsze generacje. Opis będzie wzięty pod uwagę przy generowaniu par.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <textarea
                      id="deck-description-input"
                      value={draftMeta.description}
                      onChange={(event) => setDraftMeta((prev) => ({ ...prev, description: event.target.value }))}
                      rows={3}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      placeholder="Dodaj krótki opis talii..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="deck-visibility-input">
                      Widoczność
                    </label>
                    <select
                      id="deck-visibility-input"
                      value={draftMeta.visibility}
                      onChange={(event) =>
                        setDraftMeta((prev) => ({
                          ...prev,
                          visibility: event.target.value as DeckDetailDTO["visibility"],
                        }))
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      {Object.entries(visibilityLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {metaError ? <p className="text-sm text-destructive">{metaError}</p> : null}

                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!hasMetaChanges || isSavingMeta}
                    onClick={handleSaveMeta}
                  >
                    {isSavingMeta ? "Zapisywanie..." : "Zapisz opis i widoczność"}
                  </button>
                </div>
              </TooltipProvider>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 px-6 py-4">
            <div>
              <h2 className="text-xl font-semibold">Lista par</h2>
              <p className="text-sm text-muted-foreground">
                Zgłaszaj niepoprawne tłumaczenia przed nauką lub challenge.
              </p>
            </div>
            <span className="text-sm text-muted-foreground">
              {pairPagination
                ? `Wyświetlono ${pairs.length} z ${pairPagination.total}`
                : `${pairs.length} ${pairs.length === 1 ? "para" : "pary"}`}
            </span>
          </header>

          {pairsError ? <p className="px-6 pt-3 text-sm text-destructive">{pairsError}</p> : null}

          {pairs.length === 0 ? (
            <div className="px-6 py-10 text-center text-muted-foreground">Brak par w tej talii.</div>
          ) : (
            <div className="max-h-[520px] overflow-y-auto">
              <div className="divide-y divide-border/60">
                {pairs.map((pair) => (
                  <div key={pair.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-3">
                    <div className="grid w-full flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                      <span className="break-words text-center text-base font-medium">{pair.term_a}</span>
                      <span className="text-center text-muted-foreground">⟷</span>
                      <span className="break-words text-center text-base font-medium">{pair.term_b}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openFlagModal(pair)}
                        disabled={flaggedPairs[pair.id]}
                        className={`inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                          flaggedPairs[pair.id]
                            ? "border-emerald-200 bg-emerald-50 text-emerald-600 cursor-default"
                            : "border-border text-foreground hover:bg-accent"
                        }`}
                      >
                        {flaggedPairs[pair.id] ? "Zgłoszono" : "Zgłoś błąd"}
                      </button>
                      {canManageDeck ? (
                        <button
                          type="button"
                          onClick={() => openDeleteModal(pair)}
                          disabled={isDeletingPair && deleteModal?.pairId === pair.id}
                          className="inline-flex items-center rounded-md border border-destructive/40 px-3 py-1.5 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Usuń
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pairPagination &&
          pairPagination.total > pairPagination.page_size &&
          pairPagination.page < pairPagination.total_pages ? (
            <div className="border-t border-border/60 px-6 py-4 text-center">
              <button
                type="button"
                onClick={loadMorePairs}
                disabled={isLoadingMorePairs}
                className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingMorePairs ? "Wczytywanie..." : "Załaduj kolejne"}
              </button>
            </div>
          ) : null}
        </section>
      </div>

      {flagModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Zgłoś błąd</h3>
            <p className="text-sm text-muted-foreground">
              {flagModal.termA} ↔ {flagModal.termB}
            </p>

            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="flag-reason-input">
                  Opisz, co jest nie tak (max 500 znaków)
                </label>
                <textarea
                  id="flag-reason-input"
                  value={flagReason}
                  onChange={(event) => setFlagReason(event.target.value)}
                  rows={4}
                  maxLength={500}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Np. błędne tłumaczenie, literówka, zbyt ofensywne..."
                />
                <p className="text-xs text-muted-foreground text-right">{flagReason.trim().length}/500</p>
              </div>
              {flagError ? <p className="text-sm text-destructive">{flagError}</p> : null}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeFlagModal}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                disabled={isSubmittingFlag}
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={submitFlag}
                disabled={isSubmittingFlag}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmittingFlag ? "Wysyłanie..." : "Wyślij zgłoszenie"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-destructive">Usuń parę</h3>
            <p className="text-sm text-muted-foreground">
              Czy na pewno chcesz usunąć tę parę z talii?
              <br />
              <span className="font-medium text-foreground">
                {deleteModal.termA} ↔ {deleteModal.termB}
              </span>
            </p>
            {deleteError ? <p className="mt-3 text-sm text-destructive">{deleteError}</p> : null}

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                disabled={isDeletingPair}
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={confirmDeletePair}
                disabled={isDeletingPair}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeletingPair ? "Usuwanie..." : "Usuń parę"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function LanguagePair({ langA, langB }: { langA: DeckDetailDTO["lang_a"]; langB: DeckDetailDTO["lang_b"] }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
      <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-3 py-1">
        <FlagIcon code={langA.code} size="sm" />
        {langA.name}
      </span>
      <span className="text-muted-foreground">↔</span>
      <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-3 py-1">
        <FlagIcon code={langB.code} size="sm" />
        {langB.name}
      </span>
    </div>
  );
}

function buildFlaggedMap(pairs: PairDTO[]): Record<string, boolean> {
  const next: Record<string, boolean> = {};
  for (const pair of pairs) {
    if (pair.flagged_by_me) {
      next[pair.id] = true;
    }
  }
  return next;
}

async function parseResponse<T = unknown>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    if (payload?.error?.message) {
      return payload.error.message as string;
    }
  } catch {
    // ignore json parse errors
  }

  return `Żądanie nie powiodło się (status ${response.status})`;
}
