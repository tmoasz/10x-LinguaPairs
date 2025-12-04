/**
 * Reset Password Endpoint
 *
 * Updates the user's password after they've clicked the reset link.
 * Requires an authenticated session (from the callback code exchange).
 */

import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "@/db/supabase.client";
import { logger } from "@/lib/utils/logger";
import { passwordSchema } from "@/lib/validation/auth.schemas";
import { safeRequestJson } from "@/lib/utils/request.utils";
import { z } from "zod";

export const prerender = false;

// Schema for the reset password request body
const resetPasswordBodySchema = z.object({
  password: passwordSchema,
});

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const payload = await safeRequestJson(request).catch(() => ({}));
    const parsed = resetPasswordBodySchema.safeParse(payload);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Nieprawidłowe hasło";
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });

    // Check if user is authenticated (should be after callback code exchange)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logger.warn("[RESET PASSWORD] No authenticated user");
      return new Response(
        JSON.stringify({
          error: "Sesja wygasła. Poproś o nowy link do resetowania hasła.",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Update the user's password
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (error) {
      logger.error("[RESET PASSWORD] Failed to update password", error);

      // Handle specific error cases
      if (error.message.includes("same as")) {
        return new Response(
          JSON.stringify({
            error: "Nowe hasło musi być inne niż poprzednie.",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: "Nie udało się zmienić hasła. Spróbuj ponownie.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    logger.info(`[RESET PASSWORD] Password updated for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Hasło zostało zmienione.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    logger.error("[RESET PASSWORD] Unexpected error", error);
    return new Response(JSON.stringify({ error: "Wystąpił błąd. Spróbuj ponownie." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

