// JSON Schema and TS types for structured pair generation
// KISS: small surface, strict schema, parametric count

import type { GenerationRegister } from "@/types";

export type PairTypeStrict = "words" | "phrases" | "mini-phrases";

export interface PairItemOutput {
  term_a: string;
  term_b: string;
  type: PairTypeStrict;
  register: GenerationRegister;
}

export interface PairGenerationOutput {
  pairs: PairItemOutput[];
}

// Reusable JSON fragments
const pairItemProperties = {
  term_a: { type: "string", minLength: 1, maxLength: 64 },
  term_b: { type: "string", minLength: 1, maxLength: 64 },
  type: { type: "string", enum: ["words", "phrases", "mini-phrases"] },
  register: { type: "string", enum: ["neutral", "informal", "formal"] },
} as const;

const pairItemSchema = {
  type: "object",
  properties: pairItemProperties,
  required: ["term_a", "term_b", "type", "register"],
  additionalProperties: false,
} as const;

export interface PairGenerationJsonSchema {
  type: "object";
  properties: {
    pairs: {
      type: "array";
      items: typeof pairItemSchema;
      minItems: number;
      maxItems: number;
    };
  };
  required: ["pairs"];
  additionalProperties: false;
}

/**
 * Builds strict JSON Schema for OpenRouter response_format.
 * Min/max items set to requested count to enforce exact size.
 */
export function buildPairGenerationJsonSchema(count: number): PairGenerationJsonSchema {
  return {
    type: "object",
    properties: {
      pairs: {
        type: "array",
        items: pairItemSchema,
        minItems: count,
        maxItems: count,
      },
    },
    required: ["pairs"],
    additionalProperties: false,
  } as const;
}
