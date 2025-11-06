/**
 * LoginForm Component
 *
 * Modern login form with email/password fields using Shadcn/ui components
 * Features: inline validation, loading states, animated errors, Toaster integration
 */

import { useCallback, useState } from "react";
import type React from "react";
import { loginSchema, type LoginFormData } from "@/lib/validation/auth.schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface LoginFormProps {
  redirect?: string;
}

export default function LoginForm(props: LoginFormProps) {
  const { redirect } = props;
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateField = (field: keyof LoginFormData, value: string) => {
    try {
      if (field === "email") {
        loginSchema.shape.email.parse(value);
      } else if (field === "password") {
        loginSchema.shape.password.parse(value);
      }
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    } catch (error: unknown) {
      const message = (error as { errors?: { message: string }[] }).errors?.[0]?.message || "Nieprawidłowa wartość";
      setErrors((prev) => ({ ...prev, [field]: message }));
    }
  };

  const handleChange = (field: keyof LoginFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error on change
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBlur = (field: keyof LoginFormData) => {
    validateField(field, formData[field]);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const result = loginSchema.safeParse(formData);
      if (!result.success) {
        const fieldErrors: Partial<Record<keyof LoginFormData, string>> = {};
        result.error.errors.forEach((err) => {
          const field = err.path[0] as keyof LoginFormData;
          fieldErrors[field] = err.message;
        });
        setErrors(fieldErrors);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: formData.email, password: formData.password }),
        });

        const data = (await res.json().catch(() => ({}))) as {
          user?: { id: string; email: string | null };
          error?: string;
        };

        if (!res.ok) {
          const message = data?.error || "Nie udało się zalogować";
          toast.error("Błąd logowania", { description: message });
          setIsLoading(false);
          // Clear only password on error
          setFormData((prev) => ({ ...prev, password: "" }));
          return;
        }

        toast.success("Zalogowano pomyślnie!");
        // Ensure cookies are set by server, then navigate
        const target = redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
        window.location.assign(target);
      } catch {
        toast.error("Błąd logowania", { description: "Wystąpił błąd. Spróbuj ponownie." });
        setIsLoading(false);
      }
    },
    [formData, redirect]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Email field */}
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
            autoComplete="email"
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

      {/* Password field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Hasło</Label>
          <a href="/auth/forgot" className="text-sm text-primary hover:text-primary/80 transition-colors">
            Nie pamiętasz?
          </a>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={(e) => handleChange("password", e.target.value)}
            onBlur={() => handleBlur("password")}
            className="pl-10"
            placeholder="••••••••"
            disabled={isLoading}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
          />
        </div>
        {errors.password && (
          <p id="password-error" className="text-sm text-destructive flex items-center gap-1 animate-fade-in">
            <AlertCircle className="w-4 h-4" />
            {errors.password}
          </p>
        )}
      </div>

      {/* Submit button */}
      <Button type="submit" disabled={isLoading} className="w-full" size="lg">
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Logowanie...
          </>
        ) : (
          "Zaloguj się"
        )}
      </Button>

      {/* Register link */}
      <div className="text-center pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Nie masz jeszcze konta?{" "}
          <a href="/auth/register" className="font-medium text-primary hover:text-primary/80 transition-colors">
            Zarejestruj się
          </a>
        </p>
      </div>
    </form>
  );
}
