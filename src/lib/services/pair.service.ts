import type { SupabaseClient } from "@/db/supabase.client";
import { logger } from "@/lib/utils/logger";
import type { PairDTO, PairFlagResponseDTO, PairsListDTO } from "@/types";

interface ListParams {
  deckId: string;
  page?: number;
  pageSize?: number;
  userId?: string;
}

interface FlagParams {
  deckId: string;
  pairId: string;
  userId: string;
  reason: string;
}

interface DeleteParams {
  deckId: string;
  pairId: string;
}

export const pairService = {
  async listByDeck(supabase: SupabaseClient, params: ListParams): Promise<PairsListDTO> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, params.pageSize ?? 50));
    const offset = (page - 1) * pageSize;

    const { data, count, error } = await supabase
      .from("pairs")
      .select("id, deck_id, term_a, term_b, added_at, updated_at", { count: "exact" })
      .eq("deck_id", params.deckId)
      .is("deleted_at", null)
      .order("added_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      logger.error("Error fetching pairs:", error);
      throw new Error(`Failed to fetch pairs: ${error.message}`);
    }

    const pairsData = data ?? [];

    let flaggedSet: Set<string> | null = null;
    if (params.userId && pairsData.length > 0) {
      const pairIds = pairsData.map((pair) => pair.id);
      const { data: flagsData, error: flagsError } = await supabase
        .from("pair_flags")
        .select("pair_id")
        .eq("flagged_by", params.userId)
        .in("pair_id", pairIds);

      if (flagsError) {
        logger.error("Error fetching pair flags:", flagsError);
        throw new Error(`Failed to fetch flags: ${flagsError.message}`);
      }
      flaggedSet = new Set((flagsData ?? []).map((row) => row.pair_id));
    }

    const pairs: PairDTO[] = pairsData.map((pair) => ({
      id: pair.id,
      deck_id: pair.deck_id,
      term_a: pair.term_a,
      term_b: pair.term_b,
      added_at: pair.added_at,
      updated_at: pair.updated_at,
      ...(flaggedSet?.has(pair.id) ? { flagged_by_me: true } : {}),
    }));

    const total = count ?? 0;
    const totalPages = total > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;

    return {
      pairs,
      pagination: {
        page,
        page_size: pageSize,
        limit: pageSize,
        total,
        total_pages: totalPages,
      },
    };
  },

  async pairBelongsToDeck(supabase: SupabaseClient, deckId: string, pairId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("pairs")
      .select("id")
      .eq("id", pairId)
      .eq("deck_id", deckId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      logger.error("Error verifying pair ownership:", error);
      throw new Error(`Failed to verify pair: ${error.message}`);
    }

    return Boolean(data);
  },

  async flagPair(supabase: SupabaseClient, params: FlagParams): Promise<PairFlagResponseDTO> {
    const { data, error } = await supabase
      .from("pair_flags")
      .insert({
        deck_id: params.deckId,
        pair_id: params.pairId,
        flagged_by: params.userId,
        reason: params.reason,
      })
      .select("id, pair_id, flagged_by, reason, flagged_at")
      .single();

    if (error || !data) {
      if (error && error.code === "23505") {
        throw new Error("PAIR_ALREADY_FLAGGED");
      }
      logger.error("Error flagging pair:", error);
      throw new Error(error?.message ?? "Failed to flag pair");
    }

    return {
      id: data.id,
      pair_id: data.pair_id,
      flagged_by: data.flagged_by,
      reason: data.reason,
      flagged_at: data.flagged_at,
    };
  },

  async deletePair(supabase: SupabaseClient, params: DeleteParams): Promise<void> {
    const { data, error } = await supabase
      .from("pairs")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", params.pairId)
      .eq("deck_id", params.deckId)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      logger.error("Error deleting pair:", error);
      throw new Error(`Failed to delete pair: ${error.message}`);
    }

    if (!data) {
      throw new Error("PAIR_NOT_FOUND");
    }
  },
};
