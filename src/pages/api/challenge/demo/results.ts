export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "zod";
import { safeRequestJson } from "@/lib/utils/request.utils";
import { logger } from "@/lib/utils/logger";

const jsonHeaders = { "Content-Type": "application/json" };

const ResultSchema = z.object({
  guest_id: z.string().uuid(),
  guest_name: z.string().min(1).max(100),
  total_time_ms: z.number().min(0),
  incorrect: z.number().min(0),
});

export const POST: APIRoute = async ({ request, locals }) => {
  const supabase = locals.supabase;
  if (!supabase) {
    return new Response(
      JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Database connection not available" } }),
      { status: 500, headers: jsonHeaders }
    );
  }
  try {
    const body = await safeRequestJson(request);
    const payload = ResultSchema.parse(body);

    const { error } = await supabase
      .from("challenge_demo_results")
      .insert({
        guest_id: payload.guest_id,
        guest_name: payload.guest_name,
        total_time_ms: payload.total_time_ms,
        incorrect: payload.incorrect,
      });

    if (error) {
      logger.error("Failed to insert challenge demo result:", error);
      return new Response(JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Failed to store result" } }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    return new Response(JSON.stringify({ success: true }), { status: 201, headers: jsonHeaders });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid payload",
            details: err.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
          },
        }),
        { status: 422, headers: jsonHeaders }
      );
    }

    logger.error("Unexpected error inserting challenge demo result:", err);
    return new Response(JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Unexpected error" } }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
