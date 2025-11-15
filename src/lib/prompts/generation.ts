// Prompt builders for AI pair generation via OpenRouter
// KISS: small helpers returning typed ChatMessage arrays

import type { GenerationContentType, GenerationRegister, TopicID } from "@/types";
import type { ChatMessage } from "@/lib/services/openrouter.types";

export interface LanguageSpec {
  code: string; // e.g., "pl", "en"
  name: string; // e.g., "Polish", "English"
}

const EXCERPT_MAX_CHARS = 300;
const DECK_DESCRIPTION_MAX_CHARS = 500;
const BANLIST_MAX_ITEMS = 240; // per updated plan

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

function normalizeBanlist(items: string[] | undefined, limit = BANLIST_MAX_ITEMS): string[] {
  if (!items || items.length === 0) return [];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of items) {
    if (!raw) continue;
    const trimmed = raw.trim().replace(/\s+/g, " ");
    if (!trimmed) continue;
    const canonical = trimmed.toLowerCase();
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    result.push(trimmed);
    if (result.length >= limit) break;
  }

  return result;
}

/**
 * Builds the system message with core rules and constraints.
 */
export function buildSystemMessage(params: {
  langA: LanguageSpec;
  langB: LanguageSpec;
  register: GenerationRegister;
}): ChatMessage {
  const { langA, langB, register } = params;
  const content = [
    `You are a bilingual lexicographer and teacher. Generate translation pairs ${langA.name} ↔ ${langB.name}.`,
    `Return ONLY JSON matching the provided schema. No prose, no comments.`,
    `Rules: per-side ≤ 8 words; no quotes or numbering; deduplicate meanings (including inflections/synonyms).`,
    `register=${register}; type in {words|phrases|mini-phrases}; for auto use 60/30/10 distribution.`,
    `term_a in ${langA.code}, term_b in ${langB.code}.`,
  ].join("\n");
  return { role: "system", content };
}

/** Few-shot assistant example (kept minimal to guide JSON shape). */
export function getFewShotMessages(): ChatMessage[] {
  const assistantExample = {
    role: "assistant" as const,
    content: JSON.stringify(
      {
        pairs: [
          { term_a: "przykład", term_b: "example", type: "words", register: "neutral" },
          { term_a: "dziękuję bardzo", term_b: "thank you very much", type: "phrases", register: "neutral" },
        ],
      },
      null,
      0
    ),
  };
  return [assistantExample];
}

export function buildTopicUserMessage(params: {
  topicId: TopicID;
  topicLabel: string;
  contentType: GenerationContentType;
  register: GenerationRegister;
  count: number;
  langA: LanguageSpec;
  langB: LanguageSpec;
  banlist?: string[];
  deckDescription?: string;
}): ChatMessage {
  const avoid = normalizeBanlist(params.banlist);
  const lines = [
    `Topic: ${params.topicId} — ${params.topicLabel}`,
    `content_type=${params.contentType}, register=${params.register}, count=${params.count}`,
    `A=${params.langA.code}, B=${params.langB.code}`,
  ];
  if (params.deckDescription) {
    lines.push(
      `Deck description (use this to match tone and topic): ${clip(params.deckDescription, DECK_DESCRIPTION_MAX_CHARS)}`
    );
  }
  if (avoid.length > 0) {
    lines.push(`Avoid: ${avoid.join(", ")}`);
  }
  return { role: "user", content: lines.join("\n") };
}

export function buildTextUserMessage(params: {
  text: string;
  contentType: GenerationContentType;
  register: GenerationRegister;
  count: number;
  langA: LanguageSpec;
  langB: LanguageSpec;
  banlist?: string[];
  deckDescription?: string;
}): ChatMessage {
  const avoid = normalizeBanlist(params.banlist);
  const context = clip(params.text, EXCERPT_MAX_CHARS);
  const lines = [
    `Context: ${context}`,
    `content_type=${params.contentType}, register=${params.register}, count=${params.count}`,
    `A=${params.langA.code}, B=${params.langB.code}`,
  ];
  if (params.deckDescription) {
    lines.push(
      `Deck description (use this to match tone and topic): ${clip(params.deckDescription, DECK_DESCRIPTION_MAX_CHARS)}`
    );
  }
  if (avoid.length > 0) {
    lines.push(`Avoid: ${avoid.join(", ")}`);
  }
  return { role: "user", content: lines.join("\n") };
}

export function buildExtendUserMessage(params: {
  // Provide either topic or text context for clarity
  topicId?: TopicID;
  topicLabel?: string;
  text?: string;
  contentType: GenerationContentType;
  register: GenerationRegister;
  count: number; // typically 10
  langA: LanguageSpec;
  langB: LanguageSpec;
  banlist?: string[];
  deckDescription?: string;
}): ChatMessage {
  const avoid = normalizeBanlist(params.banlist);
  const lines: string[] = [];
  if (params.topicId && params.topicLabel) {
    lines.push(`Topic: ${params.topicId} — ${params.topicLabel}`);
  } else if (params.text) {
    lines.push(`Context: ${clip(params.text, EXCERPT_MAX_CHARS)}`);
  }
  if (params.deckDescription) {
    lines.push(
      `Deck description (use this to match tone and topic): ${clip(params.deckDescription, DECK_DESCRIPTION_MAX_CHARS)}`
    );
  }
  lines.push(
    `content_type=${params.contentType}, register=${params.register}, count=${params.count}`,
    `A=${params.langA.code}, B=${params.langB.code}`,
    `Extension: +${params.count} new unique pairs`
  );
  if (avoid.length > 0) {
    lines.push(`Avoid: ${avoid.join(", ")}`);
  }
  return { role: "user", content: lines.join("\n") };
}
