import type { APIRoute } from "astro";
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

export const GET: APIRoute = async ({ params, locals, request }) => {
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

    const url = new URL(request.url);
    const limitRaw = url.searchParams.get("limit");
    const limit = limitRaw ? Number(limitRaw) : undefined;

    const leaderboard = await challengeService.getLeaderboard(
      supabase,
      deckId,
      Number.isFinite(limit) ? Math.floor(limit as number) : undefined,
      locals.user?.id
    );

    return new Response(JSON.stringify(leaderboard), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    logger.error("Unexpected error in GET /api/challenge/decks/:deckId/top", error);
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
