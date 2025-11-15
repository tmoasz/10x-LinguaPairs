/**
 * DTO and Command Model Type Definitions for 10x-LinguaPairs
 *
 * This file contains all Data Transfer Objects (DTOs) and Command Models
 * used throughout the application. All types are derived from database
 * models defined in src/db/database.types.ts to ensure type safety.
 */

import type { Tables, TablesInsert, TablesUpdate, Enums } from "./db/database.types";

// ============================================================================
// Base Entity Types (Direct Database Mappings)
// ============================================================================

export type Profile = Tables<"profiles">;
export type Deck = Tables<"decks">;
export type Pair = Tables<"pairs">;
export type Language = Tables<"languages">;
export type UserPairState = Tables<"user_pair_state">;
export type DeckShareLink = Tables<"deck_share_links">;

export type DeckVisibility = Enums<"deck_visibility">;

// ============================================================================
// 1. Authentication DTOs
// ============================================================================

/**
 * POST /api/auth/signup - Request
 */
export interface SignupRequestDTO {
  email: string;
  password: string;
  username: string;
}

/**
 * POST /api/auth/signup - Response
 * POST /api/auth/login - Response
 */
export interface AuthResponseDTO {
  user: {
    id: string;
    email: string;
    username: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

/**
 * POST /api/auth/login - Request
 */
export interface LoginRequestDTO {
  email: string;
  password: string;
}

/**
 * POST /api/auth/refresh - Request
 */
export interface RefreshRequestDTO {
  refresh_token: string;
}

/**
 * POST /api/auth/refresh - Response
 */
export interface RefreshResponseDTO {
  access_token: string;
  expires_in: number;
}

// ============================================================================
// 2. User / Profile DTOs
// ============================================================================

/**
 * GET /api/users/me - Response
 * Derived from profiles table, excluding internal fields
 */
export type ProfileDTO = Pick<
  Profile,
  "id" | "username" | "display_name" | "timezone" | "settings" | "created_at" | "updated_at"
>;

/**
 * PATCH /api/users/me - Request
 * Partial update of profile, allows updating specific fields
 */
export type UpdateProfileDTO = Partial<Pick<Profile, "display_name" | "timezone" | "settings">>;

/**
 * GET /api/users/me/quota - Response
 */
export interface QuotaDTO {
  daily_limit: number;
  used_today: number;
  remaining: number;
  reset_at: string; // ISO 8601 timestamp
}

// ============================================================================
// 3. Language DTOs
// ============================================================================

/**
 * Language information DTO
 * Derived from languages table
 * Note: is_active is excluded - API always returns only active languages, so this field is not needed
 */
export type LanguageDTO = Pick<Language, "id" | "code" | "name" | "name_native" | "flag_emoji" | "sort_order">;

/**
 * GET /api/languages - Response
 */
export interface LanguagesListDTO {
  languages: LanguageDTO[];
  count: number;
}

/**
 * Language reference in deck responses
 */
export type LanguageRefDTO = Pick<LanguageDTO, "id" | "code" | "name" | "flag_emoji">;

/**
 * Extended language reference with flag emoji
 */
export type LanguageRefExtendedDTO = Pick<LanguageDTO, "id" | "code" | "name" | "flag_emoji">;

// ============================================================================
// 4. Deck DTOs
// ============================================================================

/**
 * Deck list item - used in GET /api/decks response
 */
export interface DeckListItemDTO {
  id: string;
  owner_user_id: string;
  title: string;
  description: string;
  lang_a: LanguageRefDTO;
  lang_b: LanguageRefDTO;
  visibility: DeckVisibility;
  pairs_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Owner information in deck detail
 */
export interface DeckOwnerDTO {
  id: string;
  username: string;
}

/**
 * Detailed deck view - GET /api/decks/:id response
 */
export interface DeckDetailDTO {
  id: string;
  owner_user_id: string;
  owner: DeckOwnerDTO;
  title: string;
  description: string;
  lang_a: LanguageRefExtendedDTO;
  lang_b: LanguageRefExtendedDTO;
  visibility: DeckVisibility;
  pairs_count: number;
  created_at: string;
  updated_at: string;
  can_manage?: boolean;
}

/**
 * POST /api/decks - Request (Command Model)
 */
export interface CreateDeckDTO {
  title: string;
  description: string;
  lang_a: string; // Language UUID
  lang_b: string; // Language UUID
  visibility?: DeckVisibility;
}

/**
 * POST /api/decks - Response
 * Simplified response with language IDs only (languages are static in DB, frontend can resolve from cache)
 */
export interface CreateDeckResponseDTO {
  id: string;
  owner_user_id: string;
  owner: DeckOwnerDTO;
  title: string;
  description: string;
  lang_a: string; // Language UUID only
  lang_b: string; // Language UUID only
  visibility: DeckVisibility;
  pairs_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * PATCH /api/decks/:id - Request (Command Model)
 */
export interface UpdateDeckDTO {
  title?: string;
  description?: string;
  visibility?: DeckVisibility;
}

/**
 * GET /api/decks - Response
 */
export interface DecksListDTO {
  decks: DeckListItemDTO[];
  pagination: PaginationDTO;
}

// ============================================================================
// 5. Pair DTOs
// ============================================================================

/**
 * Basic pair DTO - used in list views
 * Derived directly from pairs table
 */
export interface PairDTO {
  id: string;
  deck_id: string;
  term_a: string;
  term_b: string;
  added_at: string;
  updated_at: string;
  flagged_by_me?: boolean;
}

/**
 * Detailed pair with normalized terms - GET /api/decks/:deckId/pairs/:id
 */
export interface PairDetailDTO extends PairDTO {
  term_a_norm: string | null;
  term_b_norm: string | null;
}

/**
 * POST /api/decks/:deckId/pairs - Request (Command Model)
 */
export interface CreatePairDTO {
  term_a?: string;
  term_b?: string;
  auto_translate?: boolean;
}

/**
 * PATCH /api/decks/:deckId/pairs/:id - Request (Command Model)
 */
export interface UpdatePairDTO {
  term_a?: string;
  term_b?: string;
}

/**
 * GET /api/decks/:deckId/pairs - Response
 */
export interface PairsListDTO {
  pairs: PairDTO[];
  pagination: PaginationDTO;
}

/**
 * POST /api/decks/:deckId/pairs/:id/flag - Request (Command Model)
 */
export interface FlagPairDTO {
  reason: string;
}

/**
 * POST /api/decks/:deckId/pairs/:id/flag - Response
 */
export interface PairFlagResponseDTO {
  id: string;
  pair_id: string;
  flagged_by: string;
  reason: string;
  flagged_at: string;
}

// ============================================================================
// 6. Generation DTOs (AI-Powered)
// ============================================================================

/**
 * Content type for generation
 */
export type GenerationContentType = "auto" | "words" | "phrases" | "mini-phrases";

/**
 * Register/formality level for generation
 */
export type GenerationRegister = "neutral" | "informal" | "formal";

/**
 * Predefined topic IDs for generation
 */
export type TopicID =
  | "travel"
  | "business"
  | "food"
  | "technology"
  | "health"
  | "education"
  | "shopping"
  | "family"
  | "hobbies"
  | "sports"
  | "nature"
  | "culture"
  | "emotions"
  | "time"
  | "weather"
  | "transport"
  | "communication"
  | "home"
  | "work"
  | "emergency";

/**
 * POST /api/generate/from-topic - Request (Command Model)
 */
export interface GenerateFromTopicDTO {
  topic_id: TopicID;
  deck_id: string;
  content_type?: GenerationContentType;
  register?: GenerationRegister;
  exclude_pairs?: string[]; // Array of pair UUIDs
}

/**
 * POST /api/generate/from-text - Request (Command Model)
 */
export interface GenerateFromTextDTO {
  text: string; // 1-5000 characters
  deck_id: string;
  content_type?: GenerationContentType;
  register?: GenerationRegister;
  exclude_pairs?: string[]; // Array of pair UUIDs
}

/**
 * POST /api/generate/extend - Request (Command Model)
 */
export interface GenerateExtendDTO {
  deck_id: string;
  base_generation_id: string;
  content_type?: GenerationContentType;
  register?: GenerationRegister;
}

/**
 * Generated pair with metadata
 */
export interface GeneratedPairDTO {
  id: string;
  term_a: string;
  term_b: string;
  type: GenerationContentType;
  register: GenerationRegister;
  source: "ai_generated";
}

/**
 * Generation metadata
 */
export interface GenerationMetadataDTO {
  generation_time_ms: number;
  cache_hit: boolean;
  cost_usd?: number;
  prompt_hash?: string;
  excluded_count?: number;
}

/**
 * Generation response - used by all generation endpoints
 */
export interface GenerationResponseDTO {
  generation_id: string;
  deck_id: string;
  pairs_generated: number;
  pairs: GeneratedPairDTO[];
  metadata: GenerationMetadataDTO;
  quota: Pick<QuotaDTO, "used_today" | "remaining">;
}

// ============================================================================
// 7. Progress Tracking DTOs (Leitner SRS)
// ============================================================================

/**
 * Leitner bucket classification
 */
export type LeitnerBucket = "new" | "learning" | "known";

/**
 * User progress for a single pair
 * Derived from user_pair_state table
 */
export interface UserPairProgressDTO {
  pair_id: string;
  pair: {
    term_a: string;
    term_b: string;
  };
  reps: number;
  total_correct: number;
  streak_correct: number;
  accuracy_percentage: number;
  last_grade: number | null;
  last_reviewed_at: string | null;
  interval_days: number;
  due_at: string | null;
  bucket: LeitnerBucket;
}

/**
 * Deck progress statistics
 */
export interface DeckProgressStatisticsDTO {
  total_pairs: number;
  new: number;
  learning: number;
  known: number;
  mastery_percentage: number;
}

/**
 * GET /api/decks/:deckId/progress - Response
 */
export interface DeckProgressDTO {
  deck_id: string;
  user_id: string;
  statistics: DeckProgressStatisticsDTO;
  pairs: UserPairProgressDTO[];
}

/**
 * Due review item for GET /api/progress/due
 */
export interface DueReviewItemDTO {
  pair_id: string;
  deck_id: string;
  deck_title: string;
  pair: {
    term_a: string;
    term_b: string;
  };
  due_at: string;
  interval_days: number;
  bucket: LeitnerBucket;
}

/**
 * GET /api/progress/due - Response
 */
export interface DueReviewsDTO {
  due_count: number;
  pairs: DueReviewItemDTO[];
}

/**
 * POST /api/progress/review - Request (Command Model)
 */
export interface ReviewRequestDTO {
  pair_id: string;
  deck_id: string;
  grade: number; // 0-5
  time_spent_ms: number;
}

/**
 * POST /api/progress/review - Response
 */
export interface ReviewResponseDTO {
  pair_id: string;
  deck_id: string;
  reps: number;
  total_correct: number;
  streak_correct: number;
  last_grade: number;
  last_reviewed_at: string;
  interval_days: number;
  due_at: string | null;
  bucket: LeitnerBucket;
  bucket_changed: boolean;
}

/**
 * Single review in batch
 */
export interface BatchReviewItemDTO {
  pair_id: string;
  grade: number; // 0-5
  time_spent_ms: number;
}

/**
 * POST /api/progress/batch-review - Request (Command Model)
 */
export interface BatchReviewRequestDTO {
  deck_id: string;
  reviews: BatchReviewItemDTO[];
  session_type: "practice" | "challenge";
}

/**
 * Batch review statistics
 */
export interface BatchReviewStatisticsDTO {
  average_grade: number;
  total_time_ms: number;
  accuracy_percentage: number;
}

/**
 * Updated pair summary in batch review
 */
export interface BatchReviewUpdatedPairDTO {
  pair_id: string;
  bucket: LeitnerBucket;
  bucket_changed: boolean;
}

/**
 * POST /api/progress/batch-review - Response
 */
export interface BatchReviewResponseDTO {
  reviews_processed: number;
  statistics: BatchReviewStatisticsDTO;
  updated_pairs: BatchReviewUpdatedPairDTO[];
}

// ============================================================================
// 8. Share Link DTOs
// ============================================================================

/**
 * POST /api/decks/:deckId/share - Request (Command Model)
 */
export interface CreateShareLinkDTO {
  expires_in_days?: number;
}

/**
 * Share link response - POST /api/decks/:deckId/share
 * Derived from deck_share_links table
 */
export interface ShareLinkDTO {
  deck_id: string;
  token: string;
  share_url: string;
  created_at: string;
  expires_at: string | null;
}

/**
 * GET /api/shared/:token - Response
 */
export interface SharedDeckDTO {
  deck: {
    id: string;
    title: string;
    description: string;
    lang_a: LanguageRefExtendedDTO;
    lang_b: LanguageRefExtendedDTO;
    pairs_count: number;
  };
  pairs: {
    id: string;
    term_a: string;
    term_b: string;
  }[];
}

// ============================================================================
// 9. Curated Decks DTOs
// ============================================================================

/**
 * Curated deck list item
 */
export interface CuratedDeckListItemDTO {
  id: string;
  title: string;
  description: string;
  lang_a: LanguageRefExtendedDTO;
  lang_b: LanguageRefExtendedDTO;
  pairs_count: number;
  is_curated: true;
}

/**
 * GET /api/curated-decks - Response
 */
export interface CuratedDecksListDTO {
  decks: CuratedDeckListItemDTO[];
  count: number;
}

/**
 * GET /api/curated-decks/:id - Response
 */
export interface CuratedDeckDetailDTO {
  deck: CuratedDeckListItemDTO;
  pairs: {
    id: string;
    term_a: string;
    term_b: string;
  }[];
}

// ============================================================================
// 10. Common Utility DTOs
// ============================================================================

/**
 * Standard pagination response structure
 */
export interface PaginationDTO {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  /**
   * Transitional alias for page_size. Prefer using page_size directly.
   */
  limit?: number;
}

/**
 * Standard error response structure
 */
export interface ErrorResponseDTO {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Query parameters for list endpoints
 */
export interface PaginationQueryParams {
  page?: number;
  page_size?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}

/**
 * Query parameters for deck list
 */
export interface DeckListQueryParams extends PaginationQueryParams {
  visibility?: DeckVisibility;
  lang_a?: string;
  lang_b?: string;
}

/**
 * Query parameters for pair list
 */
export interface PairListQueryParams extends PaginationQueryParams {
  search?: string;
}

/**
 * Query parameters for progress
 */
export interface ProgressQueryParams {
  bucket?: LeitnerBucket;
}

/**
 * Query parameters for due reviews
 */
export interface DueReviewQueryParams {
  limit?: number;
  deck_id?: string;
}

// ============================================================================
// 11. Telemetry & Logging Types
// ============================================================================

/**
 * Generation telemetry log entry
 */
export interface GenerationTelemetryDTO {
  generation_id: string;
  user_id: string;
  deck_id: string;
  generation_type: "topic" | "text" | "extend";
  topic_id?: TopicID;
  text_hash?: string;
  content_type: GenerationContentType;
  register: GenerationRegister;
  pairs_requested: number;
  pairs_generated: number;
  generation_time_ms: number;
  cache_hit: boolean;
  cost_usd?: number;
  prompt_hash?: string;
  ai_model?: string;
  created_at: string;
}

/**
 * Review telemetry log entry
 */
export interface ReviewTelemetryDTO {
  review_id: string;
  user_id: string;
  pair_id: string;
  deck_id: string;
  grade: number;
  time_spent_ms: number;
  session_type: "practice" | "challenge";
  created_at: string;
}

/**
 * Flag telemetry log entry
 */
export interface FlagTelemetryDTO {
  flag_id: string;
  pair_id: string;
  flagged_by: string;
  reason: string;
  details?: string;
  flagged_at: string;
}

// ============================================================================
// 12. Command Model Helpers
// ============================================================================

/**
 * Helper type for database inserts - converts DTO to database insert format
 */
export type DeckInsert = TablesInsert<"decks">;
export type PairInsert = TablesInsert<"pairs">;
export type ProfileUpdate = TablesUpdate<"profiles">;
export type DeckUpdate = TablesUpdate<"decks">;
export type PairUpdate = TablesUpdate<"pairs">;

/**
 * Helper to convert CreateDeckDTO to database insert
 */
export type CreateDeckCommand = Omit<DeckInsert, "owner_user_id" | "created_at" | "updated_at">;

/**
 * Helper to convert CreatePairDTO to database insert
 */
export type CreatePairCommand = Omit<PairInsert, "deck_id" | "added_at" | "updated_at">;
