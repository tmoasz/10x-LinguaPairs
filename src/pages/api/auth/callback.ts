/**
 * Auth Callback Endpoint
 *
 * Handles OAuth/Auth code exchange for password reset and other auth flows.
 * Exchanges the code for a session and redirects to the specified destination.
 */

import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "@/db/supabase.client";
import { logger } from "@/lib/utils/logger";

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";

  if (!code) {
    logger.warn("[AUTH CALLBACK] No code provided");
    return redirect("/auth/login?error=missing_code");
  }

  try {
    const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      logger.error("[AUTH CALLBACK] Code exchange failed", error);
      // For password reset, redirect to forgot page with error
      if (next === "/auth/reset") {
        return redirect("/auth/forgot?error=link_expired");
      }
      return redirect("/auth/login?error=auth_failed");
    }

    logger.debug(`[AUTH CALLBACK] Code exchanged successfully, redirecting to ${next}`);
    return redirect(next);
  } catch (error) {
    logger.error("[AUTH CALLBACK] Unexpected error", error);
    return redirect("/auth/login?error=unexpected");
  }
};

