import type { APIRoute } from "astro";
import { deckService } from "@/lib/services/deck.service";
import { pairService } from "@/lib/services/pair.service";

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
    const pageParamRaw = url.searchParams.get("page");
    const pageSizeParamRaw = url.searchParams.get("page_size");
    const legacyLimitParamRaw = url.searchParams.get("limit");
    const pageParam = pageParamRaw !== null ? Number(pageParamRaw) : undefined;
    const pageSizeParam =
      pageSizeParamRaw !== null
        ? Number(pageSizeParamRaw)
        : legacyLimitParamRaw !== null
          ? Number(legacyLimitParamRaw)
          : undefined;

    const response = await pairService.listByDeck(supabase, {
      deckId,
      page: Number.isFinite(pageParam) ? Math.floor(pageParam) : undefined,
      pageSize: Number.isFinite(pageSizeParam) ? Math.floor(pageSizeParam) : undefined,
      userId: locals.user?.id ?? undefined,
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/decks/:deckId/pairs", error);
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
