import { z } from "zod";

/**
 * Maximum content length for a single message (characters).
 */
const MAX_MESSAGE_CONTENT_LENGTH = 100_000;

/**
 * Maximum number of messages in a chat request.
 */
const MAX_MESSAGES_COUNT = 100;

/**
 * Valid chat message role.
 */
export const chatMessageRoleSchema = z.enum(["system", "user", "assistant"]);

/**
 * Chat message schema.
 */
export const chatMessageSchema = z.object({
  role: chatMessageRoleSchema,
  content: z
    .string()
    .min(1, "Message content cannot be empty")
    .max(MAX_MESSAGE_CONTENT_LENGTH, `Message content must not exceed ${MAX_MESSAGE_CONTENT_LENGTH} characters`),
});

/**
 * List of chat messages schema with business rules:
 * - At least one message required
 * - At least one message must have role "user"
 * - At most one message can have role "system"
 * - Maximum count limit
 */
export const chatMessagesSchema = z
  .array(chatMessageSchema)
  .min(1, "At least one message is required")
  .max(MAX_MESSAGES_COUNT, `Maximum ${MAX_MESSAGES_COUNT} messages allowed`)
  .refine((messages) => messages.some((m) => m.role === "user"), {
    message: "At least one message must have role 'user'",
  })
  .refine((messages) => messages.filter((m) => m.role === "system").length <= 1, {
    message: "At most one message can have role 'system'",
  });

/**
 * Model name schema (basic validation - non-empty string).
 * Model name validation against allowlist is handled at service level if needed.
 */
export const modelNameSchema = z
  .string()
  .min(1, "Model name cannot be empty")
  .max(200, "Model name must not exceed 200 characters");

/**
 * Model parameters schema with safe ranges.
 */
export const modelParamsSchema = z
  .object({
    temperature: z.number().min(0).max(2).optional(),
    top_p: z.number().min(0).max(1).optional(),
    max_tokens: z.number().int().min(1).max(1_000_000).optional(),
    presence_penalty: z.number().min(-2).max(2).optional(),
    frequency_penalty: z.number().min(-2).max(2).optional(),
    stop: z.union([z.string(), z.array(z.string())]).optional(),
    seed: z.number().int().optional(),
  })
  .strict();

/**
 * JSON Schema specification schema.
 */
export const jsonSchemaSpecSchema = z
  .object({
    type: z.literal("json_schema"),
    json_schema: z
      .object({
        name: z.string().min(1).max(100),
        strict: z.literal(true),
        schema: z.record(z.unknown()),
      })
      .strict(),
  })
  .strict();

/**
 * Chat request options schema.
 */
export const chatRequestOptionsSchema = z
  .object({
    messages: chatMessagesSchema,
    model: modelNameSchema.optional(),
    params: modelParamsSchema.optional(),
    responseFormat: jsonSchemaSpecSchema.optional(),
    metadata: z.record(z.unknown()).optional(),
    signal: z.custom<AbortSignal>().optional(),
  })
  .strict();
