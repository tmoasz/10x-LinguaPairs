import type { APIRoute } from "astro";
import { z } from "zod";
import { createDeckSchema } from "@/lib/validation/deck.validation";
import { deckService } from "@/lib/services/deck.service";
import { ValidationError } from "@/lib/errors";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_USER_ID } from "@/db/supabase.client";
import type { Database } from "@/db/database.types";

export const prerender = false;

/**
 * POST /decks
 *
 * Creates a new vocabulary deck for the test user.
 *
 * Requires:
 * - JSON body with title, description, lang_a, lang_b, and optional visibility
 *
 * Returns:
 * - 201 Created with CreateDeckResponseDTO on success (language IDs only, frontend resolves from cache)
 * - 400 Bad Request for validation/business logic errors
 * - 422 Unprocessable Entity for format/schema errors
 * - 500 Internal Server Error for unexpected errors
 */
export const POST: APIRoute = async (context) => {
  // Use service role key to bypass RLS for test user (development only)
  // In production, this should use authenticated user's client
  const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = supabaseServiceRoleKey
    ? createClient<Database>(import.meta.env.SUPABASE_URL, supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : context.locals.supabase;

  if (!supabase) {
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "Database connection not available",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    let body;
    try {
      body = await context.request.json();
    } catch (parseError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_FORMAT",
            message: "Invalid JSON format: " + (parseError as Error).message,
          },
        }),
        {
          status: 422,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const validatedData = createDeckSchema.parse(body);

    const deck = await deckService.createDeck(supabase, DEFAULT_USER_ID, validatedData);

    return new Response(JSON.stringify(deck), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        Location: `/api/decks/${deck.id}`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
        }),
        {
          status: 422,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (error instanceof ValidationError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: error.message,
            details: error.details,
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Log error details for debugging
    console.error("Unexpected error in POST /api/decks:", error);
    if (error && typeof error === "object" && "message" in error) {
      console.error("Error message:", error.message);
    }
    if (error && typeof error === "object" && "code" in error) {
      console.error("Error code:", error.code);
    }

    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
          ...(process.env.NODE_ENV === "development" && error && typeof error === "object" && "message" in error
            ? { details: String(error.message) }
            : {}),
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
