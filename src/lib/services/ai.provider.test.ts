import type { ChatJsonResponse, ChatRequestOptions, ChatResponse } from "@/lib/services/openrouter.types";
import { OpenRouterAIProvider } from "@/lib/services/ai.provider";
import type { PairGenerationJsonSchema, PairGenerationOutput } from "@/lib/schemas/pair-generation.schema";
import type { GenerationContentType, GenerationRegister, TopicID } from "@/types";
import type { LanguageSpec } from "@/lib/prompts/generation";

type ChatJson = ChatJsonResponse<PairGenerationOutput>;

const langA: LanguageSpec = { code: "pl", name: "Polish" };
const langB: LanguageSpec = { code: "en", name: "English" };

function createMockChatResponse(overrides?: Partial<ChatResponse>): ChatResponse {
  return {
    id: "mock",
    model: "mock",
    content: "",
    finishReason: "stop",
    raw: {
      id: "mock",
      model: "mock",
      choices: [
        {
          message: { content: "" },
          finish_reason: "stop",
        },
      ],
    },
    ...overrides,
  };
}

function createProvider(overrides?: { response?: ChatJson; nowSequence?: number[]; uuidSequence?: string[] }) {
  const response: ChatJson =
    overrides?.response ||
    ({
      parsed: {
        pairs: [
          { term_a: "dzień dobry", term_b: "good morning", type: "words", register: "neutral" },
          { term_a: "do widzenia", term_b: "goodbye", type: "words", register: "neutral" },
        ],
      },
      raw: createMockChatResponse(),
    } satisfies ChatJson);

  const chatJson = vi
    .fn<[ChatRequestOptions, string, PairGenerationJsonSchema], Promise<ChatJson>>()
    .mockResolvedValue(response);

  let uuidCalls = 0;
  const uuidSequence = overrides?.uuidSequence ?? ["uuid-1", "uuid-2", "uuid-3"];
  const uuid = () => uuidSequence[uuidCalls++] || "uuid-fallback";

  let nowCalls = 0;
  const nowSeq = overrides?.nowSequence ?? [1_000, 1_010];
  const now = () => nowSeq[Math.min(nowCalls++, nowSeq.length - 1)];

  const provider = new OpenRouterAIProvider({
    openRouter: { chatJson },
    uuid,
    now,
  });

  return { provider, chatJson };
}

function buildTopicParams(
  partial?: Partial<{ contentType: GenerationContentType; register: GenerationRegister; count: number }>
) {
  return {
    topic_id: "travel" as TopicID,
    topic_label: "Podróże i Turystyka",
    content_type: partial?.contentType ?? "auto",
    register: partial?.register ?? "neutral",
    count: partial?.count ?? 30,
    langA,
    langB,
    banlist: ["  ala   ma   kota  ", "Ala ma kota", "jabłko"],
  };
}

function buildTextParams() {
  return {
    text: "A".repeat(800),
    content_type: "phrases" as GenerationContentType,
    register: "formal" as GenerationRegister,
    count: 30,
    langA,
    langB,
    banlist: ["zupa"],
  };
}

describe("OpenRouterAIProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generateFromTopic builds OpenRouter payload and normalizes pairs", async () => {
    const longTerm = "to jest bardzo długie wyrażenie które trzeba skrócić"; // 10 words
    const response: ChatJson = {
      parsed: {
        pairs: [
          { term_a: longTerm, term_b: longTerm, type: "words", register: "neutral" },
          { term_a: "krótkie", term_b: "short", type: "words", register: "neutral" },
        ],
      },
      raw: createMockChatResponse(),
    };
    const { provider, chatJson } = createProvider({
      response,
      nowSequence: [1000, 1025],
      uuidSequence: ["id-1", "id-2"],
    });

    const result = await provider.generateFromTopic(buildTopicParams({ count: 2 }));

    expect(chatJson).toHaveBeenCalledTimes(1);
    const [options, schemaName, schema] = chatJson.mock.calls[0] as [
      ChatRequestOptions,
      string,
      PairGenerationJsonSchema,
    ];
    expect(schemaName).toBe("pair_generation");
    expect(schema).toHaveProperty(["properties", "pairs", "minItems"], 2);
    expect(schema.properties.pairs.maxItems).toBe(2);

    expect(options.model).toBeDefined();
    expect(options.messages[0].role).toBe("system");
    expect(options.messages.some((m) => m.role === "assistant")).toBe(true);
    const userMsg = options.messages.find((m) => m.role === "user");
    expect(userMsg?.content).toContain("Topic: travel — Podróże i Turystyka");
    expect(userMsg?.content).toContain("Avoid: ala ma kota, jabłko");

    expect(result.pairs).toHaveLength(2);
    expect(result.pairs[0]).toMatchObject({
      id: "id-1",
      source: "ai_generated",
      type: "words",
      register: "neutral",
    });
    expect(result.pairs[0].term_a.split(/\s+/)).toHaveLength(8);
    expect(result.metadata.generation_time_ms).toBe(25);
    expect(result.metadata.cache_hit).toBe(false);
    expect(result.metadata.prompt_hash).toMatch(/^([a-f0-9]{8,})$/i);
  });

  it("generateFromText clips context, keeps banlist, and returns pairs", async () => {
    const { provider, chatJson } = createProvider();
    const result = await provider.generateFromText(buildTextParams());

    expect(chatJson).toHaveBeenCalledTimes(1);
    const [options] = chatJson.mock.calls[0] as [ChatRequestOptions];
    const userMsg = options.messages.find((m) => m.role === "user");
    expect(userMsg?.content).toContain("Context: AAAA"); // starts with context
    expect(userMsg?.content).toContain("…\ncontent_type=phrases, register=formal, count=30");
    expect(userMsg?.content).toContain("Avoid: zupa");

    expect(result.pairs).toHaveLength(2);
    expect(result.pairs[0].source).toBe("ai_generated");
  });

  it("extend uses extension note and banlist even without topic label", async () => {
    const { provider, chatJson } = createProvider();
    await provider.extend({
      count: 10,
      content_type: "auto",
      register: "neutral",
      langA,
      langB,
      text: "Manual context",
      banlist: ["istniejąca para"],
    });

    const [options] = chatJson.mock.calls[0] as [ChatRequestOptions];
    const userMsg = options.messages.find((m) => m.role === "user");
    expect(userMsg?.content).toContain("Extension: +10 new unique pairs");
    expect(userMsg?.content).toContain("Avoid: istniejąca para");
    expect(userMsg?.content).toContain("Context: Manual context");
  });
});
