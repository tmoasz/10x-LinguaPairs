import { z } from "zod";

export const createDeckSchema = z
  .object({
    title: z
      .string({ required_error: "Title is required" })
      .min(1, "Title is required")
      .max(200, "Title must be at most 200 characters"),
    description: z
      .string({ required_error: "Description is required" })
      .min(1, "Description is required")
      .max(1000, "Description must be at most 1000 characters"),
    lang_a: z.string().uuid("Invalid language UUID format"),
    lang_b: z.string().uuid("Invalid language UUID format"),
    visibility: z
      .enum(["private", "public", "unlisted"], {
        invalid_type_error: "Visibility must be private, public, or unlisted",
      })
      .default("private"),
  })
  .refine((data) => data.lang_a !== data.lang_b, {
    message: "Source and target languages must be different",
    path: ["lang_b"],
  });

export type CreateDeckSchema = typeof createDeckSchema;
export type CreateDeckInput = z.infer<typeof createDeckSchema>;

export const updateDeckSchema = z
  .object({
    title: z
      .string({ invalid_type_error: "Title must be a string" })
      .min(1, "Title is required")
      .max(200, "Title must be at most 200 characters")
      .optional(),
    description: z
      .string({ invalid_type_error: "Description must be a string" })
      .min(1, "Description is required")
      .max(1000, "Description must be at most 1000 characters")
      .optional(),
    visibility: z
      .enum(["private", "public", "unlisted"], {
        invalid_type_error: "Visibility must be private, public, or unlisted",
      })
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
    path: ["title"],
  });

export type UpdateDeckSchema = typeof updateDeckSchema;
export type UpdateDeckInput = z.infer<typeof updateDeckSchema>;
