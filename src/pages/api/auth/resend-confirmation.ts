import type { APIRoute } from "astro";
import { z } from "zod";

import { createSupabaseServerInstance } from "@/db/supabase.client";
import { emailSchema } from "@/lib/validation/auth.schemas";
import { safeRequestJson } from "@/lib/utils/request.utils";

export const prerender = false;

const resendConfirmationSchema = z.object({
  email: emailSchema,
});

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const payload = await safeRequestJson(request).catch(() => ({}));
    const parsed = resendConfirmationSchema.safeParse(payload);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Nieprawidłowy adres e-mail";
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });

    // Supabase resend confirmation email
    // Używamy metody resend jeśli jest dostępna, w przeciwnym razie informujemy użytkownika
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: parsed.data.email,
      });

      if (error) {
        const message =
          error.message === "Email rate limit exceeded"
            ? "Zbyt wiele prób. Spróbuj ponownie za chwilę."
            : error.message || "Nie udało się wysłać emaila. Spróbuj ponownie.";

        return new Response(JSON.stringify({ error: message }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch {
      // Jeśli resend nie jest dostępne w tej wersji Supabase, informujemy użytkownika
      // że może spróbować ponownie zarejestrować się lub skontaktować z supportem
      return new Response(
        JSON.stringify({
          error:
            "Funkcja ponownego wysyłania emaila nie jest dostępna. Spróbuj zarejestrować się ponownie lub skontaktuj się z supportem.",
        }),
        {
          status: 501,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        message: "Link aktywacyjny został ponownie wysłany na Twój adres e-mail.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Resend confirmation API error", error);
    return new Response(JSON.stringify({ error: "Wystąpił błąd. Spróbuj ponownie." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
