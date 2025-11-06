/**
 * ResetPasswordForm Component
 *
 * Form to set a new password after clicking reset link using Shadcn/ui
 * Features: password strength indicator, confirmation validation, Toaster
 */

import { useState } from "react";
import { resetSchema, type ResetPasswordFormData, getPasswordStrength } from "@/lib/validation/auth.schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ResetPasswordForm() {
  const [formData, setFormData] = useState<ResetPasswordFormData>({
    password: "",
    passwordConfirm: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ResetPasswordFormData, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordStrength = formData.password ? getPasswordStrength(formData.password) : null;

  const validateField = (field: keyof ResetPasswordFormData, value: string) => {
    try {
      if (field === "passwordConfirm") {
        if (value !== formData.password) {
          throw new Error("Hasła muszą być identyczne");
        }
      } else {
        // Validate the whole form to check the field
        resetSchema.parse({ ...formData, [field]: value });
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

  const handleChange = (field: keyof ResetPasswordFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBlur = (field: keyof ResetPasswordFormData) => {
    validateField(field, formData[field]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = resetSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ResetPasswordFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof ResetPasswordFormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    // TODO: Implement actual password reset completion
    setTimeout(() => {
      setIsLoading(false);
      setSuccess(true);
      toast.success("Hasło zmienione!", {
        description: "Możesz teraz się zalogować",
      });
      // console.log("Password reset completed");
    }, 1500);
  };

  // Success state
  if (success) {
    return (
      <div className="text-center space-y-6 animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-full">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Hasło zostało zmienione!</h3>
          <p className="text-sm text-muted-foreground">Możesz teraz zalogować się używając nowego hasła.</p>
        </div>
        <Button asChild size="lg" className="w-full">
          <a href="/auth/login">Przejdź do logowania</a>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Info message */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          Wprowadź nowe hasło dla swojego konta. Pamiętaj, aby było silne i bezpieczne.
        </p>
      </div>

      {/* New password */}
      <div className="space-y-2">
        <Label htmlFor="password">Nowe hasło</Label>
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
        <Label htmlFor="passwordConfirm">Powtórz nowe hasło</Label>
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
            Zmiana hasła...
          </>
        ) : (
          "Zmień hasło"
        )}
      </Button>

      {/* Cancel link */}
      <div className="text-center pt-4 border-t border-border">
        <a href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Anuluj
        </a>
      </div>
    </form>
  );
}
