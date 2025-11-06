-- ============================================================================
-- Migration: Initial Schema for LinguaPairs MVP
-- ============================================================================
-- Purpose: Create complete database schema for language learning flashcard app
-- 
-- Affected Objects:
--   - Extensions: unaccent, pg_trgm, pgcrypto, citext
--   - Types: deck_visibility
--   - Tables: profiles, decks, pairs, tags, pair_tags, user_pair_state, deck_share_links
--   - Functions: set_updated_at(), prevent_deck_lang_change()
--   - RLS policies for all tables
--
-- Notes:
--   - All tables have RLS enabled
--   - Soft delete pattern for decks and pairs
--   - Normalized search fields with unaccent/lowercase
--   - Composite FK pattern for user_pair_state
-- ============================================================================

-- ============================================================================
-- SECTION 1: Extensions
-- ============================================================================
-- Enable required PostgreSQL extensions for full-text search, similarity matching,
-- UUID generation, and case-insensitive text

create extension if not exists unaccent;
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;
create extension if not exists citext;

-- ----------------------------------------------------------------------------
-- Function: immutable_unaccent(text)
-- ----------------------------------------------------------------------------
-- Purpose: Wrapper around unaccent that can be marked IMMUTABLE for generated columns

create or replace function immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
as $$
  select unaccent('unaccent', $1);
$$;

-- ============================================================================
-- SECTION 2: Custom Types
-- ============================================================================

-- deck_visibility: controls who can access a deck
--   - private: only owner
--   - unlisted: accessible via share link
--   - public: accessible to everyone
create type deck_visibility as enum ('private', 'unlisted', 'public');

-- ============================================================================
-- SECTION 3: Tables
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: profiles
-- ----------------------------------------------------------------------------
-- Purpose: Extended user profile data (1-to-1 with auth.users)
-- RLS: Users can only access their own profile

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext unique not null,
  display_name text,
  timezone text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table profiles is 'Extended user profile information';
comment on column profiles.id is 'References auth.users.id - enforces 1-to-1 relationship';
comment on column profiles.username is 'Unique username, case-insensitive';
comment on column profiles.settings is 'User preferences stored as JSON';

-- ----------------------------------------------------------------------------
-- Table: decks
-- ----------------------------------------------------------------------------
-- Purpose: Language pair flashcard collections
-- RLS: Owner has full access, public decks readable by all

