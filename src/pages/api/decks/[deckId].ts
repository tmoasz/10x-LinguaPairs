import type { APIRoute } from "astro";
import { z } from "zod";
import { deckService } from "@/lib/services/deck.service";
import { updateDeckSchema } from "@/lib/validation/deck.validation";

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

export const GET: APIRoute = async ({ params, locals }) => {
  const deckId = params.deckId;
  if (!deckId) {
    return notFoundResponse();
  }

  const supabase = locals.supabase;
  if (!supabase) {
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "Database connection not available",
        },
      }),
      { status: 500, headers: jsonHeaders }
    );
  }

  try {
    const deck = await deckService.getDeckDetail(supabase, deckId);
    if (!deck || !deckService.canViewDeck(deck, locals.user?.id)) {
      return notFoundResponse();
    }

    return new Response(JSON.stringify(deck), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/decks/:deckId", error);
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

export const PATCH: APIRoute = async ({ params, request, locals }) => {
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
        error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" },
      }),
      { status: 400, headers: jsonHeaders }
    );
  }

  try {
    const validatedBody = updateDeckSchema.parse(body);
    const deck = await deckService.getDeckDetail(supabase, deckId);
    if (!deck) {
      return notFoundResponse();
    }

    if (!deckService.isOwner(deck, userId)) {
      return forbiddenResponse();
    }

    await deckService.updateDeckMeta(supabase, deckId, validatedBody);
    const updatedDeck = await deckService.getDeckDetail(supabase, deckId);

    if (!updatedDeck) {
      return notFoundResponse();
    }

    return new Response(JSON.stringify(updatedDeck), {
      status: 200,
      headers: jsonHeaders,
    });
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

    console.error("Unexpected error in PATCH /api/decks/:deckId", error);
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
