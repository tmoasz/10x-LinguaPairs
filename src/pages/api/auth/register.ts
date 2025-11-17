import type { APIRoute } from "astro";
import { z } from "zod";

import { createSupabaseServerInstance } from "@/db/supabase.client";
import { logger } from "@/lib/utils/logger";
import { emailSchema, passwordSchema } from "@/lib/validation/auth.schemas";
import { safeRequestJson } from "@/lib/utils/request.utils";

export const prerender = false;

const registerApiSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const payload = await safeRequestJson(request).catch(() => ({}));
    const parsed = registerApiSchema.safeParse(payload);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Nieprawidłowe dane";
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });

    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      const message =
        error.message === "User already registered"
          ? "Konto z tym adresem już istnieje."
          : error.message || "Nie udało się utworzyć konta. Spróbuj ponownie.";

      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Supabase zawsze wysyła email aktywacyjny (nawet jeśli enable_confirmations = false)
    // Jeśli user jest null, oznacza to że email wymaga potwierdzenia
    // Jeśli user istnieje, może oznaczać że potwierdzenie nie jest wymagane lub zostało już potwierdzone
    const requiresConfirmation = !data.user;

    return new Response(
      JSON.stringify({
        message: requiresConfirmation
          ? "Sprawdź swoją skrzynkę e-mail. Wysłaliśmy link aktywacyjny do potwierdzenia konta."
          : "Konto zostało utworzone pomyślnie!",
        requiresConfirmation,
        email: parsed.data.email,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    logger.error("Register API error", error);
    return new Response(JSON.stringify({ error: "Wystąpił błąd. Spróbuj ponownie." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
