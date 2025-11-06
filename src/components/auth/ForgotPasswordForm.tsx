/**
 * ForgotPasswordForm Component
 *
 * Simple form to request password reset email using Shadcn/ui
 * Features: email validation, success state with instructions, Toaster
 */

import { useState } from "react";
import { forgotSchema, type ForgotPasswordFormData } from "@/lib/validation/auth.schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordForm() {
  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ForgotPasswordFormData, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (value: string) => {
    setFormData({ email: value });
    if (errors.email) {
      setErrors({});
    }
  };

  const handleBlur = () => {
    try {
      forgotSchema.parse(formData);
      setErrors({});
    } catch (error: unknown) {
      const message = (error as { errors?: { message: string }[] }).errors?.[0]?.message || "Nieprawidłowa wartość";
      setErrors({ email: message });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = forgotSchema.safeParse(formData);
    if (!result.success) {
      const message = result.error.errors[0]?.message || "Nieprawidłowy adres e-mail";
      setErrors({ email: message });
      return;
    }

    setIsLoading(true);

    // TODO: Implement actual password reset request
    setTimeout(() => {
      setIsLoading(false);
      setSuccess(true);
      toast.success("Link wysłany!", {
        description: "Sprawdź swoją skrzynkę e-mail",
      });
      // console.log("Password reset requested for:", formData.email);
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
          <h3 className="text-xl font-semibold text-foreground mb-2">Sprawdź swoją skrzynkę!</h3>
          <p className="text-sm text-muted-foreground">
            Jeśli konto z adresem <strong>{formData.email}</strong> istnieje,
            <br />
            wysłaliśmy na nie link do resetowania hasła.
          </p>
        </div>
        <div className="pt-4 space-y-3">
          <p className="text-xs text-muted-foreground">Link jest ważny przez 1 godzinę.</p>
          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setSuccess(false);
                setFormData({ email: "" });
              }}
            >
              Wyślij ponownie
            </Button>
            <a
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Powrót do logowania
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Info message */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          Podaj adres e-mail przypisany do Twojego konta. Wyślemy Ci link do utworzenia nowego hasła.
        </p>
      </div>

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
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
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

      {/* Submit button */}
      <Button type="submit" disabled={isLoading} className="w-full" size="lg">
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Wysyłanie...
          </>
        ) : (
          "Wyślij link resetujący"
        )}
      </Button>

      {/* Back to login */}
      <div className="text-center pt-4 border-t border-border">
        <a
          href="/auth/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Powrót do logowania
        </a>
      </div>
    </form>
  );
}
