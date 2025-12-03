import { defineMiddleware } from "astro:middleware";
import { logger } from "@/lib/utils/logger";
import { createSupabaseServerInstance } from "../db/supabase.client.ts";

const PUBLIC_EXACT = new Set<string>([
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/forgot",
  "/auth/reset",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot",
  "/api/auth/resend-confirmation",
  "/api/auth/logout",
  "/api/auth/signout",
  "/api/auth/session",
  "/api/challenge/demo/results",
  "/api/challenge/demo/leaderboard",
  "/favicon.ico",
  "/robots.txt",
  "/manifest.webmanifest",
]);

const PUBLIC_PREFIXES = ["/_astro/", "/assets/", "/public/", "/learn/public/", "/challenge/public/", "/sets/public/"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export const onRequest = defineMiddleware(async ({ locals, cookies, url, request, redirect }, next) => {
  const startTime = Date.now();

  logger.debug(`[MIDDLEWARE] ${request.method} ${url.pathname}${url.search}`);

  const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });
  locals.supabase = supabase;

  // Always attempt to fetch user to populate locals
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    locals.user = { id: user.id, email: user.email ?? null };
    logger.debug(`[MIDDLEWARE] User authenticated: ${user.email} (${user.id})`);
  } else {
    logger.debug(`[MIDDLEWARE] User not authenticated`);
  }

  if (!user && !isPublicPath(url.pathname)) {
    const nextPath = `${url.pathname}${url.search}`;
    logger.debug(`[MIDDLEWARE] Redirecting to login (protected route)`);
    return redirect(`/auth/login?redirect=${encodeURIComponent(nextPath)}`);
  }

  const response = await next();

  const duration = Date.now() - startTime;
  logger.debug(`[MIDDLEWARE] ${request.method} ${url.pathname} → ${response.status} (${duration}ms)`);

  return response;
});
