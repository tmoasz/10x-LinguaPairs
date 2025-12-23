export const prerender = false;

import type { APIRoute } from "astro";
import { logger } from "@/lib/utils/logger";

const jsonHeaders = { "Content-Type": "application/json" };

export const GET: APIRoute = async ({ locals }) => {
  const supabase = locals.supabase;
  if (!supabase) {
    return new Response(
      JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Database connection not available" } }),
      { status: 500, headers: jsonHeaders }
    );
  }
  const limit = 30;
  
  const { data, error } = await supabase
    .from("challenge_demo_results")
    .select("id, guest_id, guest_name, total_time_ms, incorrect, created_at")
    .order("total_time_ms", { ascending: true })
    .order("incorrect", { ascending: true })
    .limit(limit);

  if (error) {
    logger.error("Failed to fetch challenge demo leaderboard:", error);
    return new Response(JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch leaderboard" } }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  return new Response(JSON.stringify(data ?? []), { status: 200, headers: jsonHeaders });
};
