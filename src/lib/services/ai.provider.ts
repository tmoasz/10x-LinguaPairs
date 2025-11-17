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
import { getConfig } from "@/lib/services/config.service";
import { logger } from "@/lib/utils/logger";

const DEFAULT_PRIMARY_MODEL = "openai/gpt-5-mini";
const DEFAULT_FALLBACK_MODEL = "openai/gpt-5";
const INFERENCE_PARAMS = {
  temperature: 0.4,
  top_p: 0.9,
  max_tokens: 12800,
} as const;
const SCHEMA_NAME = "pair_generation";
const isDev = import.meta.env.DEV;

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
  deckDescription?: string;
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

    if (isDev) {
      logger.debug(
        `[AI_PROVIDER] generateFromTopic: topic=${params.topic_id}, count=${count}, langA=${params.langA.code}, langB=${params.langB.code}, type=${params.content_type}, register=${params.register}`
      );
    }

    const userMessage = buildTopicUserMessage({
      topicId: params.topic_id,
      topicLabel: params.topic_label ?? params.topic_id,
      contentType: params.content_type,
      register: params.register,
      count,
      langA: params.langA,
      langB: params.langB,
      banlist: params.banlist,
      deckDescription: params.deckDescription,
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
      deck_description_hash: params.deckDescription ? hashString(params.deckDescription) : undefined,
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

    if (isDev) {
      const textPreview = params.text.length > 50 ? params.text.substring(0, 50) + "..." : params.text;
      logger.debug(
        `[AI_PROVIDER] generateFromText: text="${textPreview}", count=${count}, langA=${params.langA.code}, langB=${params.langB.code}, type=${params.content_type}, register=${params.register}`
      );
    }

    const userMessage = buildTextUserMessage({
      text: params.text,
      contentType: params.content_type,
      register: params.register,
      count,
      langA: params.langA,
      langB: params.langB,
      banlist: params.banlist,
      deckDescription: params.deckDescription,
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
      deck_description_hash: params.deckDescription ? hashString(params.deckDescription) : undefined,
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

    if (isDev) {
      logger.debug(
        `[AI_PROVIDER] extend: topic=${params.topic_id || "N/A"}, count=${count}, langA=${params.langA.code}, langB=${params.langB.code}, type=${params.content_type}, register=${params.register}, banlist=${params.banlist?.length || 0} items`
      );
    }

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
      deckDescription: params.deckDescription,
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
      deck_description_hash: params.deckDescription ? hashString(params.deckDescription) : undefined,
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
    const schema = buildPairGenerationJsonSchema(params.count) as unknown as Record<string, unknown>;
    const systemMessage = buildSystemMessage({ langA: params.langA, langB: params.langB, register: params.register });
    const messages = [systemMessage, ...getFewShotMessages(), params.userMessage];
    const metadata = { kind: params.promptSeed.kind };
    const start = this.now();

    if (isDev) {
      logger.debug(
        `[AI_PROVIDER] runGeneration: requesting ${params.count} pairs, banlist=${params.banlist?.length || 0} items, using model=${this.primaryModel}${this.fallbackModel ? ` (fallback: ${this.fallbackModel})` : ""}`
      );
    }

    const { pairs, model } = await this.invokeWithFallback(messages, schema, metadata);
    const duration = Math.max(0, this.now() - start);

    if (isDev) {
      logger.debug(`[AI_PROVIDER] AI response received: ${pairs.length} raw pairs from model=${model} (${duration}ms)`);
    }

    const sanitized = this.normalizePairs(pairs, params.banlist);
    const prompt_hash = hashRecord(params.promptSeed);

    if (isDev) {
      logger.debug(
        `[AI_PROVIDER] Normalization: ${pairs.length} raw → ${sanitized.length} valid pairs (excluded: ${pairs.length - sanitized.length})`
      );
      logger.debug(`[AI_PROVIDER] Generation complete: ${sanitized.length} pairs in ${duration}ms, model=${model}`);
    }

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
      if (isDev) {
        logger.debug(`[AI_PROVIDER] Invoking primary model: ${this.primaryModel}`);
      }
      const response = await this.callModel(this.primaryModel, messages, schema, metadata);
      return { pairs: response.parsed.pairs, model: this.primaryModel };
    } catch (error) {
      if (this.fallbackModel && this.fallbackModel !== this.primaryModel) {
        if (isDev) {
          logger.warn(`[AI_PROVIDER] Primary model failed, using fallback: ${this.fallbackModel}`, error);
        }
        const response = await this.callModel(this.fallbackModel, messages, schema, { ...metadata, fallback: true });
        return { pairs: response.parsed.pairs, model: this.fallbackModel };
      }
      if (isDev) {
        logger.error(`[AI_PROVIDER] Generation failed (no fallback available):`, error);
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

    if (isDev) {
      logger.debug(
        `[AI_PROVIDER] Calling OpenRouter: model=${model}, messages=${messages.length}, params=${JSON.stringify(INFERENCE_PARAMS)}`
      );
    }

    const callStart = this.now();
    const response = await this.openRouter.chatJson<PairGenerationOutput>(options, SCHEMA_NAME, schema);
    const callDuration = this.now() - callStart;

    if (isDev) {
      logger.debug(
        `[AI_PROVIDER] OpenRouter response: ${callDuration}ms, parsed=${!!response.parsed}, pairs=${response.parsed?.pairs?.length || 0}`
      );
    }

    if (!response.parsed || !Array.isArray(response.parsed.pairs)) {
      if (isDev) {
        logger.error(`[AI_PROVIDER] Invalid response structure:`, {
          parsed: !!response.parsed,
          pairsIsArray: Array.isArray(response.parsed?.pairs),
        });
      }
      throw new Error("PAIR_GENERATION_INVALID_RESPONSE");
    }

    return response;
  }

  private normalizePairs(pairs: PairGenerationOutput["pairs"], banlist?: string[]): GeneratedPairDTO[] {
    const normalized: GeneratedPairDTO[] = [];
    const seen = new Set<string>();
    const banned = new Set((banlist ?? []).map(normalizeTerm).filter(Boolean));

    if (isDev && banlist && banlist.length > 0) {
      logger.debug(`[AI_PROVIDER] Normalizing with banlist: ${banned.size} banned terms`);
    }

    let skippedEmpty = 0;
    let skippedTokenLimit = 0;
    let skippedBanned = 0;
    let skippedDuplicate = 0;

    for (const pair of pairs) {
      if (!pair.term_a || !pair.term_b) {
        skippedEmpty++;
        continue;
      }

      const termA = enforceTokenLimit(pair.term_a);
      const termB = enforceTokenLimit(pair.term_b);
      if (!termA || !termB) {
        skippedTokenLimit++;
        continue;
      }

      const normA = normalizeTerm(termA);
      const normB = normalizeTerm(termB);
      if (!normA || !normB) {
        skippedTokenLimit++;
        continue;
      }
      if (banned.has(normA) || banned.has(normB)) {
        skippedBanned++;
        continue;
      }

      const key = `${normA}::${normB}`;
      if (seen.has(key)) {
        skippedDuplicate++;
        continue;
      }
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

    if (isDev && (skippedEmpty > 0 || skippedTokenLimit > 0 || skippedBanned > 0 || skippedDuplicate > 0)) {
      logger.debug(
        `[AI_PROVIDER] Normalization stats: empty=${skippedEmpty}, tokenLimit=${skippedTokenLimit}, banned=${skippedBanned}, duplicate=${skippedDuplicate}`
      );
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

/**
 * Creates an AI provider instance with configuration from database.
 *
 * @returns Configured OpenRouterAIProvider instance
 */
export async function createAiProvider(): Promise<OpenRouterAIProvider> {
  const openRouter = await createOpenRouterService();

  // Read model config from database with env fallback
  const primaryModel = (await getConfig("OPENROUTER_PAIR_MODEL")) || DEFAULT_PRIMARY_MODEL;
  const fallbackModel = (await getConfig("OPENROUTER_PAIR_FALLBACK_MODEL")) || DEFAULT_FALLBACK_MODEL;

  return new OpenRouterAIProvider({
    openRouter,
    primaryModel,
    fallbackModel,
  });
}

/**
 * AI Provider interface for generation operations.
 * This is a factory function that creates a provider instance per request.
 */
export const aiProvider = {
  generateFromTopic: async (params: Parameters<OpenRouterAIProvider["generateFromTopic"]>[0]) => {
    const provider = await createAiProvider();
    return provider.generateFromTopic(params);
  },
  generateFromText: async (params: Parameters<OpenRouterAIProvider["generateFromText"]>[0]) => {
    const provider = await createAiProvider();
    return provider.generateFromText(params);
  },
  extend: async (params: Parameters<OpenRouterAIProvider["extend"]>[0]) => {
    const provider = await createAiProvider();
    return provider.extend(params);
  },
};

export type { LanguageSpec } from "@/lib/prompts/generation";
