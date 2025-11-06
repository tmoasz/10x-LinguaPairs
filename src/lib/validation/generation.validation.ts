import { z } from "zod";

export const generationContentTypeSchema = z.enum(["auto", "words", "phrases", "mini-phrases"]).default("auto");

export const generationRegisterSchema = z.enum(["neutral", "informal", "formal"]).default("neutral");

export const topicIdSchema = z.enum([
  "travel",
  "business",
  "food",
  "technology",
  "health",
  "education",
  "shopping",
  "family",
  "hobbies",
  "sports",
  "nature",
  "culture",
  "emotions",
  "time",
  "weather",
  "transport",
  "communication",
  "home",
  "work",
  "emergency",
]);

export const generateFromTopicSchema = z.object({
  topic_id: topicIdSchema,
  deck_id: z.string().uuid(),
  content_type: generationContentTypeSchema.optional(),
  register: generationRegisterSchema.optional(),
  exclude_pairs: z.array(z.string().uuid()).optional(),
});

export const generateFromTextSchema = z.object({
  text: z.string().min(1).max(5000),
  deck_id: z.string().uuid(),
  content_type: generationContentTypeSchema.optional(),
  register: generationRegisterSchema.optional(),
  exclude_pairs: z.array(z.string().uuid()).optional(),
});

export const deckIdParamSchema = z.object({
  deckId: z.string().uuid(),
});

export const generateExtendSchema = z.object({
  deck_id: z.string().uuid(),
  base_generation_id: z.string().uuid(),
  content_type: generationContentTypeSchema.optional(),
  register: generationRegisterSchema.optional(),
});
