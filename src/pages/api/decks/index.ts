import type { APIRoute } from "astro";
import { z } from "zod";
import { createDeckSchema } from "@/lib/validation/deck.validation";
import { deckService } from "@/lib/services/deck.service";
import { ValidationError } from "@/lib/errors";
import type { DecksListDTO, DeckListItemDTO } from "@/types";
import { logger } from "@/lib/utils/logger";
import { safeRequestJson } from "@/lib/utils/request.utils";

export const prerender = false;

/**
 * GET /api/decks
 *
 * List user's decks with pagination.
 *
 * Query Parameters:
 * - page (integer, default: 1) - Page number
 * - limit (integer, default: 20, max: 100) - Items per page
 * - sort (string, default: "created_at") - Sort field
 * - order (enum: "asc" | "desc", default: "desc") - Sort order
 *
 * Returns:
 * - 200 OK with DecksListDTO on success
 * - 400 Bad Request for invalid query parameters
 * - 500 Internal Server Error for unexpected errors
 */
export const GET: APIRoute = async (context) => {
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

  // Check authentication
  const user = context.locals.user;
  if (!user || !user.id) {
    return new Response(
      JSON.stringify({
        error: {
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const userId = user.id;

  try {
    // Parse query parameters
    const url = new URL(context.request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));
    const sort = url.searchParams.get("sort") || "created_at";
    const order = (url.searchParams.get("order") || "desc") as "asc" | "desc";

    if (isNaN(page) || isNaN(limit)) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters: page and limit must be numbers",
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const offset = (page - 1) * limit;

    // Fetch decks with languages and pairs count
    // First, get total count
    // RLS will automatically filter to user's decks, but we add explicit filter for extra security
    const { count: totalCount, error: countError } = await supabase
      .from("decks")
      .select("*", { count: "exact", head: true })
      .eq("owner_user_id", userId)
      .is("deleted_at", null);

    if (countError) {
      logger.error("Error counting decks:", {
        error: countError,
        message: countError.message,
        details: countError.details,
        hint: countError.hint,
        code: countError.code,
      });
      return new Response(
        JSON.stringify({
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to count decks",
            details: {
              message: countError.message,
              code: countError.code,
              hint: countError.hint,
            },
          },
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Fetch decks
    // RLS will automatically filter to user's decks, but we add explicit filter for extra security
    const { data: decks, error: decksError } = await supabase
      .from("decks")
      .select("id, owner_user_id, title, description, lang_a, lang_b, visibility, created_at, updated_at")
      .eq("owner_user_id", userId)
      .is("deleted_at", null)
      .order(sort, { ascending: order === "asc" })
      .range(offset, offset + limit - 1);

    if (decksError) {
      logger.error("Error fetching decks:", {
        error: decksError,
        message: decksError.message,
        details: decksError.details,
        hint: decksError.hint,
        code: decksError.code,
      });
      return new Response(
        JSON.stringify({
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to fetch decks",
            details: {
              message: decksError.message,
              code: decksError.code,
              hint: decksError.hint,
            },
          },
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!decks || decks.length === 0) {
      const response: DecksListDTO = {
        decks: [],
        pagination: {
          page,
          page_size: limit,
          limit,
          total: totalCount || 0,
          total_pages: Math.ceil((totalCount || 0) / limit),
        },
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get all unique language IDs
    const languageIds = new Set<string>();
    const deckIds = decks.map((deck) => deck.id);
    for (const deck of decks) {
      languageIds.add(deck.lang_a);
      languageIds.add(deck.lang_b);
    }

    // Fetch languages
    const { data: languages, error: languagesError } = await supabase
      .from("languages")
      .select("id, code, name, flag_emoji")
      .in("id", Array.from(languageIds));

    if (languagesError) {
      logger.error("Error fetching languages:", languagesError);
      throw new Error(`Failed to fetch languages: ${languagesError.message}`);
    }

    // Create language map
    const languageMap = new Map<string, { id: string; code: string; name: string; flag_emoji: string | null }>();
    for (const lang of languages || []) {
      languageMap.set(lang.id, {
        id: lang.id,
        code: lang.code,
        name: lang.name,
        flag_emoji: lang.flag_emoji,
      });
    }

    // Get pairs count for each deck
    const { data: pairsCounts, error: pairsError } = await supabase
      .from("pairs")
      .select("deck_id")
      .in("deck_id", deckIds)
      .is("deleted_at", null);

    if (pairsError) {
      logger.error("Error counting pairs:", pairsError);
      throw new Error(`Failed to count pairs: ${pairsError.message}`);
    }

    // Count pairs per deck
    const pairsCountMap = new Map<string, number>();
    for (const pair of pairsCounts || []) {
      pairsCountMap.set(pair.deck_id, (pairsCountMap.get(pair.deck_id) || 0) + 1);
    }

    // Transform to DTO format
    const decksList: DeckListItemDTO[] = decks.map((deck) => {
      const langA = languageMap.get(deck.lang_a);
      const langB = languageMap.get(deck.lang_b);

      if (!langA || !langB) {
        throw new Error(`Language data missing for deck ${deck.id}`);
      }

      return {
        id: deck.id,
        owner_user_id: deck.owner_user_id,
        title: deck.title,
        description: deck.description || "",
        lang_a: {
          id: langA.id,
          code: langA.code,
          name: langA.name,
          flag_emoji: langA.flag_emoji ?? null,
        },
        lang_b: {
          id: langB.id,
          code: langB.code,
          name: langB.name,
          flag_emoji: langB.flag_emoji ?? null,
        },
        visibility: deck.visibility,
        pairs_count: pairsCountMap.get(deck.id) || 0,
        created_at: deck.created_at,
        updated_at: deck.updated_at,
      };
    });

    const totalPages = Math.ceil((totalCount || 0) / limit);

    const response: DecksListDTO = {
      decks: decksList,
      pagination: {
        page,
        page_size: limit,
        limit,
        total: totalCount || 0,
        total_pages: totalPages,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Unexpected error in GET /api/decks:", error);
    if (error && typeof error === "object" && "message" in error) {
      logger.error("Error message:", error.message);
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

  // Check authentication
  const user = context.locals.user;
  if (!user || !user.id) {
    return new Response(
      JSON.stringify({
        error: {
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const userId = user.id;

  try {
    let body;
    try {
      body = await safeRequestJson(context.request);
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

    const deck = await deckService.createDeck(supabase, userId, validatedData);

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
    logger.error("Unexpected error in POST /api/decks:", error);
    if (error && typeof error === "object" && "message" in error) {
      logger.error("Error message:", error.message);
    }
    if (error && typeof error === "object" && "code" in error) {
      logger.error("Error code:", error.code);
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

