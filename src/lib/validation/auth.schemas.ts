/**
 * Zod validation schemas for authentication forms
 */

import { z } from "zod";

/**
 * Email validation schema
 */
export const emailSchema = z.string().min(1, "Adres e-mail jest wymagany").email("Podaj poprawny adres e-mail");

/**
 * Password validation schema
 * Requirements: min 8 characters, at least 1 letter and 1 digit
 */
export const passwordSchema = z
  .string()
  .min(8, "Hasło musi mieć co najmniej 8 znaków")
  .regex(/[a-zA-Z]/, "Hasło musi zawierać co najmniej jedną literę")
  .regex(/[0-9]/, "Hasło musi zawierać co najmniej jedną cyfrę");

/**
 * Login form schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Hasło jest wymagane"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Register form schema with password confirmation
 */
export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    passwordConfirm: z.string().min(1, "Powtórzenie hasła jest wymagane"),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Hasła muszą być identyczne",
    path: ["passwordConfirm"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Forgot password form schema
 */
export const forgotSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordFormData = z.infer<typeof forgotSchema>;

/**
 * Reset password form schema
 */
export const resetSchema = z
  .object({
    password: passwordSchema,
    passwordConfirm: z.string().min(1, "Powtórzenie hasła jest wymagane"),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Hasła muszą być identyczne",
    path: ["passwordConfirm"],
  });

export type ResetPasswordFormData = z.infer<typeof resetSchema>;

/**
 * Helper function to check password strength
 * Returns: weak, medium, strong
 */
export function getPasswordStrength(password: string): "weak" | "medium" | "strong" {
  if (password.length < 8) return "weak";

  let strength = 0;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  if (strength >= 3) return "strong";
  if (strength >= 2) return "medium";
  return "weak";
}
