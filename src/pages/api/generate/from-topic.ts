import type { APIRoute } from "astro";
import { z } from "zod";
import { generationService } from "@/lib/services/generation.service";
import { generateFromTopicSchema } from "@/lib/validation/generation.validation";
import { getErrorMessage } from "@/lib/utils/error.utils";

/**
 * POST /api/generate/from-topic
 * Returns 201 with GenerationResponseDTO (MVP synchronous generation).
 */

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const supabase = context.locals.supabase;

  if (!supabase) {
    return new Response(
      JSON.stringify({
        error: { code: "INTERNAL_ERROR", message: "Database connection not available" },
      }),
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
    const raw = await context.request.json();
    const body = generateFromTopicSchema.parse(raw);

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

    const message = getErrorMessage(error);
    if (message) {
      if (message === "QUOTA_EXCEEDED") {
        return new Response(
          JSON.stringify({ error: { code: "QUOTA_EXCEEDED", message: "Daily generation limit reached" } }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      if (message === "GENERATION_IN_PROGRESS") {
        return new Response(
          JSON.stringify({ error: { code: "CONFLICT", message: "Another generation is in progress" } }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }
      if (message === "DECK_NOT_FOUND") {
        return new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "Deck not found" } }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (message === "FORBIDDEN") {
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
