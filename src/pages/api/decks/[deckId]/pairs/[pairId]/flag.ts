import type { APIRoute } from "astro";
import { z } from "zod";
import { deckService } from "@/lib/services/deck.service";
import { pairService } from "@/lib/services/pair.service";
import { flagPairSchema } from "@/lib/validation/pair.validation";

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

export const POST: APIRoute = async ({ params, request, locals }) => {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid JSON body",
        },
      }),
      { status: 400, headers: jsonHeaders }
    );
  }

  try {
    const deck = await deckService.getDeckDetail(supabase, deckId);
    if (!deck || !deckService.canViewDeck(deck, userId)) {
      return notFoundResponse();
    }

    const pairExists = await pairService.pairBelongsToDeck(supabase, deckId, pairId);
    if (!pairExists) {
      return notFoundResponse();
    }

    const validatedBody = flagPairSchema.parse(body);
    try {
      const response = await pairService.flagPair(supabase, {
        deckId,
        pairId,
        userId,
        reason: validatedBody.reason,
      });

      return new Response(JSON.stringify(response), {
        status: 201,
        headers: jsonHeaders,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "PAIR_ALREADY_FLAGGED") {
        return new Response(
          JSON.stringify({
            error: {
              code: "CONFLICT",
              message: "Ta para została już zgłoszona przez Ciebie",
            },
          }),
          { status: 409, headers: jsonHeaders }
        );
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request body",
            details: error.errors.map((err) => ({
              field: err.path.join("."),
              message: err.message,
            })),
          },
        }),
        { status: 400, headers: jsonHeaders }
      );
    }

    console.error("Unexpected error in POST /api/decks/:deckId/pairs/:pairId/flag", error);
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
