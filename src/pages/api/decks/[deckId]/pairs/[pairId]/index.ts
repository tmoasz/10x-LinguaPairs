import type { APIRoute } from "astro";
import { deckService } from "@/lib/services/deck.service";
import { pairService } from "@/lib/services/pair.service";
import { logger } from "@/lib/utils/logger";

export const prerender = false;

const jsonHeaders = { "Content-Type": "application/json" };

const notFoundResponse = () =>
  new Response(
    JSON.stringify({
      error: {
        code: "NOT_FOUND",
        message: "Deck or pair not found",
      },
    }),
    { status: 404, headers: jsonHeaders }
  );

const unauthorizedResponse = () =>
  new Response(
    JSON.stringify({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    }),
    { status: 401, headers: jsonHeaders }
  );

const forbiddenResponse = () =>
  new Response(
    JSON.stringify({
      error: {
        code: "FORBIDDEN",
        message: "You cannot modify this deck",
      },
    }),
    { status: 403, headers: jsonHeaders }
  );

export const DELETE: APIRoute = async ({ params, locals }) => {
  const deckId = params.deckId;
  const pairId = params.pairId;

  if (!deckId || !pairId) {
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

  const userId = locals.user?.id;
  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    const deck = await deckService.getDeckDetail(supabase, deckId);
    if (!deck) {
      return notFoundResponse();
    }

    if (!deckService.isOwner(deck, userId)) {
      return forbiddenResponse();
    }

    const pairExists = await pairService.pairBelongsToDeck(supabase, deckId, pairId);
    if (!pairExists) {
      return notFoundResponse();
    }

    await pairService.deletePair(supabase, { deckId, pairId });

    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message === "PAIR_NOT_FOUND") {
      return notFoundResponse();
    }

    logger.error("Unexpected error in DELETE /api/decks/:deckId/pairs/:pairId", error);
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
