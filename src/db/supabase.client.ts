import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { AstroCookies } from "astro";

import type { Database } from "../db/database.types.ts";

// Re-export typed SupabaseClient for use throughout the application
export type SupabaseClient = ReturnType<typeof createServerClient<Database>>;

/**
 * @deprecated This was used during development before authentication was implemented.
 * All API endpoints now use context.locals.user.id from authenticated sessions.
 * This may still be used in tests or development scripts, but should not be used in production code.
 */
export const DEFAULT_USER_ID: string = import.meta.env.DEFAULT_USER_ID ?? "";

// SSR server client (per-request) with cookie management via getAll/setAll
const isProduction = import.meta.env.PROD ?? false;

export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: isProduction,
  httpOnly: true,
  sameSite: "lax",
};

function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  if (!cookieHeader) return [];
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

export const createSupabaseServerInstance = (context: { headers: Headers; cookies: AstroCookies }) => {
  const supabase = createServerClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
      },
    },
  });

  return supabase;
};
