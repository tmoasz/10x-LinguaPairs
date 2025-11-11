import type { APIRoute } from "astro";
import { generationService } from "@/lib/services/generation.service";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const supabase = context.locals.supabase;

  if (!supabase) {
    return new Response(
      JSON.stringify({
        error: { code: "INTERNAL_ERROR", message: "Database connection not available" },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const user = context.locals.user;
  if (!user || !user.id) {
    return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "User not authenticated" } }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const quota = await generationService.quota(supabase, user.id);

    return new Response(JSON.stringify(quota), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch quota" } }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
