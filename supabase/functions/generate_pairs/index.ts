import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`${name} env var is required`);
  }
  return value;
}

const supabaseAdmin = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
const OPENROUTER_API_KEY = requireEnv("OPENROUTER_API_KEY");
const BASE_URL = Deno.env.get("OPENROUTER_BASE_URL") ?? "https://openrouter.ai/api/v1";
const PRIMARY_MODEL = Deno.env.get("OPENROUTER_PAIR_MODEL") ?? "openai/gpt-5-mini";
const FALLBACK_MODEL = Deno.env.get("OPENROUTER_PAIR_FALLBACK_MODEL") ?? null;

interface WorkerPayload {
  generation_id: string;
}

interface GenerationRecord {
  id: string;
  deck_id: string;
  topic_id: string | null;
  input_text: string | null;
  content_type: string | null;
  register: string | null;
  pairs_requested: number;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: WorkerPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!payload.generation_id) {
    return new Response(JSON.stringify({ error: "generation_id is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  EdgeRuntime.waitUntil(runGeneration(payload.generation_id));

  return new Response(JSON.stringify({ generation_id: payload.generation_id }), {
    status: 202,
    headers: { "Content-Type": "application/json" },
  });
});

async function runGeneration(generationId: string) {
  const generation = await fetchGeneration(generationId);
  if (!generation) return;

  try {
    await updateGeneration(generationId, { status: "running", started_at: new Date().toISOString() });

    const [banlist, deckDescription] = await Promise.all([
      fetchBanlist(generation.deck_id),
      fetchDeckDescription(generation.deck_id),
    ]);
    const providerRes = await callProviderWithFallback(generation, deckDescription, banlist);

    if (!providerRes.pairs.length) throw new Error("No pairs generated");

    await supabaseAdmin.from("pairs").insert(
      providerRes.pairs.map((pair) => ({
        deck_id: generation.deck_id,
        term_a: pair.term_a,
        term_b: pair.term_b,
        added_at: new Date().toISOString(),
      }))
    );

    await updateGeneration(generationId, {
      status: "succeeded",
      finished_at: new Date().toISOString(),
      pairs_generated: providerRes.pairs.length,
      provider_metadata: providerRes.metadata,
    });
  } catch (error) {
    console.error("Generation failed", generationId, error);
    await updateGeneration(generationId, {
      status: "failed",
      finished_at: new Date().toISOString(),
      error_message: `${error}`,
    });
    await logGenerationError(generationId, error);
  }
}

async function fetchGeneration(id: string): Promise<GenerationRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("generations")
    .select("id, deck_id, topic_id, input_text, content_type, register, pairs_requested")
    .eq("id", id)
    .single();
  if (error) {
    console.error("Failed to load generation", id, error);
    return null;
  }
  return data;
}

async function fetchDeckDescription(deckId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.from("decks").select("description").eq("id", deckId).maybeSingle();
  if (error && error.code !== "PGRST116") {
    console.error("Failed to fetch deck description", deckId, error);
    return null;
  }
  return data?.description ?? null;
}

async function updateGeneration(id: string, patch: Record<string, unknown>) {
  await supabaseAdmin.from("generations").update(patch).eq("id", id);
}

async function logGenerationError(generationId: string, error: unknown) {
  await supabaseAdmin.from("pair_generation_errors").insert({
    generation_id: generationId,
    error_message: `${error}`,
    error_details: { stack: error instanceof Error ? error.stack : String(error) },
  });
}

async function fetchBanlist(deckId: string, limit = 200) {
  const { data, error } = await supabaseAdmin.from("pairs").select("term_a, term_b").eq("deck_id", deckId).limit(limit);
  if (error) {
    console.error("Failed to fetch banlist", error);
    return [];
  }
  const terms = (data ?? [])
    .flatMap((row) => [row.term_a, row.term_b])
    .filter((term): term is string => Boolean(term))
    .map((term) => term.trim().toLowerCase());
  return Array.from(new Set(terms));
}

async function callProviderWithFallback(
  generation: GenerationRecord,
  deckDescription: string | null,
  banlist: string[]
) {
  const payload = buildPayload(generation, deckDescription, banlist, PRIMARY_MODEL);

  try {
    return await callOpenRouter(payload);
  } catch (error) {
    if (!FALLBACK_MODEL || FALLBACK_MODEL === payload.model) {
      throw error;
    }
    console.warn("Primary model failed, retrying with fallback", error);
    return await callOpenRouter(buildPayload(generation, deckDescription, banlist, FALLBACK_MODEL));
  }
}

function buildPayload(
  generation: GenerationRecord,
  deckDescription: string | null,
  banlist: string[],
  model: string | null
) {
  const count = generation.pairs_requested || 50;
  const topic = generation.topic_id ? `Topic: ${generation.topic_id}` : "";
  const context = generation.input_text ? `Context: ${generation.input_text}` : "";
  const avoid = banlist.length ? `Avoid: ${banlist.join(", ")}` : "";
  const deckContext = deckDescription ? `Deck description (use this to match tone and topic): ${deckDescription}` : "";
  const contentType = generation.content_type ?? "auto";
  const register = generation.register ?? "neutral";

  return {
    model: model ?? PRIMARY_MODEL,
    messages: [
      {
        role: "system",
        content: "You are a professional linguist generating bilingual pairs with metadata.",
      },
      {
        role: "user",
        content: [
          `Generate ${count} ${contentType} pairs with ${register} register.`,
          topic,
          context,
          deckContext,
          avoid,
          'Return JSON array: [{"term_a":"","term_b":"","type":"","register":""}]',
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    temperature: 0.4,
    top_p: 0.9,
    max_tokens: 4000,
  };
}

async function callOpenRouter(payload: {
  model: string;
  messages: { role: string; content: string }[];
  temperature: number;
  top_p: number;
  max_tokens: number;
}) {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter HTTP ${response.status}`);
  }

  const completion = await response.json();
  const raw = completion.choices?.[0]?.message?.content ?? "";
  const parsed = parseJsonArray(raw);
  const pairs = parsed
    .filter((pair): pair is { term_a: string; term_b: string } => Boolean(pair.term_a && pair.term_b))
    .map((pair) => ({
      term_a: pair.term_a.trim(),
      term_b: pair.term_b.trim(),
    }));

  return {
    pairs,
    metadata: {
      model: completion.model,
      finish_reason: completion.choices?.[0]?.finish_reason ?? null,
      usage: completion.usage ?? null,
    },
  };
}

function parseJsonArray(raw: string): { term_a?: string; term_b?: string; type?: string; register?: string }[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/```json([\s\S]*?)```/i);
    if (!match) return [];
    try {
      return JSON.parse(match[1]);
    } catch {
      return [];
    }
  }
}
