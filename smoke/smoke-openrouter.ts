import { OpenRouterAIProvider, type LanguageSpec } from "../src/lib/services/ai.provider";
import { OpenRouterService } from "../src/lib/services/openrouter.service";
import { getTopicLabel, TOPIC_DEFINITIONS } from "../src/lib/constants/topics";
import type { GenerationContentType, GenerationRegister, TopicID } from "../src/types";

type CliMap = Record<string, string>;

const LANGUAGE_NAMES: Record<string, string> = {
  pl: "Polish",
  en: "English",
};

const CONTENT_TYPES: GenerationContentType[] = ["auto", "words", "phrases", "mini-phrases"];
const REGISTERS: GenerationRegister[] = ["neutral", "informal", "formal"];

function parseArgs(argv: string[]): CliMap {
  const result: CliMap = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      result[key] = "true";
    } else {
      result[key] = value;
      i++;
    }
  }
  return result;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Please set it before running the smoke test.`);
  }
  return value;
}

function isTopicId(value: string): value is TopicID {
  return value in TOPIC_DEFINITIONS;
}

function isContentType(value?: string): value is GenerationContentType {
  return value !== undefined && CONTENT_TYPES.includes(value as GenerationContentType);
}

function isRegister(value?: string): value is GenerationRegister {
  return value !== undefined && REGISTERS.includes(value as GenerationRegister);
}

function buildLanguageSpec(code: string | undefined, fallbackCode: string, fallbackName: string): LanguageSpec {
  const normalized = (code ?? fallbackCode).toLowerCase();
  return {
    code: normalized,
    name: LANGUAGE_NAMES[normalized] ?? fallbackName,
  };
}

async function main(): Promise<void> {
  const scriptStart = Date.now();
  const args = parseArgs(process.argv.slice(2));
  const apiKey = requireEnv("OPENROUTER_API_KEY");
  const primaryModel = process.env.OPENROUTER_PAIR_MODEL;
  const fallbackModel = process.env.OPENROUTER_PAIR_FALLBACK_MODEL;

  const openRouter = new OpenRouterService({
    apiKey,
    baseUrl: process.env.OPENROUTER_BASE_URL,
    defaultModel: process.env.OPENROUTER_DEFAULT_MODEL,
    timeoutMs: process.env.OPENROUTER_TIMEOUT_MS ? Number(process.env.OPENROUTER_TIMEOUT_MS) : undefined,
    appTitle: process.env.OPENROUTER_APP_TITLE ?? "10x-LinguaPairs (Smoke Test)",
    siteUrl: process.env.OPENROUTER_SITE_URL,
  });

  const provider = new OpenRouterAIProvider({
    openRouter,
    primaryModel,
    fallbackModel,
  });

  const count = Math.min(Math.max(parseInt(args.count ?? "5", 10) || 5, 1), 50);
  const contentType = isContentType(args.contentType) ? args.contentType : "auto";
  const register = isRegister(args.register) ? args.register : "neutral";
  const langA = buildLanguageSpec(args.langA, "pl", "Polish");
  const langB = buildLanguageSpec(args.langB, "en", "English");

  const topicId = args.topic && isTopicId(args.topic) ? args.topic : ("travel" as TopicID);
  const topicLabel = getTopicLabel(topicId);
  const mode = args.text ? "text" : "topic";

  console.info(
    `[${new Date(scriptStart).toISOString()}] Running OpenRouter smoke test (mode=${mode}, content_type=${contentType}, register=${register}, count=${count})`
  );

  const requestStart = Date.now();
  const response = await (mode === "text"
    ? provider.generateFromText({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        text: args.text!,
        content_type: contentType,
        register,
        count,
        langA,
        langB,
      })
    : provider.generateFromTopic({
        topic_id: topicId,
        topic_label: topicLabel,
        content_type: contentType,
        register,
        count,
        langA,
        langB,
      }));
  const requestEnd = Date.now();
  const requestDuration = requestEnd - requestStart;
  const totalDuration = requestEnd - scriptStart;

  const resolvedModel = response.metadata.ai_model ?? "unknown";
  const modelLabel =
    primaryModel && resolvedModel !== primaryModel ? `${resolvedModel} (fallback from ${primaryModel})` : resolvedModel;

  console.info(`Request started at ${new Date(requestStart).toISOString()}`);
  console.info(`Request duration: ${formatDuration(requestDuration)}`);
  console.info(`Total script duration: ${formatDuration(totalDuration)}`);
  console.info(`Model: ${modelLabel}`);
  console.info(`Generated ${response.pairs.length} pairs in ${response.metadata.generation_time_ms}ms`);
  console.info(`Prompt hash: ${response.metadata.prompt_hash}`);

  response.pairs.forEach((pair, idx) => {
    console.log(
      `${String(idx + 1).padStart(2, "0")}. [${pair.type}/${pair.register}] ${pair.term_a} => ${pair.term_b}`
    );
  });
}

main().catch((error) => {
  console.error("Smoke test failed:", error);
  process.exit(1);
});

function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

