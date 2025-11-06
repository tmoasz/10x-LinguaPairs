import type { APIRoute } from "astro";

import { createSupabaseServerInstance } from "@/db/supabase.client";
import { loginSchema } from "@/lib/validation/auth.schemas";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const payload = await request.json().catch(() => ({}));
    const parsed = loginSchema.safeParse(payload);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Nieprawidłowe dane";
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      const message =
        error.message === "Invalid login credentials"
          ? "Błędny e-mail lub hasło"
          : error.message || "Nie udało się zalogować. Spróbuj ponownie.";

      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        user: data.user ? { id: data.user.id, email: data.user.email } : null,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Login API error", error);
    return new Response(JSON.stringify({ error: "Wystąpił błąd. Spróbuj ponownie." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
