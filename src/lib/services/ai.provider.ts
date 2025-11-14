import crypto from "crypto";

import type {
  GeneratedPairDTO,
  GenerationContentType,
  GenerationMetadataDTO,
  GenerationRegister,
  TopicID,
} from "@/types";
import {
  buildSystemMessage,
  buildTopicUserMessage,
  buildTextUserMessage,
  buildExtendUserMessage,
  getFewShotMessages,
  type LanguageSpec,
} from "@/lib/prompts/generation";
import { buildPairGenerationJsonSchema, type PairGenerationOutput } from "@/lib/schemas/pair-generation.schema";
import { createOpenRouterService, OpenRouterService } from "@/lib/services/openrouter.service";
import type { ChatMessage, ChatRequestOptions } from "@/lib/services/openrouter.types";

const runtimeEnv =
  typeof import.meta !== "undefined" && (import.meta as Record<string, unknown>).env
    ? (import.meta as { env: Record<string, string | undefined> }).env
    : {};

const DEFAULT_PRIMARY_MODEL = runtimeEnv.OPENROUTER_PAIR_MODEL || "openai/gpt-5-mini";
const DEFAULT_FALLBACK_MODEL = runtimeEnv.OPENROUTER_PAIR_FALLBACK_MODEL || "openai/gpt-5";
const INFERENCE_PARAMS = {
  temperature: 0.4,
  top_p: 0.9,
  max_tokens: 12800,
} as const;
const SCHEMA_NAME = "pair_generation";

type OpenRouterLike = Pick<OpenRouterService, "chatJson">;

export interface AiProviderDependencies {
  openRouter: OpenRouterLike;
  primaryModel?: string;
  fallbackModel?: string;
  uuid?: () => string;
  now?: () => number;
}

interface BasePromptParams {
  content_type: GenerationContentType;
  register: GenerationRegister;
  count: number;
  langA: LanguageSpec;
  langB: LanguageSpec;
  banlist?: string[];
}

interface TopicGenerationParams extends BasePromptParams {
  topic_id: TopicID;
  topic_label?: string;
}

interface TextGenerationParams extends BasePromptParams {
  text: string;
}

interface ExtendGenerationParams extends BasePromptParams {
  topic_id?: TopicID;
  topic_label?: string;
  text?: string;
}

export interface ProviderResult {
  pairs: GeneratedPairDTO[];
  metadata: GenerationMetadataDTO & { ai_model?: string };
  prompt_hash: string;
}

export class OpenRouterAIProvider {
  private readonly openRouter: OpenRouterLike;
  private readonly primaryModel: string;
  private readonly fallbackModel: string | null;
  private readonly uuid: () => string;
  private readonly now: () => number;

  constructor(deps: AiProviderDependencies) {
    this.openRouter = deps.openRouter;
    this.primaryModel = deps.primaryModel || DEFAULT_PRIMARY_MODEL;
    this.fallbackModel = deps.fallbackModel ?? DEFAULT_FALLBACK_MODEL;
    this.uuid = deps.uuid || (() => crypto.randomUUID());
    this.now = deps.now || (() => Date.now());
  }

  async generateFromTopic(params: TopicGenerationParams): Promise<ProviderResult> {
    const count = params.count || 50;
    const userMessage = buildTopicUserMessage({
      topicId: params.topic_id,
      topicLabel: params.topic_label ?? params.topic_id,
      contentType: params.content_type,
      register: params.register,
      count,
      langA: params.langA,
      langB: params.langB,
      banlist: params.banlist,
    });

    const promptSeed = {
      kind: "topic",
      topic_id: params.topic_id,
      topic_label: params.topic_label,
      content_type: params.content_type,
      register: params.register,
      count,
      langA: params.langA.code,
      langB: params.langB.code,
      banlist_hash: hashList(params.banlist),
    };

    return this.runGeneration({
      count,
      langA: params.langA,
      langB: params.langB,
      register: params.register,
      userMessage,
      promptSeed,
      banlist: params.banlist,
    });
  }

  async generateFromText(params: TextGenerationParams): Promise<ProviderResult> {
    const count = params.count || 50;
    const userMessage = buildTextUserMessage({
      text: params.text,
      contentType: params.content_type,
      register: params.register,
      count,
      langA: params.langA,
      langB: params.langB,
      banlist: params.banlist,
    });

    const promptSeed = {
      kind: "text",
      text_hash: hashString(params.text),
      content_type: params.content_type,
      register: params.register,
      count,
      langA: params.langA.code,
      langB: params.langB.code,
      banlist_hash: hashList(params.banlist),
    };

    return this.runGeneration({
      count,
      langA: params.langA,
      langB: params.langB,
      register: params.register,
      userMessage,
      promptSeed,
      banlist: params.banlist,
    });
  }

  async extend(params: ExtendGenerationParams): Promise<ProviderResult> {
    const count = params.count || 10;
    const userMessage = buildExtendUserMessage({
      topicId: params.topic_id,
      topicLabel: params.topic_label,
      text: params.text,
      contentType: params.content_type,
      register: params.register,
      count,
      langA: params.langA,
      langB: params.langB,
      banlist: params.banlist,
    });

    const promptSeed = {
      kind: "extend",
      topic_id: params.topic_id,
      topic_label: params.topic_label,
      text_hash: params.text ? hashString(params.text) : undefined,
      content_type: params.content_type,
      register: params.register,
      count,
      langA: params.langA.code,
      langB: params.langB.code,
      banlist_hash: hashList(params.banlist),
    };

    return this.runGeneration({
      count,
      langA: params.langA,
      langB: params.langB,
      register: params.register,
      userMessage,
      promptSeed,
      banlist: params.banlist,
    });
  }

