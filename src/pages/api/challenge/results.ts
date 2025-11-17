import type { APIRoute } from "astro";
import { z } from "zod";
import { challengeService } from "@/lib/services/challenge.service";
import { deckService } from "@/lib/services/deck.service";
import { safeRequestJson } from "@/lib/utils/request.utils";
import { logger } from "@/lib/utils/logger";
import { challengeResultSchema } from "@/lib/validation/challenge.validation";

export const prerender = false;

const jsonHeaders = { "Content-Type": "application/json" };

const unauthorizedResponse = () =>
  new Response(
    JSON.stringify({
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    }),
    { status: 401, headers: jsonHeaders }
  );

const notFoundResponse = () =>
  new Response(
    JSON.stringify({
      error: { code: "NOT_FOUND", message: "Deck not found" },
    }),
    { status: 404, headers: jsonHeaders }
  );

export const POST: APIRoute = async ({ request, locals }) => {
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
    body = await safeRequestJson(request);
  } catch {
    return new Response(
      JSON.stringify({
        error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" },
      }),
      { status: 400, headers: jsonHeaders }
    );
  }

  let payload: z.infer<typeof challengeResultSchema>;
  try {
    payload = challengeResultSchema.parse(body);
  } catch (error) {
    const details = error instanceof z.ZodError ? error.issues : undefined;
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: details?.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
      }),
      { status: 400, headers: jsonHeaders }
    );
  }

  try {
    const deck = await deckService.getDeckDetail(supabase, payload.deck_id);
    if (!deck || !deckService.canViewDeck(deck, userId)) {
      return notFoundResponse();
    }

    const result = await challengeService.recordResult(supabase, userId, payload);

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: jsonHeaders,
    });
  } catch (error) {
    logger.error("Unexpected error in POST /api/challenge/results", error);
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
