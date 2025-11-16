import { z } from "zod";

export const challengeResultSchema = z.object({
  deck_id: z.string().uuid(),
  total_time_ms: z
    .number()
    .int()
    .min(0)
    .max(60 * 60 * 1000), // 1h cap
  correct: z.number().int().min(0).max(50),
  incorrect: z.number().int().min(0).max(50),
  version: z.string().min(1).max(64).optional(),
  round_times_ms: z.array(z.number().int().min(0)).max(10).optional(),
});

export type ChallengeResultSchema = z.infer<typeof challengeResultSchema>;
