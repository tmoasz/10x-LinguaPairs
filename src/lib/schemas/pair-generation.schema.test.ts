import { describe, it, expect } from "vitest";
import {
  buildPairGenerationJsonSchema,
  type PairGenerationJsonSchema,
} from "@/lib/schemas/pair-generation.schema";

describe("schemas/pair-generation", () => {
  it("builds strict schema with exact item count", () => {
    const count = 50;
    const schema: PairGenerationJsonSchema = buildPairGenerationJsonSchema(count);

    expect(schema.type).toBe("object");
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toContain("pairs");
    expect(schema.properties.pairs.type).toBe("array");
    expect(schema.properties.pairs.minItems).toBe(count);
    expect(schema.properties.pairs.maxItems).toBe(count);

    const item = schema.properties.pairs.items;
    expect(item.type).toBe("object");
    expect(item.additionalProperties).toBe(false);
    expect(item.required).toEqual(["term_a", "term_b", "type", "register"]);

    // Validate enums presence
    expect(item.properties.type.enum).toEqual(["words", "phrases", "mini-phrases"]);
    expect(item.properties.register.enum).toEqual(["neutral", "informal", "formal"]);

    // Validate lengths
    expect(item.properties.term_a.minLength).toBe(1);
    expect(item.properties.term_a.maxLength).toBe(64);
    expect(item.properties.term_b.minLength).toBe(1);
    expect(item.properties.term_b.maxLength).toBe(64);
  });
});
