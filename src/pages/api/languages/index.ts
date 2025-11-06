import type { APIRoute } from "astro";
import { z } from "zod";
import { languagesListQuerySchema } from "@/lib/validation/language.validation";
import { languageService } from "@/lib/services/language.service";

export const prerender = false;

/**
 * GET /api/languages
 *
 * Retrieves a list of all active languages.
 *
 * This is a public endpoint - no authentication required.
 * RLS automatically filters out inactive languages.
 *
 * Query Parameters:
 * - sort (optional, default: "sort_order") - Field to sort by
 *
 * Returns:
 * - 200 OK with LanguagesListDTO on success
 * - 400 Bad Request for validation errors
 * - 500 Internal Server Error for unexpected errors
 */
export const GET: APIRoute = async (context) => {
  try {
    // 1. Parse query parameters
    const searchParams = context.url.searchParams;
    const queryParams = {
      sort: searchParams.get("sort") || undefined,
    };

    // 2. Validate query parameters
    const validatedQuery = languagesListQuerySchema.parse(queryParams);

    // 3. Get supabase client from context
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

    // 4. Fetch languages from database
    const result = await languageService.getLanguages(supabase, validatedQuery);

    // 5. Return success response
    return new Response(JSON.stringify(result), {
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
            message: "Invalid query parameters",
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
    console.error("Unexpected error in GET /api/languages:", error);

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
