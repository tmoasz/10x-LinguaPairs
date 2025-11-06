import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import { DEFAULT_USER_ID } from "@/db/supabase.client";
import { generationService } from "@/lib/services/generation.service";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = supabaseServiceRoleKey
    ? createClient<Database>(import.meta.env.SUPABASE_URL, supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : context.locals.supabase;

  if (!supabase) {
    return new Response(
      JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Database connection not available" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

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

    const userId = DEFAULT_USER_ID;
    if (!userId) {
      return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "User not authenticated" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

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

    console.error("Unexpected error in GET /api/decks/:deckId/generation:", error);
    return new Response(
      JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
