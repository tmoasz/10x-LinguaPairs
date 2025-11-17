import type { APIRoute } from "astro";
import { CHALLENGE_PAIRS_PER_ROUND, CHALLENGE_REQUIRED_PAIRS, CHALLENGE_ROUNDS } from "@/lib/constants/challenge";
import { challengeService } from "@/lib/services/challenge.service";
import { deckService } from "@/lib/services/deck.service";
import { logger } from "@/lib/utils/logger";

export const prerender = false;

const jsonHeaders = { "Content-Type": "application/json" };

const notFoundResponse = () =>
  new Response(
    JSON.stringify({
      error: {
        code: "NOT_FOUND",
        message: "Deck not found",
      },
    }),
    { status: 404, headers: jsonHeaders }
  );

export const GET: APIRoute = async ({ params, locals }) => {
  const deckId = params.deckId;
  if (!deckId) {
    return notFoundResponse();
  }

  const supabase = locals.supabase;
  if (!supabase) {
    return new Response(
      JSON.stringify({
        error: { code: "INTERNAL_ERROR", message: "Database connection not available" },
      }),
      { status: 500, headers: jsonHeaders }
    );
  }

  try {
    const deck = await deckService.getDeckDetail(supabase, deckId);
    if (!deck || !deckService.canViewDeck(deck, locals.user?.id)) {
      return notFoundResponse();
    }

    if (deck.pairs_count < CHALLENGE_REQUIRED_PAIRS) {
      return new Response(
        JSON.stringify({
          error: {
            code: "NOT_ENOUGH_PAIRS",
            message: `Deck requires at least ${CHALLENGE_REQUIRED_PAIRS} pairs for Challenge mode.`,
          },
          deck: {
            id: deck.id,
            pairs_count: deck.pairs_count,
          },
        }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const { pairs, totalAvailable } = await challengeService.pickPairsForDeck(
      supabase,
      deckId,
      CHALLENGE_REQUIRED_PAIRS
    );

    return new Response(
      JSON.stringify({
        deck_id: deck.id,
        total_available: totalAvailable,
        required_pairs: CHALLENGE_REQUIRED_PAIRS,
        rounds: CHALLENGE_ROUNDS,
        pairs_per_round: CHALLENGE_PAIRS_PER_ROUND,
        pairs,
      }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_ENOUGH_PAIRS") {
      return new Response(
        JSON.stringify({
          error: {
            code: "NOT_ENOUGH_PAIRS",
            message: `Deck requires at least ${CHALLENGE_REQUIRED_PAIRS} pairs for Challenge mode.`,
          },
        }),
        { status: 400, headers: jsonHeaders }
      );
    }

    logger.error("Unexpected error in GET /api/decks/:deckId/challenge-pairs", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      }),
      { status: 500, headers: jsonHeaders }
    );
  }
};
