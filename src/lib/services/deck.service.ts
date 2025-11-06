import { ValidationError } from "@/lib/errors";
import type { SupabaseClient } from "@/db/supabase.client";
import type { CreateDeckDTO, CreateDeckResponseDTO } from "@/types";

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

    const { data: ownerProfile, error: ownerError } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("id", userId)
      .single();

    if (ownerError || !ownerProfile) {
      console.error("Error fetching owner profile:", ownerError);
      console.error("UserId:", userId);
      throw new Error(
        ownerError
          ? `Failed to fetch owner profile: ${ownerError.message}`
          : `Deck owner profile not found for user ID: ${userId}`
      );
    }

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
};
