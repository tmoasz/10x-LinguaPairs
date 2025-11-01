import type { APIRoute } from "astro";
import { z } from "zod";
import { languageIdParamSchema } from "@/lib/validation/language.validation";
import { languageService } from "@/lib/services/language.service";

export const prerender = false;

/**
 * GET /api/languages/:id
 *
 * Retrieves detailed information about a specific language by ID.
 *
 * This is a public endpoint - no authentication required.
 * Business rule: Only active languages (is_active = true) are returned.
 * RLS and service layer both filter out inactive languages.
 *
 * Path Parameters:
 * - id (required) - Language UUID
 *
 * Returns:
 * - 200 OK with Language object (including created_at) on success
 * - 400 Bad Request for invalid UUID format
 * - 404 Not Found if language doesn't exist or is inactive
 * - 500 Internal Server Error for unexpected errors
 */
export const GET: APIRoute = async (context) => {
  try {
    // 1. Validate path parameter
    const validatedParams = languageIdParamSchema.parse({
      id: context.params.id,
    });

    // 2. Get supabase client from context
    const supabase = context.locals.supabase;
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

    // 3. Fetch language from database
    const language = await languageService.getLanguageById(supabase, validatedParams.id);

    // 4. Check if language was found
    if (!language) {
      return new Response(
        JSON.stringify({
          error: {
            code: "NOT_FOUND",
            message: "Language not found",
          },
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 5. Return success response
    return new Response(JSON.stringify(language), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid language ID format",
            details: error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle other errors
    console.error("Unexpected error in GET /api/languages/:id:", error);

    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
