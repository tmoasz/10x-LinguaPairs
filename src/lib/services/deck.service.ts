import { ValidationError } from "@/lib/errors";
import type { SupabaseClient } from "@/db/supabase.client";
import type {
  CreateDeckDTO,
  CreateDeckResponseDTO,
  DeckDetailDTO,
  LanguageRefExtendedDTO,
  UpdateDeckDTO,
} from "@/types";

type DeckRow = {
  id: string;
  owner_user_id: string;
  title: string;
  description: string | null;
  lang_a: string;
  lang_b: string;
  visibility: DeckDetailDTO["visibility"];
  created_at: string;
  updated_at: string;
};

type LanguageRow = {
  id: string;
  code: string;
  name: string;
  flag_emoji: string | null;
};

export const deckService = {
  async createDeck(supabase: SupabaseClient, userId: string, data: CreateDeckDTO): Promise<CreateDeckResponseDTO> {
    const languageIds = Array.from(new Set([data.lang_a, data.lang_b]));

    const { data: languages, error: languagesError } = await supabase
      .from("languages")
      .select("id")
      .in("id", languageIds)
      .eq("is_active", true);

    if (languagesError) {
      console.error("Error fetching languages:", languagesError);
      throw new Error(`Failed to fetch languages: ${languagesError.message}`);
    }

    const foundLanguageIds = new Set((languages ?? []).map((lang) => lang.id));
    const missingLanguageIds = [data.lang_a, data.lang_b].filter((id) => !foundLanguageIds.has(id));

    if (missingLanguageIds.length > 0) {
      throw new ValidationError(
        "One or more languages are invalid",
        missingLanguageIds.map((id) => ({
          field: id === data.lang_a ? "lang_a" : "lang_b",
          message: "Language not found",
        }))
      );
    }

    const visibility = data.visibility ?? "private";

    const { data: deckRecord, error: deckInsertError } = await supabase
      .from("decks")
      .insert({
        owner_user_id: userId,
        title: data.title,
        description: data.description,
        lang_a: data.lang_a,
        lang_b: data.lang_b,
        visibility,
      })
      .select("id, owner_user_id, title, description, lang_a, lang_b, visibility, created_at, updated_at")
      .single();

    if (deckInsertError || !deckRecord) {
      console.error("Error creating deck:", deckInsertError);
      throw new Error(
        deckInsertError
          ? `Failed to create deck: ${deckInsertError.message}`
          : "Failed to create deck: No record returned"
      );
    }

    // TODO: callAiService to generate pairs here

    const ownerProfile = await fetchOwnerProfile(supabase, userId);

    return {
      id: deckRecord.id,
      owner_user_id: deckRecord.owner_user_id,
      owner: {
        id: ownerProfile.id,
        username: ownerProfile.username,
      },
      title: deckRecord.title,
      description: deckRecord.description ?? data.description,
      lang_a: deckRecord.lang_a,
      lang_b: deckRecord.lang_b,
      visibility: deckRecord.visibility,
      pairs_count: 0,
      created_at: deckRecord.created_at,
      updated_at: deckRecord.updated_at,
    };
  },

  async getDeckDetail(supabase: SupabaseClient, deckId: string): Promise<DeckDetailDTO | null> {
    const deckRow = await fetchDeckRow(supabase, deckId);
    if (!deckRow) {
      return null;
    }

    const languages = await fetchLanguageMap(supabase, [deckRow.lang_a, deckRow.lang_b]);
    const langA = languages.get(deckRow.lang_a);
    const langB = languages.get(deckRow.lang_b);

    if (!langA || !langB) {
      throw new Error("Languages for deck are missing");
    }

    const ownerProfile = await fetchOwnerProfile(supabase, deckRow.owner_user_id);
    const pairsCount = await countPairsForDeck(supabase, deckId);

    return mapDeckDetail(deckRow, langA, langB, ownerProfile, pairsCount);
  },

  async updateDeckMeta(supabase: SupabaseClient, deckId: string, updates: UpdateDeckDTO): Promise<void> {
    const payload: Record<string, string> = {};

    if (typeof updates.title === "string") {
      payload.title = updates.title;
    }
    if (typeof updates.description === "string") {
      payload.description = updates.description;
    }
    if (updates.visibility) {
      payload.visibility = updates.visibility;
    }

    const { error } = await supabase.from("decks").update(payload).eq("id", deckId).is("deleted_at", null);

    if (error) {
      console.error("Error updating deck:", error);
      throw new Error(`Failed to update deck: ${error.message}`);
    }
  },

  canViewDeck(deck: Pick<DeckDetailDTO, "visibility" | "owner_user_id">, userId?: string | null): boolean {
    if (deck.visibility === "private") {
      return Boolean(userId && deck.owner_user_id === userId);
    }
    return true;
  },

  isOwner(deck: Pick<DeckDetailDTO, "owner_user_id">, userId?: string | null): boolean {
    return Boolean(userId && deck.owner_user_id === userId);
  },
};

async function fetchDeckRow(supabase: SupabaseClient, deckId: string): Promise<DeckRow | null> {
  const { data, error } = await supabase
    .from("decks")
    .select("id, owner_user_id, title, description, lang_a, lang_b, visibility, created_at, updated_at")
    .eq("id", deckId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching deck:", error);
    throw new Error(`Failed to fetch deck: ${error.message}`);
  }

  return data ?? null;
}

async function fetchOwnerProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.from("profiles").select("id, username").eq("id", userId).single();

  if (error || !data) {
    console.error("Error fetching owner profile:", error);
    throw new Error(
      error ? `Failed to fetch owner profile: ${error.message}` : `Deck owner profile not found for user ID: ${userId}`
    );
  }

  return data;
}

async function fetchLanguageMap(supabase: SupabaseClient, ids: string[]): Promise<Map<string, LanguageRefExtendedDTO>> {
  const { data, error } = await supabase
    .from("languages")
    .select("id, code, name, flag_emoji")
    .in("id", ids);

  if (error) {
    console.error("Error fetching languages:", error);
    throw new Error(`Failed to fetch languages: ${error.message}`);
  }

  const map = new Map<string, LanguageRefExtendedDTO>();
  for (const lang of data ?? []) {
    map.set(lang.id, {
      id: lang.id,
      code: lang.code,
      name: lang.name,
      flag_emoji: lang.flag_emoji ?? "",
    });
  }
  return map;
}

async function countPairsForDeck(supabase: SupabaseClient, deckId: string): Promise<number> {
  const { count, error } = await supabase
    .from("pairs")
    .select("id", { count: "exact", head: true })
    .eq("deck_id", deckId)
    .is("deleted_at", null);

  if (error) {
    console.error("Error counting pairs:", error);
    throw new Error(`Failed to count pairs: ${error.message}`);
  }

  return count ?? 0;
}

function mapDeckDetail(
  deckRow: DeckRow,
  langA: LanguageRefExtendedDTO,
  langB: LanguageRefExtendedDTO,
  ownerProfile: { id: string; username: string },
  pairsCount: number
): DeckDetailDTO {
  return {
    id: deckRow.id,
    owner_user_id: deckRow.owner_user_id,
    owner: {
      id: ownerProfile.id,
      username: ownerProfile.username,
    },
    title: deckRow.title,
    description: deckRow.description,
    lang_a: langA,
    lang_b: langB,
    visibility: deckRow.visibility,
    pairs_count: pairsCount,
    created_at: deckRow.created_at,
    updated_at: deckRow.updated_at,
  };
}