  private async runGeneration(params: {
    count: number;
    langA: LanguageSpec;
    langB: LanguageSpec;
    register: GenerationRegister;
    userMessage: ChatMessage;
    promptSeed: Record<string, unknown>;
    banlist?: string[];
  }): Promise<ProviderResult> {
    const schema = buildPairGenerationJsonSchema(params.count);
    const systemMessage = buildSystemMessage({ langA: params.langA, langB: params.langB, register: params.register });
    const messages = [systemMessage, ...getFewShotMessages(), params.userMessage];
    const metadata = { kind: params.promptSeed.kind };
    const start = this.now();

    const { pairs, model } = await this.invokeWithFallback(messages, schema, metadata);
    const duration = Math.max(0, this.now() - start);

    const sanitized = this.normalizePairs(pairs, params.banlist);
    const prompt_hash = hashRecord(params.promptSeed);

    return {
      pairs: sanitized,
      metadata: {
        generation_time_ms: duration,
        cache_hit: false,
        prompt_hash,
        ai_model: model,
        excluded_count: Math.max(0, pairs.length - sanitized.length),
      },
      prompt_hash,
    };
  }

  private async invokeWithFallback(
    messages: ChatMessage[],
    schema: Record<string, unknown>,
    metadata: Record<string, unknown>
  ): Promise<{ pairs: PairGenerationOutput["pairs"]; model: string }> {
    try {
      const response = await this.callModel(this.primaryModel, messages, schema, metadata);
      return { pairs: response.parsed.pairs, model: this.primaryModel };
    } catch (error) {
      if (this.fallbackModel && this.fallbackModel !== this.primaryModel) {
        const response = await this.callModel(this.fallbackModel, messages, schema, { ...metadata, fallback: true });
        return { pairs: response.parsed.pairs, model: this.fallbackModel };
      }
      throw error;
    }
  }

  private async callModel(
    model: string,
    messages: ChatMessage[],
    schema: Record<string, unknown>,
    metadata: Record<string, unknown>
  ) {
    const options: ChatRequestOptions = {
      model,
      messages,
      params: { ...INFERENCE_PARAMS },
      metadata,
    };

    const response = await this.openRouter.chatJson<PairGenerationOutput>(options, SCHEMA_NAME, schema);

    if (!response.parsed || !Array.isArray(response.parsed.pairs)) {
      throw new Error("PAIR_GENERATION_INVALID_RESPONSE");
    }

    return response;
  }

  private normalizePairs(pairs: PairGenerationOutput["pairs"], banlist?: string[]): GeneratedPairDTO[] {
    const normalized: GeneratedPairDTO[] = [];
    const seen = new Set<string>();
    const banned = new Set((banlist ?? []).map(normalizeTerm).filter(Boolean));

    for (const pair of pairs) {
      if (!pair.term_a || !pair.term_b) continue;

      const termA = enforceTokenLimit(pair.term_a);
      const termB = enforceTokenLimit(pair.term_b);
      if (!termA || !termB) continue;

      const normA = normalizeTerm(termA);
      const normB = normalizeTerm(termB);
      if (!normA || !normB) continue;
      if (banned.has(normA) || banned.has(normB)) continue;

      const key = `${normA}::${normB}`;
      if (seen.has(key)) continue;
      seen.add(key);

      normalized.push({
        id: this.uuid(),
        term_a: termA,
        term_b: termB,
        type: pair.type,
        register: pair.register,
        source: "ai_generated",
      });
    }

    return normalized;
  }
}

function hashRecord(data: Record<string, unknown>): string {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

function hashString(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hashList(items?: string[]): string | undefined {
  if (!items || items.length === 0) return undefined;
  const normalized = items.map(normalizeTerm).filter(Boolean).sort();
  if (normalized.length === 0) return undefined;
  return crypto.createHash("sha256").update(normalized.join("|"), "utf8").digest("hex");
}

function enforceTokenLimit(value: string, maxTokens = 8): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const tokens = cleaned.split(" ");
  if (tokens.length <= maxTokens) return cleaned;
  return tokens.slice(0, maxTokens).join(" ");
}

function normalizeTerm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

let defaultProvider: OpenRouterAIProvider | null = null;

function getDefaultProvider(): OpenRouterAIProvider {
  if (!defaultProvider) {
    defaultProvider = new OpenRouterAIProvider({
      openRouter: createOpenRouterService(),
    });
  }
  return defaultProvider;
}

export const aiProvider = {
  generateFromTopic: (params: Parameters<OpenRouterAIProvider["generateFromTopic"]>[0]) =>
    getDefaultProvider().generateFromTopic(params),
  generateFromText: (params: Parameters<OpenRouterAIProvider["generateFromText"]>[0]) =>
    getDefaultProvider().generateFromText(params),
  extend: (params: Parameters<OpenRouterAIProvider["extend"]>[0]) => getDefaultProvider().extend(params),
};

export type { LanguageSpec } from "@/lib/prompts/generation";
