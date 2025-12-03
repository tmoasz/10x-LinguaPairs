/**
 * MagicLinkHandler Component
 *
 * Handles magic link authentication by parsing hash fragment tokens
 * and establishing a session. Shows loading/success/error states.
 */

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Client-side Supabase instance for auth operations
const supabase = createClient(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_ANON_KEY);

type Status = "processing" | "success" | "error";

interface HashParams {
  access_token?: string;
  refresh_token?: string;
  expires_in?: string;
  token_type?: string;
  type?: string;
  error?: string;
  error_description?: string;
}

function parseHashParams(hash: string): HashParams {
  const params: HashParams = {};
  const hashContent = hash.substring(1); // Remove the '#'

  if (!hashContent) return params;

  const pairs = hashContent.split("&");
  for (const pair of pairs) {
    const [key, value] = pair.split("=");
    if (key && value) {
      params[key as keyof HashParams] = decodeURIComponent(value.replace(/\+/g, " "));
    }
  }

  return params;
}

export default function MagicLinkHandler() {
  const [status, setStatus] = useState<Status>("processing");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const handleMagicLink = async () => {
      // Only run in browser
      if (typeof window === "undefined") return;

      const hash = window.location.hash;

      // Check if hash exists
      if (!hash || hash === "#") {
        setStatus("error");
        setErrorMessage("Brak danych uwierzytelniających w linku.");
        return;
      }

      const params = parseHashParams(hash);

      // Check for error in hash params (Supabase error response)
      if (params.error) {
        setStatus("error");
        setErrorMessage(params.error_description || params.error || "Wystąpił błąd uwierzytelniania.");
        return;
      }

      // Validate required tokens
      if (!params.access_token || !params.refresh_token) {
        setStatus("error");
        setErrorMessage("Nieprawidłowy lub niekompletny link logowania.");
        return;
      }

      try {
        // Set the session using the tokens from the hash
        const { data, error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });

        if (error) {
          console.error("[MAGIC LINK] Failed to set session:", error.message);
          setStatus("error");
          setErrorMessage(
            error.message === "Invalid Refresh Token"
              ? "Link wygasł lub został już wykorzystany."
              : error.message || "Nie udało się zalogować."
          );
          return;
        }

        if (data.session) {
          console.log("[MAGIC LINK] Session established successfully");
          setStatus("success");

          // Clear the hash from URL for cleaner look
          window.history.replaceState(null, "", window.location.pathname);

          // Determine redirect based on type
          // 'recovery' = password reset, 'magiclink' = login, 'signup' = email confirmation
          const redirectTo = params.type === "recovery" ? "/auth/reset" : "/";

          // Redirect after short delay to show success state
          setTimeout(() => {
            window.location.href = redirectTo;
          }, 1500);
        } else {
          // Session not established without explicit error
          console.error("[MAGIC LINK] No session returned");
          setStatus("error");
          setErrorMessage("Nie udało się ustanowić sesji. Spróbuj ponownie.");
        }
      } catch (err) {
        console.error("[MAGIC LINK] Unexpected error:", err);
        setStatus("error");
        setErrorMessage("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
      }
    };

    handleMagicLink();
  }, []);

  return (
    <div className="text-center space-y-6">
      {status === "processing" && (
        <>
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Logowanie...</h3>
            <p className="text-sm text-muted-foreground">Proszę czekać, trwa weryfikacja.</p>
          </div>
        </>
      )}

      {status === "success" && (
        <>
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-full animate-fade-in">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Zalogowano pomyślnie!</h3>
            <p className="text-sm text-muted-foreground">Za chwilę nastąpi przekierowanie...</p>
          </div>
        </>
      )}

      {status === "error" && (
        <>
          <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full animate-fade-in">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Błąd logowania</h3>
            <p className="text-sm text-muted-foreground mb-6">{errorMessage}</p>
            <div className="flex flex-col gap-3">
              <Button asChild size="lg" className="w-full">
                <a href="/auth/login">Zaloguj się ponownie</a>
              </Button>
              <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Powrót do strony głównej
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
