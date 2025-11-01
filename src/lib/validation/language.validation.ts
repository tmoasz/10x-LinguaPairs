import { z } from "zod";

/**
 * Schema for validating query parameters in GET /api/languages
 * Supports optional sort parameter with default value "sort_order"
 */
export const languagesListQuerySchema = z.object({
  sort: z.string().optional().default("sort_order"),
});

/**
 * Schema for validating path parameter in GET /api/languages/:id
 * Ensures the ID is a valid UUID format
 */
export const languageIdParamSchema = z.object({
  id: z.string().uuid("Invalid language ID format"),
});

