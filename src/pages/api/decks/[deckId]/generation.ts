import type { APIRoute } from "astro";
import { z } from "zod";
import { generationService } from "@/lib/services/generation.service";
import { logger } from "@/lib/utils/logger";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const supabase = context.locals.supabase;

  if (!supabase) {
    return new Response(
      JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Database connection not available" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Check authentication
  const user = context.locals.user;
  if (!user || !user.id) {
    return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "User not authenticated" } }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = user.id;

  try {
    const deckId = context.params.deckId;
    if (!deckId) {
      return new Response(JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Missing deckId" } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    // Validate UUID shape (simple check)
    const uuidSchema = z.string().uuid();
    uuidSchema.parse(deckId);

    const active = await generationService.getActiveForDeck(supabase, userId, deckId);
    if (!active) {
      return new Response(null, { status: 204 });
    }

    return new Response(
      JSON.stringify({
        id: active.id,
        status: active.status,
        deck_id: active.deck_id,
        pairs_requested: active.pairs_requested,
        created_at: active.created_at,
        started_at: active.started_at,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Invalid deckId format" } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    logger.error("Unexpected error in GET /api/decks/:deckId/generation:", error);
    return new Response(
      JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
