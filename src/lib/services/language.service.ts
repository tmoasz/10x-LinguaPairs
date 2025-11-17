import type { SupabaseClient } from "@/db/supabase.client";
import { logger } from "@/lib/utils/logger";
import type { Language, LanguageDTO, LanguagesListDTO } from "@/types";

/**
 * Options for getLanguages method
 */
interface GetLanguagesOptions {
  sort?: string;
}

/**
 * LanguageService handles all business logic related to languages
 * Provides methods for fetching languages from the database
 */
export const languageService = {
  /**
   * Retrieves a list of all active languages
   * Business rule: Always filters by is_active = true
   *
   * @param supabase - Supabase client instance
   * @param options - Query options (sort field)
   * @returns Promise with list of languages and count
   */
  async getLanguages(supabase: SupabaseClient, options: GetLanguagesOptions = {}): Promise<LanguagesListDTO> {
    // Business rule: always filter by is_active = true
    let query = supabase.from("languages").select("*", { count: "exact" }).eq("is_active", true);

    // Apply sorting
    const sortField = options.sort || "sort_order";
    query = query.order(sortField, { ascending: true });

    const { data, error, count } = await query;

    if (error) {
      logger.error("Error fetching languages:", error);
      throw new Error(`Failed to fetch languages: ${error.message}`);
    }

    // Map to LanguageDTO (exclude is_active and created_at)
    // is_active is not needed in response since we always return only active languages
    const languages: LanguageDTO[] = (data || []).map((lang) => ({
      id: lang.id,
      code: lang.code,
      name: lang.name,
      name_native: lang.name_native,
      flag_emoji: lang.flag_emoji,
      sort_order: lang.sort_order,
    }));

    return {
      languages,
      count: count || 0,
    };
  },

  /**
   * Retrieves a single language by ID
   * Business rule: Always filters by is_active = true
   * Returns null if language not found or not active
   *
   * @param supabase - Supabase client instance
   * @param id - Language UUID
   * @returns Promise with language data or null if not found
   */
  async getLanguageById(supabase: SupabaseClient, id: string): Promise<Language | null> {
    // Business rule: always filter by is_active = true
    const { data, error } = await supabase.from("languages").select("*").eq("id", id).eq("is_active", true).single();

    if (error) {
      // Supabase returns code "PGRST116" when no record is found
      // This includes cases where language is inactive (filtered by is_active = true)
      if (error.code === "PGRST116") {
        return null;
      }

      logger.error("Error fetching language:", error);
      throw new Error(`Failed to fetch language: ${error.message}`);
    }

    return data;
  },
};
