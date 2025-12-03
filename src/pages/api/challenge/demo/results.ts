export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "zod";
import { safeRequestJson } from "@/lib/utils/request.utils";

const ResultSchema = z.object({
  guest_id: z.string().uuid(),
  guest_name: z.string().min(1).max(100),
  total_time_ms: z.number().min(0),
  incorrect: z.number().min(0),
});

export const POST: APIRoute = async ({ request, locals }) => {
  const supabase = locals.supabase;
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
      console.error("Failed to insert challenge demo result:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("Invalid challenge demo result payload:", err);
    return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400 });
  }
};
