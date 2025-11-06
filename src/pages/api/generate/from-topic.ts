import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import { DEFAULT_USER_ID } from "@/db/supabase.client";
import { generationService } from "@/lib/services/generation.service";
import { generateFromTopicSchema } from "@/lib/validation/generation.validation";

/**
 * POST /api/generate/from-topic
 * Returns 201 with GenerationResponseDTO (MVP synchronous generation).
 */

export const prerender = false;

export const POST: APIRoute = async (context) => {
  // Prefer service role when available (dev), otherwise use locals client
  const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = supabaseServiceRoleKey
    ? createClient<Database>(import.meta.env.SUPABASE_URL, supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : context.locals.supabase;

  if (!supabase) {
    return new Response(
      JSON.stringify({
        error: { code: "INTERNAL_ERROR", message: "Database connection not available" },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const raw = await context.request.json();
    const body = generateFromTopicSchema.parse(raw);

    const userId = DEFAULT_USER_ID;
    if (!userId) {
      return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "User not authenticated" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await generationService.runFromTopic(supabase, userId, body);
    const quota = await generationService.quota(supabase, userId);

    return new Response(JSON.stringify({ ...result, deck_id: body.deck_id, quota }), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        Location: `/api/decks/${body.deck_id}/generation`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: error.errors.map((e) => ({ field: e.path.join("."), message: e.message })),
          },
        }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    if (error && typeof error === "object" && "message" in error) {
      const msg = String((error as any).message);
      if (msg === "QUOTA_EXCEEDED") {
        return new Response(
          JSON.stringify({ error: { code: "QUOTA_EXCEEDED", message: "Daily generation limit reached" } }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      if (msg === "GENERATION_IN_PROGRESS") {
        return new Response(
          JSON.stringify({ error: { code: "CONFLICT", message: "Another generation is in progress" } }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }
      if (msg === "DECK_NOT_FOUND") {
        return new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "Deck not found" } }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (msg === "FORBIDDEN") {
        return new Response(JSON.stringify({ error: { code: "FORBIDDEN", message: "You do not own this deck" } }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    console.error("Unexpected error in POST /api/generate/from-topic:", error);
    return new Response(
      JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
