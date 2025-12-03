/**
 * Forgot Password Endpoint
 *
 * Sends a password reset email to the user.
 * The email contains a link that redirects to /api/auth/callback which
 * exchanges the code for a session and then redirects to /auth/reset.
 */

import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "@/db/supabase.client";
import { logger } from "@/lib/utils/logger";
import { forgotSchema } from "@/lib/validation/auth.schemas";
import { safeRequestJson } from "@/lib/utils/request.utils";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, url }) => {
  try {
    const payload = await safeRequestJson(request).catch(() => ({}));
    const parsed = forgotSchema.safeParse(payload);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Nieprawidłowy adres e-mail";
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });

    // Build the redirect URL for the callback endpoint
    // The callback will exchange the code and redirect to /auth/reset
    const redirectTo = `${url.origin}/api/auth/callback?next=/auth/reset`;

    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo,
    });

    if (error) {
      logger.error("[FORGOT PASSWORD] Failed to send reset email", error);
      // Don't reveal if the email exists or not for security
      // Always return success to prevent email enumeration
    }

    // Always return success to prevent email enumeration attacks
    return new Response(
      JSON.stringify({
        success: true,
        message: "Jeśli konto istnieje, wysłaliśmy link do resetowania hasła.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    logger.error("[FORGOT PASSWORD] Unexpected error", error);
    return new Response(JSON.stringify({ error: "Wystąpił błąd. Spróbuj ponownie." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