create table decks (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  lang_a text not null check (lang_a ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  lang_b text not null check (lang_b ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  visibility deck_visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  
  -- Ensure languages are different
  constraint decks_different_languages check (lang_a <> lang_b)
);

comment on table decks is 'Language pair flashcard collections';
comment on column decks.lang_a is 'Source language code (ISO 639-1 with optional region, e.g., en, en-US)';
comment on column decks.lang_b is 'Target language code (ISO 639-1 with optional region, e.g., es, es-MX)';
comment on column decks.visibility is 'Access control: private, unlisted (via token), or public';
comment on column decks.deleted_at is 'Soft delete timestamp - null means active';

-- ----------------------------------------------------------------------------
-- Table: pairs
-- ----------------------------------------------------------------------------
-- Purpose: Individual flashcard pairs within decks
-- RLS: Owner via deck ownership, public access for public decks

create table pairs (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references decks(id) on delete cascade,
  term_a text not null,
  term_b text not null,
  
  -- Normalized versions for duplicate detection and search
  -- Removes accents, lowercases, collapses whitespace
  term_a_norm text generated always as (
    btrim(regexp_replace(lower(immutable_unaccent(term_a)), '\s+', ' ', 'g'))
  ) stored,
  term_b_norm text generated always as (
    btrim(regexp_replace(lower(immutable_unaccent(term_b)), '\s+', ' ', 'g'))
  ) stored,
  
  -- Full-text search vector combining both normalized terms
  search_tsv tsvector generated always as (
    to_tsvector('simple',
      btrim(regexp_replace(lower(immutable_unaccent(term_a)), '\s+', ' ', 'g')) || ' ' ||
      btrim(regexp_replace(lower(immutable_unaccent(term_b)), '\s+', ' ', 'g'))
    )
  ) stored,
  
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table pairs is 'Individual flashcard pairs (term A ↔ term B)';
comment on column pairs.term_a_norm is 'Normalized term_a for deduplication - auto-generated';
comment on column pairs.term_b_norm is 'Normalized term_b for deduplication - auto-generated';
comment on column pairs.search_tsv is 'Full-text search vector for both terms - auto-generated';
comment on column pairs.deleted_at is 'Soft delete timestamp - null means active';

-- ----------------------------------------------------------------------------
-- Table: tags
-- ----------------------------------------------------------------------------
-- Purpose: Global, centrally-managed tags for categorizing pairs
-- RLS: Read-only for users, managed by service role

create table tags (
  id uuid primary key default gen_random_uuid(),
  slug citext unique not null,
  name text not null,
  description text
);

comment on table tags is 'Global tags for categorizing flashcard pairs';
comment on column tags.slug is 'URL-friendly unique identifier, case-insensitive';
comment on column tags.name is 'Display name for the tag';

-- ----------------------------------------------------------------------------
-- Table: pair_tags
-- ----------------------------------------------------------------------------
-- Purpose: Many-to-many relationship between pairs and tags
-- RLS: Readable by all, writable by service role

create table pair_tags (
  pair_id uuid not null references pairs(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  
  primary key (pair_id, tag_id)
);

comment on table pair_tags is 'Many-to-many relationship: pairs ↔ tags';

-- ----------------------------------------------------------------------------
-- Table: user_pair_state
-- ----------------------------------------------------------------------------
-- Purpose: Per-user learning progress and SRS scheduling
-- RLS: Users can only access their own state

create table user_pair_state (
  user_id uuid not null references profiles(id) on delete cascade,
  pair_id uuid not null references pairs(id) on delete cascade,
  deck_id uuid not null,
  
  -- Learning statistics
  reps integer not null default 0,
  total_correct integer not null default 0,
  streak_correct integer not null default 0,
  
  -- SRS scheduling
  last_grade smallint check (last_grade between 0 and 5),
  last_reviewed_at timestamptz,
  interval_days integer not null default 0 check (interval_days >= 0),
  due_at timestamptz,
  
  primary key (user_id, pair_id, deck_id)
);

comment on table user_pair_state is 'Per-user learning progress and spaced repetition state';
comment on column user_pair_state.reps is 'Total number of review repetitions';
comment on column user_pair_state.total_correct is 'Cumulative correct answers';
comment on column user_pair_state.streak_correct is 'Current consecutive correct answers';
comment on column user_pair_state.last_grade is 'Grade from last review (0-5, SM-2 algorithm)';
comment on column user_pair_state.interval_days is 'Days until next review';
comment on column user_pair_state.due_at is 'Timestamp when card becomes due for review';

-- ----------------------------------------------------------------------------
-- Table: deck_share_links
-- ----------------------------------------------------------------------------
-- Purpose: Shareable tokens for unlisted decks
-- RLS: Owner can manage, access validated via RPC

create table deck_share_links (
  deck_id uuid not null references decks(id) on delete cascade,
  token uuid unique not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  
  primary key (deck_id, token)
);

comment on table deck_share_links is 'Share tokens for unlisted decks';
comment on column deck_share_links.token is 'Unique UUID token for accessing unlisted deck';
comment on column deck_share_links.expires_at is 'Optional expiration timestamp';
comment on column deck_share_links.revoked_at is 'If set, token is no longer valid';

-- ============================================================================
-- SECTION 4: Indexes
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Indexes: decks
-- ----------------------------------------------------------------------------

-- Owner's decks ordered by creation date
create index idx_decks_owner_created on decks(owner_user_id, created_at desc);

-- Fast lookup for active decks (soft delete pattern)
create index idx_decks_active on decks(id) where deleted_at is null;

comment on index idx_decks_owner_created is 'Optimize listing user decks by creation date';
comment on index idx_decks_active is 'Partial index for active (non-deleted) decks';

-- ----------------------------------------------------------------------------
-- Indexes: pairs
-- ----------------------------------------------------------------------------

-- Prevent duplicate pairs within a deck (ignoring soft-deleted)
create unique index idx_pairs_unique_in_deck 
  on pairs(deck_id, term_a_norm, term_b_norm) 
  where deleted_at is null;

-- Deck pairs ordered by addition date
create index idx_pairs_deck_added on pairs(deck_id, added_at desc);

-- Full-text search on normalized terms
create index idx_pairs_search_tsv on pairs using gin(search_tsv);

-- Trigram similarity search on normalized term A
create index idx_pairs_term_a_trgm on pairs using gin(term_a_norm gin_trgm_ops);

-- Trigram similarity search on normalized term B
create index idx_pairs_term_b_trgm on pairs using gin(term_b_norm gin_trgm_ops);

-- Technical index for composite FK in user_pair_state
-- This allows user_pair_state to reference both pair_id and deck_id
create unique index idx_pairs_id_deck_id on pairs(id, deck_id);

comment on index idx_pairs_unique_in_deck is 'Enforce no duplicate pairs per deck (normalized)';
comment on index idx_pairs_deck_added is 'Optimize listing deck pairs by addition date';
comment on index idx_pairs_search_tsv is 'Full-text search index';
comment on index idx_pairs_term_a_trgm is 'Trigram index for fuzzy matching on term A';
comment on index idx_pairs_term_b_trgm is 'Trigram index for fuzzy matching on term B';
comment on index idx_pairs_id_deck_id is 'Technical index for composite FK from user_pair_state';

-- ----------------------------------------------------------------------------
-- Indexes: user_pair_state
-- ----------------------------------------------------------------------------

-- Review queue: find due cards for a user
create index idx_user_pair_state_due on user_pair_state(user_id, due_at);

-- Progress by deck: filter user progress for specific deck
create index idx_user_pair_state_user_deck on user_pair_state(user_id, deck_id);

comment on index idx_user_pair_state_due is 'Optimize finding due cards for review queue';
comment on index idx_user_pair_state_user_deck is 'Optimize progress queries filtered by deck';

-- ----------------------------------------------------------------------------
-- Indexes: pair_tags
-- ----------------------------------------------------------------------------

-- Reverse lookup: find all pairs for a tag
create index idx_pair_tags_tag_id on pair_tags(tag_id);

comment on index idx_pair_tags_tag_id is 'Optimize finding all pairs with a specific tag';

-- ----------------------------------------------------------------------------
-- Indexes: deck_share_links
-- ----------------------------------------------------------------------------

-- Lookup share links by deck
create index idx_deck_share_links_deck on deck_share_links(deck_id);

comment on index idx_deck_share_links_deck is 'Optimize finding share links for a deck';

-- ============================================================================
-- SECTION 5: Foreign Key for user_pair_state Composite Reference
-- ============================================================================

-- Add composite foreign key to ensure pair_id belongs to deck_id
-- This uses the unique index idx_pairs_id_deck_id created above
alter table user_pair_state
  add constraint fk_user_pair_state_pair_deck
  foreign key (pair_id, deck_id)
  references pairs(id, deck_id)
  on delete cascade;

comment on constraint fk_user_pair_state_pair_deck on user_pair_state is 
  'Ensures pair_id belongs to the specified deck_id';

-- ============================================================================
-- SECTION 6: Triggers and Functions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: set_updated_at()
-- ----------------------------------------------------------------------------
-- Purpose: Automatically update the updated_at timestamp on row modification

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function set_updated_at() is 'Trigger function to auto-update updated_at timestamp';

-- Apply updated_at trigger to relevant tables
create trigger trigger_profiles_updated_at
  before update on profiles
  for each row
  execute function set_updated_at();

create trigger trigger_decks_updated_at
  before update on decks
  for each row
  execute function set_updated_at();

create trigger trigger_pairs_updated_at
  before update on pairs
  for each row
  execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Function: prevent_deck_lang_change()
-- ----------------------------------------------------------------------------
-- Purpose: Prevent changing deck languages if pairs already exist
-- Rationale: Changing languages would invalidate existing language pairs

create or replace function prevent_deck_lang_change()
returns trigger
language plpgsql
as $$
declare
  pair_count integer;
begin
  -- Only check if lang_a or lang_b is being changed
  if (old.lang_a <> new.lang_a or old.lang_b <> new.lang_b) then
    -- Count non-deleted pairs in this deck
    select count(*)
    into pair_count
    from pairs
    where deck_id = new.id
      and deleted_at is null;
    
    -- Raise error if pairs exist
    if pair_count > 0 then
      raise exception 'Cannot change deck languages when pairs exist (deck has % active pairs)', pair_count;
    end if;
  end if;
  
  return new;
end;
$$;

comment on function prevent_deck_lang_change() is 
  'Prevent language changes on decks that contain pairs';

-- Apply language change prevention trigger
create trigger trigger_decks_prevent_lang_change
  before update on decks
  for each row
  execute function prevent_deck_lang_change();

-- ============================================================================
-- SECTION 7: Row Level Security (RLS)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- RLS: profiles
-- ----------------------------------------------------------------------------
-- Policy: Users can only access their own profile

alter table profiles enable row level security;

-- anon role: no access to profiles
create policy "profiles_select_anon"
  on profiles
  for select
  to anon
  using (false);

create policy "profiles_insert_anon"
  on profiles
  for insert
  to anon
  with check (false);

create policy "profiles_update_anon"
  on profiles
  for update
  to anon
  using (false)
  with check (false);

create policy "profiles_delete_anon"
  on profiles
  for delete
  to anon
  using (false);

-- authenticated role: full access to own profile
create policy "profiles_select_authenticated"
  on profiles
  for select
  to authenticated
  using (id = auth.uid());

-- insert is typically handled by backend trigger on auth.users creation
-- but allow authenticated users to create their own profile
create policy "profiles_insert_authenticated"
  on profiles
  for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles_update_authenticated"
  on profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_delete_authenticated"
  on profiles
  for delete
  to authenticated
  using (id = auth.uid());

comment on policy "profiles_select_authenticated" on profiles is 
  'Users can view their own profile';
comment on policy "profiles_update_authenticated" on profiles is 
  'Users can update their own profile';

-- ----------------------------------------------------------------------------
-- RLS: decks
-- ----------------------------------------------------------------------------
-- Policy: Owner has full access, public decks readable by all

alter table decks enable row level security;

-- anon role: can only view public, active decks
create policy "decks_select_anon"
  on decks
  for select
  to anon
  using (
    visibility = 'public' 
    and deleted_at is null
  );

create policy "decks_insert_anon"
  on decks
  for insert
  to anon
  with check (false);

create policy "decks_update_anon"
  on decks
  for update
  to anon
  using (false)
  with check (false);

create policy "decks_delete_anon"
  on decks
  for delete
  to anon
  using (false);

-- authenticated role: full access to own decks, read access to public decks
create policy "decks_select_authenticated_owner"
  on decks
  for select
  to authenticated
  using (owner_user_id = auth.uid());

create policy "decks_select_authenticated_public"
  on decks
  for select
  to authenticated
  using (
    visibility = 'public' 
    and deleted_at is null
  );

create policy "decks_insert_authenticated"
  on decks
  for insert
  to authenticated
  with check (owner_user_id = auth.uid());

create policy "decks_update_authenticated"
  on decks
  for update
  to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create policy "decks_delete_authenticated"
  on decks
  for delete
  to authenticated
  using (owner_user_id = auth.uid());

comment on policy "decks_select_anon" on decks is 
  'Anonymous users can view public, active decks';
comment on policy "decks_select_authenticated_owner" on decks is 
  'Users can view their own decks';
comment on policy "decks_select_authenticated_public" on decks is 
  'Users can view public, active decks';
comment on policy "decks_insert_authenticated" on decks is 
  'Users can create decks they own';
comment on policy "decks_update_authenticated" on decks is 
  'Users can update their own decks';

-- ----------------------------------------------------------------------------
-- RLS: pairs
-- ----------------------------------------------------------------------------
-- Policy: Access follows deck ownership and visibility

alter table pairs enable row level security;

-- anon role: can view pairs from public, active decks
create policy "pairs_select_anon"
  on pairs
  for select
  to anon
  using (
    exists (
      select 1
      from decks d
      where d.id = pairs.deck_id
        and d.visibility = 'public'
        and d.deleted_at is null
    )
    and deleted_at is null
  );

create policy "pairs_insert_anon"
  on pairs
  for insert
  to anon
  with check (false);

create policy "pairs_update_anon"
  on pairs
  for update
  to anon
  using (false)
  with check (false);

create policy "pairs_delete_anon"
  on pairs
  for delete
  to anon
  using (false);

-- authenticated role: full access to pairs in own decks, read access to public deck pairs
create policy "pairs_select_authenticated_owner"
  on pairs
  for select
  to authenticated
  using (
    exists (
      select 1
      from decks d
      where d.id = pairs.deck_id
        and d.owner_user_id = auth.uid()
    )
  );

create policy "pairs_select_authenticated_public"
  on pairs
  for select
  to authenticated
  using (
    exists (
      select 1
      from decks d
      where d.id = pairs.deck_id
        and d.visibility = 'public'
        and d.deleted_at is null
    )
    and deleted_at is null
  );

create policy "pairs_insert_authenticated"
  on pairs
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from decks d
      where d.id = pairs.deck_id
        and d.owner_user_id = auth.uid()
    )
  );

create policy "pairs_update_authenticated"
  on pairs
  for update
  to authenticated
  using (
    exists (
      select 1
      from decks d
      where d.id = pairs.deck_id
        and d.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from decks d
      where d.id = pairs.deck_id
        and d.owner_user_id = auth.uid()
    )
  );

create policy "pairs_delete_authenticated"
  on pairs
  for delete
  to authenticated
  using (
    exists (
      select 1
      from decks d
      where d.id = pairs.deck_id
        and d.owner_user_id = auth.uid()
    )
  );

comment on policy "pairs_select_anon" on pairs is 
  'Anonymous users can view pairs from public, active decks';
comment on policy "pairs_select_authenticated_owner" on pairs is 
  'Users can view pairs from their own decks';
comment on policy "pairs_select_authenticated_public" on pairs is 
  'Users can view pairs from public, active decks';
comment on policy "pairs_insert_authenticated" on pairs is 
  'Users can add pairs to their own decks';

-- ----------------------------------------------------------------------------
-- RLS: tags
-- ----------------------------------------------------------------------------
-- Policy: Globally readable, writable only by service role

alter table tags enable row level security;

-- anon and authenticated roles: read-only access
create policy "tags_select_anon"
  on tags
  for select
  to anon
  using (true);

create policy "tags_select_authenticated"
  on tags
  for select
  to authenticated
  using (true);

-- no insert/update/delete policies - service role only
create policy "tags_insert_anon"
  on tags
  for insert
  to anon
  with check (false);

create policy "tags_insert_authenticated"
  on tags
  for insert
  to authenticated
  with check (false);

create policy "tags_update_anon"
  on tags
  for update
  to anon
  using (false)
  with check (false);

create policy "tags_update_authenticated"
  on tags
  for update
  to authenticated
  using (false)
  with check (false);

create policy "tags_delete_anon"
  on tags
  for delete
  to anon
  using (false);

create policy "tags_delete_authenticated"
  on tags
  for delete
  to authenticated
  using (false);

comment on policy "tags_select_anon" on tags is 
  'Tags are globally readable by anonymous users';
comment on policy "tags_select_authenticated" on tags is 
  'Tags are globally readable by authenticated users';

-- ----------------------------------------------------------------------------
-- RLS: pair_tags
-- ----------------------------------------------------------------------------
-- Policy: Globally readable, writable only by service role

alter table pair_tags enable row level security;

-- anon and authenticated roles: read-only access
create policy "pair_tags_select_anon"
  on pair_tags
  for select
  to anon
  using (true);

create policy "pair_tags_select_authenticated"
  on pair_tags
  for select
  to authenticated
  using (true);

-- no insert/update/delete policies - service role only
create policy "pair_tags_insert_anon"
  on pair_tags
  for insert
  to anon
  with check (false);

create policy "pair_tags_insert_authenticated"
  on pair_tags
  for insert
  to authenticated
  with check (false);

create policy "pair_tags_update_anon"
  on pair_tags
  for update
  to anon
  using (false)
  with check (false);

create policy "pair_tags_update_authenticated"
  on pair_tags
  for update
  to authenticated
  using (false)
  with check (false);

create policy "pair_tags_delete_anon"
  on pair_tags
  for delete
  to anon
  using (false);

create policy "pair_tags_delete_authenticated"
  on pair_tags
  for delete
  to authenticated
  using (false);

comment on policy "pair_tags_select_anon" on pair_tags is 
  'Pair-tag relationships are globally readable by anonymous users';
comment on policy "pair_tags_select_authenticated" on pair_tags is 
  'Pair-tag relationships are globally readable by authenticated users';

-- ----------------------------------------------------------------------------
-- RLS: user_pair_state
-- ----------------------------------------------------------------------------
-- Policy: Users can only access their own learning state

alter table user_pair_state enable row level security;

-- anon role: no access to user state
create policy "user_pair_state_select_anon"
  on user_pair_state
  for select
  to anon
  using (false);

create policy "user_pair_state_insert_anon"
  on user_pair_state
  for insert
  to anon
  with check (false);

create policy "user_pair_state_update_anon"
  on user_pair_state
  for update
  to anon
  using (false)
  with check (false);

create policy "user_pair_state_delete_anon"
  on user_pair_state
  for delete
  to anon
  using (false);

-- authenticated role: full access to own state
create policy "user_pair_state_select_authenticated"
  on user_pair_state
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "user_pair_state_insert_authenticated"
  on user_pair_state
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "user_pair_state_update_authenticated"
  on user_pair_state
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "user_pair_state_delete_authenticated"
  on user_pair_state
  for delete
  to authenticated
  using (user_id = auth.uid());

comment on policy "user_pair_state_select_authenticated" on user_pair_state is 
  'Users can view their own learning state';
comment on policy "user_pair_state_insert_authenticated" on user_pair_state is 
  'Users can create their own learning state records';
comment on policy "user_pair_state_update_authenticated" on user_pair_state is 
  'Users can update their own learning state (e.g., after review)';

-- ----------------------------------------------------------------------------
-- RLS: deck_share_links
-- ----------------------------------------------------------------------------
-- Policy: Owner can manage, public access via RPC only

alter table deck_share_links enable row level security;

-- anon role: no direct access (use RPC get_deck_by_token)
create policy "deck_share_links_select_anon"
  on deck_share_links
  for select
  to anon
  using (false);

create policy "deck_share_links_insert_anon"
  on deck_share_links
  for insert
  to anon
  with check (false);

create policy "deck_share_links_update_anon"
  on deck_share_links
  for update
  to anon
  using (false)
  with check (false);

create policy "deck_share_links_delete_anon"
  on deck_share_links
  for delete
  to anon
  using (false);

-- authenticated role: manage share links for own decks
create policy "deck_share_links_select_authenticated"
  on deck_share_links
  for select
  to authenticated
  using (
    exists (
      select 1
      from decks d
      where d.id = deck_share_links.deck_id
        and d.owner_user_id = auth.uid()
    )
  );

create policy "deck_share_links_insert_authenticated"
  on deck_share_links
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from decks d
      where d.id = deck_share_links.deck_id
        and d.owner_user_id = auth.uid()
    )
  );

create policy "deck_share_links_update_authenticated"
  on deck_share_links
  for update
  to authenticated
  using (
    exists (
      select 1
      from decks d
      where d.id = deck_share_links.deck_id
        and d.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from decks d
      where d.id = deck_share_links.deck_id
        and d.owner_user_id = auth.uid()
    )
  );

create policy "deck_share_links_delete_authenticated"
  on deck_share_links
  for delete
  to authenticated
  using (
    exists (
      select 1
      from decks d
      where d.id = deck_share_links.deck_id
        and d.owner_user_id = auth.uid()
    )
  );

comment on policy "deck_share_links_select_authenticated" on deck_share_links is 
  'Deck owners can view their share links';
comment on policy "deck_share_links_insert_authenticated" on deck_share_links is 
  'Deck owners can create share links';
comment on policy "deck_share_links_update_authenticated" on deck_share_links is 
  'Deck owners can update share links (e.g., revoke)';

-- ============================================================================
-- Migration Complete
-- ============================================================================

