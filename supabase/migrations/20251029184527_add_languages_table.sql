-- ============================================================================
-- Migration: Add languages table and update decks foreign keys
-- ============================================================================
-- Purpose: Replace text-based language codes with foreign key references to languages table
-- 
-- Affected Objects:
--   - New table: languages
--   - Modified table: decks (lang_a, lang_b now FK to languages)
--   - Updated function: prevent_deck_lang_change()
--   - RLS policies for languages table
--
-- Notes:
--   - Languages table is centrally managed, read-only for users
--   - Supports both base codes (pl, en) and regional variants (en-US)
--   - Seed data includes: PL, EN (en-US), DE, IT, ES, CS
-- ============================================================================

-- ============================================================================
-- SECTION 1: Create languages table
-- ============================================================================

create table languages (
  id uuid primary key default gen_random_uuid(),
  code citext not null unique check (code ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  name text not null,
  name_native text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  flag_emoji text,
  created_at timestamptz not null default now()
);

comment on table languages is 'Supported languages dictionary - centrally managed';
comment on column languages.code is 'ISO 639-1 language code with optional region (e.g., pl, en, en-US)';
comment on column languages.name is 'Language name in English';
comment on column languages.name_native is 'Language name in native language';
comment on column languages.is_active is 'Whether this language is available for selection';
comment on column languages.sort_order is 'Sort order for UI display';
comment on column languages.flag_emoji is 'Optional flag emoji for UI display';

-- Index for active languages lookup
create index idx_languages_active on languages(is_active, sort_order) where is_active = true;

comment on index idx_languages_active is 'Optimize listing active languages ordered by sort_order';

-- ============================================================================
-- SECTION 2: Insert seed data
-- ============================================================================

-- Polish
insert into languages (code, name, name_native, is_active, sort_order, flag_emoji) values
  ('pl', 'Polish', 'Polski', true, 1, '🇵🇱');

-- English (base) and English US
insert into languages (code, name, name_native, is_active, sort_order, flag_emoji) values
  ('en', 'English', 'English', true, 2, '🇬🇧'),
  ('en-US', 'English (US)', 'English (US)', true, 3, '🇺🇸');

-- German
insert into languages (code, name, name_native, is_active, sort_order, flag_emoji) values
  ('de', 'German', 'Deutsch', true, 4, '🇩🇪');

-- Italian
insert into languages (code, name, name_native, is_active, sort_order, flag_emoji) values
  ('it', 'Italian', 'Italiano', true, 5, '🇮🇹');

-- Spanish
insert into languages (code, name, name_native, is_active, sort_order, flag_emoji) values
  ('es', 'Spanish', 'Español', true, 6, '🇪🇸');

-- Czech
insert into languages (code, name, name_native, is_active, sort_order, flag_emoji) values
  ('cs', 'Czech', 'Čeština', true, 7, '🇨🇿');

-- ============================================================================
-- SECTION 3: Migrate existing decks data (if any)
-- ============================================================================
-- Note: This assumes existing decks use valid language codes that match seed data
-- If there are decks with codes not in languages table, this will fail
-- In that case, you would need to:
--   1. Insert missing languages first, or
--   2. Update decks to use valid codes, or
--   3. Create a temporary mapping table

-- Create temporary columns for FK migration
alter table decks 
  add column lang_a_id uuid,
  add column lang_b_id uuid;

-- Migrate existing data: map text codes to language IDs
update decks d
set 
  lang_a_id = (select id from languages l where l.code = d.lang_a limit 1),
  lang_b_id = (select id from languages l where l.code = d.lang_b limit 1)
where deleted_at is null;

-- Verify all decks have valid language mappings
-- This will fail if any deck has a language code not in languages table
do $$
declare
  invalid_count integer;
begin
  select count(*)
  into invalid_count
  from decks
  where deleted_at is null
    and (lang_a_id is null or lang_b_id is null);
  
  if invalid_count > 0 then
    raise exception 'Migration failed: % decks have invalid language codes. Please ensure all language codes exist in languages table.', invalid_count;
  end if;
end $$;

-- ============================================================================
-- SECTION 4: Drop old columns and constraints, add new FK columns
-- ============================================================================

-- Drop the check constraint (will be replaced by FK)
alter table decks drop constraint if exists decks_different_languages;

-- Drop old columns
alter table decks drop column lang_a;
alter table decks drop column lang_b;

-- Rename new columns to final names
alter table decks rename column lang_a_id to lang_a;
alter table decks rename column lang_b_id to lang_b;

-- Make columns NOT NULL (they should already be populated)
alter table decks alter column lang_a set not null;
alter table decks alter column lang_b set not null;

-- Add foreign key constraints
alter table decks
  add constraint fk_decks_lang_a
  foreign key (lang_a)
  references languages(id)
  on delete restrict;

alter table decks
  add constraint fk_decks_lang_b
  foreign key (lang_b)
  references languages(id)
  on delete restrict;

-- Add check constraint: languages must be different
alter table decks
  add constraint decks_different_languages
  check (lang_a <> lang_b);

comment on column decks.lang_a is 'Source language (FK to languages.id)';
comment on column decks.lang_b is 'Target language (FK to languages.id)';

-- ============================================================================
-- SECTION 5: Update trigger function for language change prevention
-- ============================================================================
-- The trigger function needs to be updated to work with UUIDs instead of text

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
  'Prevent language changes on decks that contain pairs (updated for UUID FK)';

-- ============================================================================
-- SECTION 6: Row Level Security (RLS) for languages
-- ============================================================================

alter table languages enable row level security;

-- anon role: read-only access
create policy "languages_select_anon"
  on languages
  for select
  to anon
  using (is_active = true);

create policy "languages_insert_anon"
  on languages
  for insert
  to anon
  with check (false);

create policy "languages_update_anon"
  on languages
  for update
  to anon
  using (false)
  with check (false);

create policy "languages_delete_anon"
  on languages
  for delete
  to anon
  using (false);

-- authenticated role: read-only access
create policy "languages_select_authenticated"
  on languages
  for select
  to authenticated
  using (is_active = true);

create policy "languages_insert_authenticated"
  on languages
  for insert
  to authenticated
  with check (false);

create policy "languages_update_authenticated"
  on languages
  for update
  to authenticated
  using (false)
  with check (false);

create policy "languages_delete_authenticated"
  on languages
  for delete
  to authenticated
  using (false);

comment on policy "languages_select_anon" on languages is 
  'Anonymous users can view active languages';
comment on policy "languages_select_authenticated" on languages is 
  'Authenticated users can view active languages (read-only)';

-- ============================================================================
-- Migration Complete
-- ============================================================================

