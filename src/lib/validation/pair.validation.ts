import { z } from "zod";

export const flagPairSchema = z.object({
  reason: z
    .string({ required_error: "Reason is required" })
    .trim()
    .min(3, "Reason must be at least 3 characters long")
    .max(500, "Reason must be at most 500 characters"),
});

export type FlagPairSchema = typeof flagPairSchema;
export type FlagPairInput = z.infer<typeof flagPairSchema>;
