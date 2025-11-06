/**
 * RegisterForm Component
 *
 * Registration form with email, password, password confirmation using Shadcn/ui
 * Features: password strength indicator, inline validation, animated UI, Toaster
 */

import { useCallback, useState } from "react";
import type React from "react";
import {
  registerSchema,
  type RegisterFormData,
  getPasswordStrength,
  emailSchema,
  passwordSchema,
} from "@/lib/validation/auth.schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function RegisterForm() {
  const [formData, setFormData] = useState<RegisterFormData>({
    email: "",
    password: "",
    passwordConfirm: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof RegisterFormData, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendEmail, setResendEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const passwordStrength = formData.password ? getPasswordStrength(formData.password) : null;

  const validateField = (field: keyof RegisterFormData, value: string) => {
    try {
      if (field === "email") {
        emailSchema.parse(value);
      } else if (field === "password") {
        passwordSchema.parse(value);
      } else if (field === "passwordConfirm") {
        // First validate that it's not empty
        if (!value) {
          throw new Error("Powtórzenie hasła jest wymagane");
        }
        // Then check if it matches password
        if (value !== formData.password) {
          throw new Error("Hasła muszą być identyczne");
        }
      }
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    } catch (error: unknown) {
      const message =
        (error as { errors?: { message: string }[] }).errors?.[0]?.message ||
        (error as Error).message ||
        "Nieprawidłowa wartość";
      setErrors((prev) => ({ ...prev, [field]: message }));
    }
  };

  const handleChange = (field: keyof RegisterFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    // If password changes, clear passwordConfirm error (it will be re-validated on blur)
    if (field === "password" && errors.passwordConfirm) {
      setErrors((prev) => ({ ...prev, passwordConfirm: undefined }));
    }
  };

  const handleBlur = (field: keyof RegisterFormData) => {
    validateField(field, formData[field]);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const result = registerSchema.safeParse(formData);
      if (!result.success) {
        const fieldErrors: Partial<Record<keyof RegisterFormData, string>> = {};
        result.error.errors.forEach((err) => {
          const field = err.path[0] as keyof RegisterFormData;
          fieldErrors[field] = err.message;
        });
        setErrors(fieldErrors);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: formData.email, password: formData.password }),
        });

        const data = (await res.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
          requiresConfirmation?: boolean;
          email?: string;
        };

        if (!res.ok) {
          const message = data?.error || "Nie udało się utworzyć konta";
          toast.error("Błąd rejestracji", { description: message });
          // Clear password on error (like LoginForm does)
          setFormData((prev) => ({ ...prev, password: "", passwordConfirm: "" }));
          setIsLoading(false);
          return;
        }

        toast.success("Konto utworzone!", {
          description:
            data?.message ?? "Sprawdź swoją skrzynkę e-mail. Wysłaliśmy link aktywacyjny do potwierdzenia konta.",
        });
        setResendEmail(data?.email || formData.email);
        setSuccess(true);
      } catch {
        toast.error("Błąd rejestracji", { description: "Wystąpił błąd. Spróbuj ponownie." });
        // Clear password on error
        setFormData((prev) => ({ ...prev, password: "", passwordConfirm: "" }));
      } finally {
        setIsLoading(false);
      }
    },
    [formData]
  );

  // Success state
  if (success) {
    return (
      <div className="text-center space-y-6 animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-full">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Sprawdź swoją skrzynkę!</h3>
          <p className="text-sm text-muted-foreground">
            Wysłaliśmy link aktywacyjny na adres <strong>{formData.email}</strong>.
            <br />
            Kliknij w link, aby aktywować konto i rozpocząć naukę.
          </p>
        </div>
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-4">Nie otrzymałeś wiadomości?</p>
          <Button
            variant="ghost"
            onClick={async () => {
              const emailToResend = resendEmail || formData.email;
              if (!emailToResend) return;

              setIsResending(true);
              try {
                const res = await fetch("/api/auth/resend-confirmation", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: emailToResend }),
                });

                const data = (await res.json().catch(() => ({}))) as {
                  message?: string;
                  error?: string;
                };

                if (!res.ok) {
                  toast.error("Błąd", {
                    description: data?.error || "Nie udało się wysłać emaila ponownie.",
                  });
                  return;
                }

                toast.success("Email wysłany!", {
                  description: data?.message || "Link aktywacyjny został ponownie wysłany.",
                });
                setResendEmail(emailToResend);
              } catch {
                toast.error("Błąd", { description: "Wystąpił błąd. Spróbuj ponownie." });
              } finally {
                setIsResending(false);
              }
            }}
            disabled={isResending}
          >
            {isResending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Wysyłanie...
              </>
            ) : (
              "Wyślij ponownie"
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Adres e-mail</Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="w-5 h-5 text-muted-foreground" />
          </div>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            onBlur={() => handleBlur("email")}
            className="pl-10"
            placeholder="twoj@email.pl"
            disabled={isLoading}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
        </div>
        {errors.email && (
          <p id="email-error" className="text-sm text-destructive flex items-center gap-1 animate-fade-in">
            <AlertCircle className="w-4 h-4" />
            {errors.email}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="password">Hasło</Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={(e) => handleChange("password", e.target.value)}
            onBlur={() => handleBlur("password")}
            className="pl-10"
            placeholder="Min. 8 znaków"
            disabled={isLoading}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
          />
        </div>

        {/* Password strength indicator */}
        {formData.password && !errors.password && (
          <div className="space-y-1 animate-fade-in">
            <div className="flex gap-1">
              <div
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  passwordStrength === "weak"
                    ? "bg-red-500"
                    : passwordStrength === "medium"
                      ? "bg-yellow-500"
                      : "bg-green-500"
                }`}
              />
              <div
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  passwordStrength === "medium" || passwordStrength === "strong"
                    ? passwordStrength === "medium"
                      ? "bg-yellow-500"
                      : "bg-green-500"
                    : "bg-muted"
                }`}
              />
              <div
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  passwordStrength === "strong" ? "bg-green-500" : "bg-muted"
                }`}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Siła hasła:{" "}
              <span
                className={
                  passwordStrength === "weak"
                    ? "text-red-500"
                    : passwordStrength === "medium"
                      ? "text-yellow-500"
                      : "text-green-500"
                }
              >
                {passwordStrength === "weak" ? "Słabe" : passwordStrength === "medium" ? "Średnie" : "Silne"}
              </span>
            </p>
          </div>
        )}

        {errors.password && (
          <p id="password-error" className="text-sm text-destructive flex items-center gap-1 animate-fade-in">
            <AlertCircle className="w-4 h-4" />
            {errors.password}
          </p>
        )}
      </div>

      {/* Password confirmation */}
      <div className="space-y-2">
        <Label htmlFor="passwordConfirm">Powtórz hasło</Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>
          <Input
            id="passwordConfirm"
            name="passwordConfirm"
            type="password"
            autoComplete="new-password"
            value={formData.passwordConfirm}
            onChange={(e) => handleChange("passwordConfirm", e.target.value)}
            onBlur={() => handleBlur("passwordConfirm")}
            className="pl-10"
            placeholder="Powtórz hasło"
            disabled={isLoading}
            aria-invalid={!!errors.passwordConfirm}
            aria-describedby={errors.passwordConfirm ? "passwordConfirm-error" : undefined}
          />
        </div>
        {errors.passwordConfirm && (
          <p id="passwordConfirm-error" className="text-sm text-destructive flex items-center gap-1 animate-fade-in">
            <AlertCircle className="w-4 h-4" />
            {errors.passwordConfirm}
          </p>
        )}
      </div>

      {/* Submit button */}
      <Button type="submit" disabled={isLoading} className="w-full" size="lg">
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Rejestracja...
          </>
        ) : (
          "Utwórz konto"
        )}
      </Button>

      {/* Login link */}
      <div className="text-center pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Masz już konto?{" "}
          <a href="/auth/login" className="font-medium text-primary hover:text-primary/80 transition-colors">
            Zaloguj się
          </a>
        </p>
      </div>
    </form>
  );
}
