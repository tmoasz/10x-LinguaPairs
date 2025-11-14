import type { SupabaseClient } from "@/db/supabase.client";
import { aiProvider, type LanguageSpec } from "@/lib/services/ai.provider";
import { getTopicLabel } from "@/lib/constants/topics";
import { getErrorMessage } from "@/lib/utils/error.utils";
import type {
  GenerationContentType,
  GenerationRegister,
  GenerateFromTextDTO,
  GenerateFromTopicDTO,
  GenerateExtendDTO,
  QuotaDTO,
  GeneratedPairDTO,
  TopicID,
} from "@/types";

const DAILY_LIMIT = 3;
const BASE_GENERATION_COUNT = 50;
const EXTEND_GENERATION_COUNT = 10;

interface GenerationRow {
  id: string;
  user_id: string;
  deck_id: string;
  type: string;
  topic_id: string | null;
  input_text: string | null;
  content_type: string;
  register: string;
  pairs_requested: number;
  status: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  base_generation_id: string | null;
}

function startOfTodayIso(): string {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  return start.toISOString();
}

async function getUsedToday(supabase: SupabaseClient, userId: string): Promise<number> {
  const today = startOfTodayIso();
  const { count, error } = await supabase
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "succeeded")
    .gte("created_at", today);

  if (error) {
    console.error("Error counting quota usage:", error);
    throw new Error(`Failed to compute quota: ${error.message}`);
  }

  return count || 0;
}

async function hasActiveForUser(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("generations")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["pending", "running"])
    .limit(1);

  if (error) {
    console.error("Error checking active generation:", error);
    throw new Error(`Failed to check active generation: ${error.message}`);
  }

  return (data?.length || 0) > 0;
}

