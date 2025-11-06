import crypto from "crypto";
/**
 * Stub AI provider used in MVP.
 *
 * Generates deterministic-like pseudo content quickly in-memory and returns
 * GeneratedPairDTO[] with lightweight metadata. Enforces simple token limits
 * and supports the "auto" content type distribution. Replace with a real
 * provider integration in a later iteration.
 */
import type {
  GeneratedPairDTO,
  GenerationContentType,
  GenerationMetadataDTO,
  GenerationRegister,
  TopicID,
} from "@/types";

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

function randomWord(): string {
  const syllables = ["lo", "ra", "mi", "ta", "ka", "na", "zi", "po", "ve", "tu", "sha", "ri", "do"];
  const count = randInt(1, 3);
  let out = "";
  for (let i = 0; i < count; i++) out += pick(syllables);
  return out;
}

function genPhrase(maxWords: number): string {
  const n = randInt(1, Math.max(1, Math.min(4, maxWords)));
  const words: string[] = [];
  for (let i = 0; i < n; i++) words.push(randomWord());
  return words.join(" ");
}

function tokenCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function makePairs(count: number, type: GenerationContentType, register: GenerationRegister): GeneratedPairDTO[] {
  const pairs: GeneratedPairDTO[] = [];
  for (let i = 0; i < count; i++) {
    // Keep <= 8 tokens per side
    let a = genPhrase(type === "words" ? 1 : type === "mini-phrases" ? 2 : 3);
    let b = genPhrase(type === "words" ? 1 : type === "mini-phrases" ? 2 : 3);
    if (tokenCount(a) > 8) a = a.split(/\s+/).slice(0, 8).join(" ");
    if (tokenCount(b) > 8) b = b.split(/\s+/).slice(0, 8).join(" ");
    pairs.push({
      id: crypto.randomUUID(),
      term_a: a,
      term_b: b,
      type,
      register,
      source: "ai_generated",
      tags: [],
    });
  }
  return pairs;
}

function distributeAuto(total: number): [number, number, number] {
  const words = Math.round(total * 0.6);
  const phrases = Math.round(total * 0.3);
  const minis = Math.max(0, total - words - phrases);
  return [words, phrases, minis];
}

/** Result returned by the AI provider stub. */
export interface ProviderResult {
  pairs: GeneratedPairDTO[];
  metadata: GenerationMetadataDTO & { ai_model?: string };
  prompt_hash: string;
}

export const aiProvider = {
  /**
   * Generates pairs from a predefined topic.
   * Returns exactly `count` items, honoring content_type and register.
   */
  async generateFromTopic(params: {
    topic_id: TopicID;
    content_type: GenerationContentType;
    register: GenerationRegister;
    count: number;
    exclude_pairs?: string[];
  }): Promise<ProviderResult> {
    const start = Date.now();
    const prompt = JSON.stringify({ kind: "topic", ...params });
    const prompt_hash = sha256(prompt);

    let pairs: GeneratedPairDTO[] = [];
    if (params.content_type === "auto") {
      const [w, p, m] = distributeAuto(params.count);
      pairs = [
        ...makePairs(w, "words", params.register),
        ...makePairs(p, "phrases", params.register),
        ...makePairs(m, "mini-phrases", params.register),
      ];
    } else {
      pairs = makePairs(params.count, params.content_type, params.register);
    }

    // Exclude by ID if requested
    const exclude = new Set(params.exclude_pairs ?? []);
    if (exclude.size > 0) {
      pairs = pairs.filter((p) => !exclude.has(p.id));
      // If too many excluded, regenerate to fill up to requested size (best-effort)
      while (pairs.length < params.count) {
        const needed = params.count - pairs.length;
        const extra = makePairs(
          needed,
          params.content_type === "auto" ? "words" : params.content_type,
          params.register
        );
        pairs.push(...extra.filter((p) => !exclude.has(p.id)));
      }
      pairs = pairs.slice(0, params.count);
    }

    const duration = Date.now() - start;
    return {
      pairs,
      metadata: {
        generation_time_ms: duration,
        cache_hit: false,
        cost_usd: 0,
        prompt_hash,
      },
      prompt_hash,
    };
  },

  /**
   * Generates pairs from a free-form text description.
   * Returns exactly `count` items, honoring content_type and register.
   */
  async generateFromText(params: {
    text: string;
    content_type: GenerationContentType;
    register: GenerationRegister;
    count: number;
    exclude_pairs?: string[];
  }): Promise<ProviderResult> {
    // For stub, same behavior as topic; include text in prompt hash
    const start = Date.now();
    const prompt = JSON.stringify({ kind: "text", ...params });
    const prompt_hash = sha256(prompt);

    let pairs: GeneratedPairDTO[] = [];
    if (params.content_type === "auto") {
      const [w, p, m] = distributeAuto(params.count);
      pairs = [
        ...makePairs(w, "words", params.register),
        ...makePairs(p, "phrases", params.register),
        ...makePairs(m, "mini-phrases", params.register),
      ];
    } else {
      pairs = makePairs(params.count, params.content_type, params.register);
    }

    const exclude = new Set(params.exclude_pairs ?? []);
    if (exclude.size > 0) {
      pairs = pairs.filter((p) => !exclude.has(p.id));
      while (pairs.length < params.count) {
        const needed = params.count - pairs.length;
        const extra = makePairs(
          needed,
          params.content_type === "auto" ? "words" : params.content_type,
          params.register
        );
        pairs.push(...extra.filter((p) => !exclude.has(p.id)));
      }
      pairs = pairs.slice(0, params.count);
    }

    const duration = Date.now() - start;
    return {
      pairs,
      metadata: {
        generation_time_ms: duration,
        cache_hit: false,
        cost_usd: 0,
        prompt_hash,
      },
      prompt_hash,
    };
  },

  /**
   * Generates an extension batch (default 10 items).
   * Used to add more pairs to an existing deck generation context.
   */
  async extend(params: {
    content_type: GenerationContentType;
    register: GenerationRegister;
    count: number; // should be 10
  }): Promise<ProviderResult> {
    const start = Date.now();
    const prompt = JSON.stringify({ kind: "extend", ...params });
    const prompt_hash = sha256(prompt);

    let pairs: GeneratedPairDTO[] = [];
    if (params.content_type === "auto") {
      const [w, p, m] = distributeAuto(params.count);
      pairs = [
        ...makePairs(w, "words", params.register),
        ...makePairs(p, "phrases", params.register),
        ...makePairs(m, "mini-phrases", params.register),
      ];
    } else {
      pairs = makePairs(params.count, params.content_type, params.register);
    }

    const duration = Date.now() - start;
    return {
      pairs,
      metadata: {
        generation_time_ms: duration,
        cache_hit: false,
        cost_usd: 0,
        prompt_hash,
      },
      prompt_hash,
    };
  },
};
