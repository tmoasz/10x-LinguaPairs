export const prerender = false;

import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ locals }) => {
  const supabase = locals.supabase;
  const limit = 30;
  
  const { data, error } = await supabase
    .from("challenge_demo_results")
    .select("id, guest_id, guest_name, total_time_ms, incorrect, created_at")
    .order("total_time_ms", { ascending: true })
    .order("incorrect", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch challenge demo leaderboard:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify(data), { status: 200 });
};