async function getActiveForDeck(
  supabase: SupabaseClient,
  userId: string,
  deckId: string
): Promise<GenerationRow | null> {
  const { data, error } = await supabase
    .from("generations")
    .select("*")
    .eq("user_id", userId)
    .eq("deck_id", deckId)
    .in("status", ["pending", "running"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching active generation for deck:", error);
    throw new Error(`Failed to fetch active generation: ${error.message}`);
  }

  return data ?? null;
}

export const generationService = {
  DAILY_LIMIT,

  async quota(supabase: SupabaseClient, userId: string): Promise<QuotaDTO> {
    /**
     * Computes user's daily generation quota usage.
     * Business rule: only generations with status='succeeded' count.
     */
    const used_today = await getUsedToday(supabase, userId);
    return {
      daily_limit: DAILY_LIMIT,
      used_today,
      remaining: Math.max(0, DAILY_LIMIT - used_today),
      reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // rough placeholder; client can compute local midnight
    };
  },

  async createFromTopic(
    supabase: SupabaseClient,
    userId: string,
    payload: GenerateFromTopicDTO
  ): Promise<{ generation_id: string; status: "pending" | "running" }> {
    const used = await getUsedToday(supabase, userId);
    if (used >= DAILY_LIMIT) {
      throw new Error("QUOTA_EXCEEDED");
    }

    if (await hasActiveForUser(supabase, userId)) {
      throw new Error("GENERATION_IN_PROGRESS");
    }

    const contentType: GenerationContentType = payload.content_type ?? "auto";
    const register: GenerationRegister = payload.register ?? "neutral";

    const { data, error } = await supabase
      .from("generations")
      .insert({
        user_id: userId,
        deck_id: payload.deck_id,
        type: "topic",
        topic_id: payload.topic_id,
        input_text: null,
        content_type: contentType,
        register,
        pairs_requested: BASE_GENERATION_COUNT,
        status: "pending",
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("Error creating generation (topic):", error);
      throw new Error(error?.message || "Failed to create generation");
    }

    return { generation_id: data.id, status: "pending" };
  },

  async createFromText(
    supabase: SupabaseClient,
    userId: string,
    payload: GenerateFromTextDTO
  ): Promise<{ generation_id: string; status: "pending" | "running" }> {
    const used = await getUsedToday(supabase, userId);
    if (used >= DAILY_LIMIT) {
      throw new Error("QUOTA_EXCEEDED");
    }

    if (await hasActiveForUser(supabase, userId)) {
      throw new Error("GENERATION_IN_PROGRESS");
    }

    const contentType: GenerationContentType = payload.content_type ?? "auto";
    const register: GenerationRegister = payload.register ?? "neutral";

    const { data, error } = await supabase
      .from("generations")
      .insert({
        user_id: userId,
        deck_id: payload.deck_id,
        type: "text",
        topic_id: null,
        input_text: payload.text,
        content_type: contentType,
        register,
        pairs_requested: BASE_GENERATION_COUNT,
        status: "pending",
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("Error creating generation (text):", error);
      throw new Error(error?.message || "Failed to create generation");
    }

    return { generation_id: data.id, status: "pending" };
  },

  async createExtend(
    supabase: SupabaseClient,
    userId: string,
    payload: GenerateExtendDTO
  ): Promise<{ generation_id: string; status: "pending" | "running" }> {
    const used = await getUsedToday(supabase, userId);
    if (used >= DAILY_LIMIT) {
      throw new Error("QUOTA_EXCEEDED");
    }

    if (await hasActiveForUser(supabase, userId)) {
      throw new Error("GENERATION_IN_PROGRESS");
    }

    // Validate base generation ownership and deck relation
    const { data: baseGen, error: baseErr } = await supabase
      .from("generations")
      .select("id, user_id, deck_id, topic_id, input_text")
      .eq("id", payload.base_generation_id)
      .single();

    if (baseErr) {
      if (baseErr.code === "PGRST116") {
        throw new Error("BASE_GENERATION_NOT_FOUND");
      }
      console.error("Error reading base generation:", baseErr);
      throw new Error(`Failed to read base generation: ${baseErr.message}`);
    }

    if (!baseGen || baseGen.user_id !== userId || baseGen.deck_id !== payload.deck_id) {
      // Hide details; treat as not found/forbidden by contract
      throw new Error("BASE_GENERATION_NOT_FOUND");
    }

    const contentType: GenerationContentType = payload.content_type ?? "auto";
    const register: GenerationRegister = payload.register ?? "neutral";

    const { data, error } = await supabase
      .from("generations")
      .insert({
        user_id: userId,
        deck_id: payload.deck_id,
        type: "extend",
        topic_id: null,
        input_text: null,
        content_type: contentType,
        register,
        pairs_requested: EXTEND_GENERATION_COUNT,
        status: "pending",
        base_generation_id: payload.base_generation_id,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("Error creating generation (extend):", error);
      throw new Error(error?.message || "Failed to create generation");
    }

    return { generation_id: data.id, status: "pending" };
  },

  async getActiveForDeck(supabase: SupabaseClient, userId: string, deckId: string): Promise<GenerationRow | null> {
    return await getActiveForDeck(supabase, userId, deckId);
  },

  // Synchronous generation (MVP): create job, run AI, and return pairs
  async runFromTopic(
    supabase: SupabaseClient,
    userId: string,
    payload: GenerateFromTopicDTO
  ): Promise<{
    generation_id: string;
    pairs: GeneratedPairDTO[];
    pairs_generated: number;
    metadata: { generation_time_ms: number; cache_hit: boolean; cost_usd?: number; prompt_hash?: string };
  }> {
    /**
     * Runs a full synchronous generation from topic.
     * 1) Quota + concurrency guard; 2) create job (pending) and set running;
     * 3) call provider; 4) set succeeded on success or failed on error.
     */
    const used = await getUsedToday(supabase, userId);
    if (used >= DAILY_LIMIT) throw new Error("QUOTA_EXCEEDED");
    if (await hasActiveForUser(supabase, userId)) throw new Error("GENERATION_IN_PROGRESS");

    const deck = await ensureDeckOwnedByUser(supabase, userId, payload.deck_id);
    const { langA, langB } = await getDeckLanguages(supabase, deck);
    const banlist = await fetchPairTermsByIds(supabase, payload.exclude_pairs ?? []);

    const contentType: GenerationContentType = payload.content_type ?? "auto";
    const register: GenerationRegister = payload.register ?? "neutral";

    const { data: created, error: insertErr } = await supabase
      .from("generations")
      .insert({
        user_id: userId,
        deck_id: payload.deck_id,
        type: "topic",
        topic_id: payload.topic_id,
        input_text: null,
        content_type: contentType,
        register,
        pairs_requested: BASE_GENERATION_COUNT,
        status: "pending",
      })
      .select("*")
      .single();

    if (insertErr || !created) {
      if (insertErr?.code === "23505") throw new Error("GENERATION_IN_PROGRESS");
      console.error("Error creating generation (topic, sync):", insertErr);
      throw new Error(insertErr?.message || "Failed to create generation");
    }

    const genId = created.id;
    const startedAt = new Date().toISOString();
    await supabase.from("generations").update({ status: "running", started_at: startedAt }).eq("id", genId);

    try {
      const providerRes = await aiProvider.generateFromTopic({
        topic_id: payload.topic_id,
        topic_label: getTopicLabel(payload.topic_id),
        content_type: contentType,
        register,
        count: BASE_GENERATION_COUNT,
        langA,
        langB,
        banlist,
      });

      await supabase
        .from("generations")
        .update({ status: "succeeded", finished_at: new Date().toISOString() })
        .eq("id", genId);

      return {
        generation_id: genId,
        pairs: providerRes.pairs,
        pairs_generated: providerRes.pairs.length,
        metadata: { ...providerRes.metadata },
      };
    } catch (error: unknown) {
      await markFailedAndLog(supabase, created.deck_id, genId, error);
      throw error;
    }
  },

  async runFromText(
    supabase: SupabaseClient,
    userId: string,
    payload: GenerateFromTextDTO
  ): Promise<{
    generation_id: string;
    pairs: GeneratedPairDTO[];
    pairs_generated: number;
    metadata: { generation_time_ms: number; cache_hit: boolean; cost_usd?: number; prompt_hash?: string };
  }> {
    /**
     * Runs a full synchronous generation from free-form text input.
     * Mirrors runFromTopic with input_text stored in generations.
     */
    const used = await getUsedToday(supabase, userId);
    if (used >= DAILY_LIMIT) throw new Error("QUOTA_EXCEEDED");
    if (await hasActiveForUser(supabase, userId)) throw new Error("GENERATION_IN_PROGRESS");

    const deck = await ensureDeckOwnedByUser(supabase, userId, payload.deck_id);
    const { langA, langB } = await getDeckLanguages(supabase, deck);
    const banlist = await fetchPairTermsByIds(supabase, payload.exclude_pairs ?? []);

    const contentType: GenerationContentType = payload.content_type ?? "auto";
    const register: GenerationRegister = payload.register ?? "neutral";

    const { data: created, error: insertErr } = await supabase
      .from("generations")
      .insert({
        user_id: userId,
        deck_id: payload.deck_id,
        type: "text",
        topic_id: null,
        input_text: payload.text,
        content_type: contentType,
        register,
        pairs_requested: BASE_GENERATION_COUNT,
        status: "pending",
      })
      .select("*")
      .single();

    if (insertErr || !created) {
      if (insertErr?.code === "23505") throw new Error("GENERATION_IN_PROGRESS");
      console.error("Error creating generation (text, sync):", insertErr);
      throw new Error(insertErr?.message || "Failed to create generation");
    }

    const genId = created.id;
    await supabase
      .from("generations")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", genId);

    try {
      const providerRes = await aiProvider.generateFromText({
        text: payload.text,
        content_type: contentType,
        register,
        count: BASE_GENERATION_COUNT,
        langA,
        langB,
        banlist,
      });

      await supabase
        .from("generations")
        .update({ status: "succeeded", finished_at: new Date().toISOString() })
        .eq("id", genId);

      return {
        generation_id: genId,
        pairs: providerRes.pairs,
        pairs_generated: providerRes.pairs.length,
        metadata: { ...providerRes.metadata },
      };
    } catch (error: unknown) {
      await markFailedAndLog(supabase, created.deck_id, genId, error);
      throw error;
    }
  },

  async runExtend(
    supabase: SupabaseClient,
    userId: string,
    payload: GenerateExtendDTO
  ): Promise<{
    generation_id: string;
    pairs: GeneratedPairDTO[];
    pairs_generated: number;
    metadata: { generation_time_ms: number; cache_hit: boolean; cost_usd?: number; prompt_hash?: string };
  }> {
    /**
     * Runs a synchronous extension (+10) based on an existing base generation.
     * Verifies ownership and deck alignment before creating the new job.
     */
    const used = await getUsedToday(supabase, userId);
    if (used >= DAILY_LIMIT) throw new Error("QUOTA_EXCEEDED");
    if (await hasActiveForUser(supabase, userId)) throw new Error("GENERATION_IN_PROGRESS");

    // Validate base generation and ownership/relation
    const { data: baseGen, error: baseErr } = await supabase
      .from("generations")
      .select("id, user_id, deck_id, topic_id, input_text")
      .eq("id", payload.base_generation_id)
      .single();

    if (baseErr) {
      if (baseErr.code === "PGRST116") throw new Error("BASE_GENERATION_NOT_FOUND");
      console.error("Error reading base generation:", baseErr);
      throw new Error(`Failed to read base generation: ${baseErr.message}`);
    }

    if (!baseGen || baseGen.user_id !== userId || baseGen.deck_id !== payload.deck_id) {
      throw new Error("BASE_GENERATION_NOT_FOUND");
    }

    const deck = await ensureDeckOwnedByUser(supabase, userId, payload.deck_id);
    const { langA, langB } = await getDeckLanguages(supabase, deck);
    const banlist = await fetchDeckPairTerms(supabase, payload.deck_id);

    const contentType: GenerationContentType = payload.content_type ?? "auto";
    const register: GenerationRegister = payload.register ?? "neutral";

    const { data: created, error: insertErr } = await supabase
      .from("generations")
      .insert({
        user_id: userId,
        deck_id: payload.deck_id,
        type: "extend",
        topic_id: null,
        input_text: null,
        content_type: contentType,
        register,
        pairs_requested: EXTEND_GENERATION_COUNT,
        status: "pending",
        base_generation_id: payload.base_generation_id,
      })
      .select("*")
      .single();

    if (insertErr || !created) {
      if (insertErr?.code === "23505") throw new Error("GENERATION_IN_PROGRESS");
      console.error("Error creating generation (extend, sync):", insertErr);
      throw new Error(insertErr?.message || "Failed to create generation");
    }

    const genId = created.id;
    await supabase
      .from("generations")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", genId);

    try {
      const providerRes = await aiProvider.extend({
        content_type: contentType,
        register,
        count: 10,
        langA,
        langB,
        topic_id: baseGen.topic_id as TopicID | undefined,
        topic_label: baseGen.topic_id ? getTopicLabel(baseGen.topic_id as TopicID) : undefined,
        text: baseGen.input_text ?? undefined,
        banlist,
      });

      await supabase
        .from("generations")
        .update({ status: "succeeded", finished_at: new Date().toISOString() })
        .eq("id", genId);

      return {
        generation_id: genId,
        pairs: providerRes.pairs,
        pairs_generated: providerRes.pairs.length,
        metadata: { ...providerRes.metadata },
      };
    } catch (error: unknown) {
      await markFailedAndLog(supabase, created.deck_id, genId, error);
      throw error;
    }
  },
};

interface DeckRecord {
  id: string;
  owner_user_id: string;
  lang_a: string;
  lang_b: string;
}

async function ensureDeckOwnedByUser(supabase: SupabaseClient, userId: string, deckId: string): Promise<DeckRecord> {
  /** Ensures the deck exists and is owned by the user; returns deck with languages. */
  const { data, error } = await supabase
    .from("decks")
    .select("id, owner_user_id, lang_a, lang_b")
    .eq("id", deckId)
    .single();

  if (error) {
    if (error.code === "PGRST116") throw new Error("DECK_NOT_FOUND");
    console.error("Error reading deck:", error);
    throw new Error(`Failed to read deck: ${error.message}`);
  }

  if (!data) throw new Error("DECK_NOT_FOUND");
  if (data.owner_user_id !== userId) throw new Error("FORBIDDEN");

  return data as DeckRecord;
}

async function getDeckLanguages(
  supabase: SupabaseClient,
  deck: DeckRecord
): Promise<{ langA: LanguageSpec; langB: LanguageSpec }> {
  const ids = [deck.lang_a, deck.lang_b];
  const { data, error } = await supabase.from("languages").select("id, code, name").in("id", ids);

  if (error) {
    console.error("Error fetching languages:", error);
    throw new Error(`Failed to read deck languages: ${error.message}`);
  }

  const map = new Map((data || []).map((lang) => [lang.id, lang]));
  const langA = map.get(deck.lang_a);
  const langB = map.get(deck.lang_b);

  if (!langA || !langB) {
    throw new Error("DECK_LANGUAGES_NOT_FOUND");
  }

  const normalizeSpec = (lang: { code: string; name: string }): LanguageSpec => ({
    code: (lang.code || "").toLowerCase(),
    name: lang.name || lang.code,
  });

  return {
    langA: normalizeSpec(langA),
    langB: normalizeSpec(langB),
  };
}

async function fetchPairTermsByIds(supabase: SupabaseClient, ids: string[]): Promise<string[]> {
  if (!ids || ids.length === 0) return [];
  const { data, error } = await supabase.from("pairs").select("term_a, term_b").in("id", ids);

  if (error) {
    console.error("Error fetching pairs for banlist:", error);
    throw new Error(`Failed to fetch excluded pairs: ${error.message}`);
  }

  const terms = (data || [])
    .flatMap((row) => [row.term_a, row.term_b])
    .map((term) => term?.trim())
    .filter((term): term is string => Boolean(term));

  return Array.from(new Set(terms));
}

async function fetchDeckPairTerms(supabase: SupabaseClient, deckId: string, limit = 240): Promise<string[]> {
  const { data, error } = await supabase.from("pairs").select("term_a, term_b").eq("deck_id", deckId).limit(limit);

  if (error) {
    console.error("Error fetching deck pairs for banlist:", error);
    throw new Error(`Failed to fetch deck pairs: ${error.message}`);
  }

  const terms = (data || [])
    .flatMap((row) => [row.term_a, row.term_b])
    .map((term) => term?.trim())
    .filter((term): term is string => Boolean(term));

  return Array.from(new Set(terms));
}

async function markFailedAndLog(supabase: SupabaseClient, deckId: string, generationId: string, error: unknown) {
  /** Marks the generation as failed and appends a row to pair_generation_errors. */
  try {
    await supabase
      .from("generations")
      .update({ status: "failed", finished_at: new Date().toISOString() })
      .eq("id", generationId);
  } catch (e) {
    console.error("Failed to mark generation as failed:", e);
  }

  try {
    const message = getErrorMessage(error) ?? "Unknown error";
    await supabase.from("pair_generation_errors").insert({
      deck_id: deckId,
      provider: "stub",
      model: "stub-ai-v1",
      prompt_sha256: undefined,
      request_params: {},
      error_code: "generation_failed",
      error_message: message,
      error_details: { message },
      http_status: null,
      retryable: false,
      duration_ms: null,
      cost_usd: null,
      cache_hit: null,
    });
  } catch (e) {
    console.error("Failed to log pair generation error:", e);
  }
}
