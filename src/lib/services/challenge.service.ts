import type { SupabaseClient } from "@/db/supabase.client";
import { CHALLENGE_MAX_LEADERBOARD, CHALLENGE_REQUIRED_PAIRS, CHALLENGE_VERSION } from "@/lib/constants/challenge";
import type {
  ChallengeLeaderboardDTO,
  ChallengeLeaderboardEntryDTO,
  ChallengeResultDTO,
  ChallengeResultRequestDTO,
  PairDTO,
} from "@/types";

const DEFAULT_FETCH_FACTOR = 6;

function shufflePairs<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export const challengeService = {
  async pickPairsForDeck(
    supabase: SupabaseClient,
    deckId: string,
    desiredCount = CHALLENGE_REQUIRED_PAIRS
  ): Promise<{ pairs: PairDTO[]; totalAvailable: number }> {
    const fetchLimit = Math.min(desiredCount * DEFAULT_FETCH_FACTOR, 200);
    const { data, count, error } = await supabase
      .from("pairs")
      .select("id, deck_id, term_a, term_b, added_at, updated_at", { count: "exact" })
      .eq("deck_id", deckId)
      .is("deleted_at", null)
      .limit(fetchLimit);

    if (error) {
      console.error("Error fetching pairs for challenge:", error);
      throw new Error(`Failed to fetch challenge pairs: ${error.message}`);
    }

    const totalAvailable = count ?? data?.length ?? 0;
    if (totalAvailable < desiredCount) {
      throw new Error("NOT_ENOUGH_PAIRS");
    }

    const shuffled = shufflePairs(data ?? []);
    return { pairs: shuffled.slice(0, desiredCount), totalAvailable };
  },

  async recordResult(
    supabase: SupabaseClient,
    userId: string,
    payload: ChallengeResultRequestDTO
  ): Promise<ChallengeResultDTO> {
    const { data, error } = await supabase
      .from("challenge_results")
      .insert({
        deck_id: payload.deck_id,
        user_id: userId,
        total_time_ms: payload.total_time_ms,
        correct: payload.correct,
        incorrect: payload.incorrect,
        version: payload.version ?? CHALLENGE_VERSION,
        round_times_ms: payload.round_times_ms ?? null,
      })
      .select("id, deck_id, user_id, total_time_ms, correct, incorrect, version, round_times_ms, created_at")
      .single();

    if (error || !data) {
      console.error("Error inserting challenge result:", error);
      throw new Error(error?.message ?? "Failed to store challenge result");
    }

    return {
      id: data.id,
      deck_id: data.deck_id,
      user_id: data.user_id,
      total_time_ms: data.total_time_ms,
      correct: data.correct,
      incorrect: data.incorrect,
      version: data.version,
      round_times_ms: Array.isArray(data.round_times_ms) ? (data.round_times_ms as number[]) : null,
      created_at: data.created_at,
    };
  },

  async getLeaderboard(
    supabase: SupabaseClient,
    deckId: string,
    limit = CHALLENGE_MAX_LEADERBOARD,
    currentUserId?: string | null
  ): Promise<ChallengeLeaderboardDTO> {
    const effectiveLimit = Math.min(Math.max(limit, 1), 50);

    const { data, error } = await supabase
      .from("challenge_results")
      .select("id, deck_id, user_id, total_time_ms, correct, incorrect, created_at")
      .eq("deck_id", deckId)
      .order("total_time_ms", { ascending: true })
      .order("incorrect", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(effectiveLimit);

    if (error) {
      console.error("Error fetching challenge leaderboard:", error);
      throw new Error(`Failed to fetch leaderboard: ${error.message}`);
    }

    const rows = data ?? [];
    const userIds = Array.from(new Set(rows.map((row) => row.user_id)));
    const profileMap = await fetchProfileMap(supabase, userIds);

    const entries: ChallengeLeaderboardEntryDTO[] = rows.map((row) => ({
      id: row.id,
      deck_id: row.deck_id,
      user_id: row.user_id,
      total_time_ms: row.total_time_ms,
      incorrect: row.incorrect,
      correct: row.correct,
      created_at: row.created_at,
      player_name: resolvePlayerName(profileMap.get(row.user_id)),
      is_current_user: Boolean(currentUserId && row.user_id === currentUserId),
    }));

    let myBest: ChallengeLeaderboardEntryDTO | null = entries.find((entry) => entry.is_current_user) ?? null;

    if (!myBest && currentUserId) {
      const extra = await fetchBestForUser(supabase, deckId, currentUserId);
      if (extra) {
        const playerName = profileMap.has(currentUserId)
          ? resolvePlayerName(profileMap.get(currentUserId))
          : await fetchSinglePlayerName(supabase, currentUserId);
        myBest = {
          ...extra,
          player_name: playerName ?? "Ty",
          is_current_user: true,
        };
      }
    }

    return {
      deck_id: deckId,
      entries,
      my_best: myBest ?? undefined,
    };
  },
};

async function fetchProfileMap(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, { username: string; display_name: string | null }>> {
  const map = new Map<string, { username: string; display_name: string | null }>();
  if (userIds.length === 0) {
    return map;
  }

  const { data, error } = await supabase.from("profiles").select("id, username, display_name").in("id", userIds);

  if (error) {
    console.error("Error fetching profiles for leaderboard:", error);
    throw new Error(`Failed to fetch player profiles: ${error.message}`);
  }

  for (const profile of data ?? []) {
    map.set(profile.id, { username: profile.username, display_name: profile.display_name });
  }

  return map;
}

function resolvePlayerName(profile?: { username: string; display_name: string | null }): string {
  if (!profile) {
    return "Anonimowy gracz";
  }
  return profile.display_name?.trim() || profile.username || "Anonimowy gracz";
}

async function fetchBestForUser(
  supabase: SupabaseClient,
  deckId: string,
  userId: string
): Promise<Omit<ChallengeLeaderboardEntryDTO, "player_name" | "is_current_user"> | null> {
  const { data, error } = await supabase
    .from("challenge_results")
    .select("id, deck_id, user_id, total_time_ms, correct, incorrect, created_at")
    .eq("deck_id", deckId)
    .eq("user_id", userId)
    .order("total_time_ms", { ascending: true })
    .order("incorrect", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching player's best challenge result:", error);
    throw new Error(`Failed to fetch player's best result: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    deck_id: data.deck_id,
    user_id: data.user_id,
    total_time_ms: data.total_time_ms,
    incorrect: data.incorrect,
    correct: data.correct,
    created_at: data.created_at,
  };
}

async function fetchSinglePlayerName(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", userId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching single profile name:", error);
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return data.display_name?.trim() || data.username || null;
}
