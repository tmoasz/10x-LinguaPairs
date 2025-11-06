-- ============================================================================
-- Migration: Create generations table
-- ============================================================================
-- Purpose: Create table to track AI-powered vocabulary pair generation jobs
-- 
-- Affected Objects:
--   - New table: generations
--   - RLS policies for generations table
--   - Indexes for performance and uniqueness constraints
--
-- Notes:
--   - Enforces one active (pending/running) generation per user
--   - Enforces one active generation per deck (for UI state tracking)
--   - Quota tracking: only 'succeeded' status counts toward daily limit
--   - Worker (Supabase Edge Function/cron) processes 'pending' jobs
--   - Supports three generation types: topic, text, extend
-- ============================================================================

-- ============================================================================
-- SECTION 1: Create generations table
-- ============================================================================

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  deck_id uuid not null references public.decks(id) on delete cascade,
  
  -- Generation type and input parameters
  type text not null check (type in ('topic','text','extend')),
  topic_id text,
  input_text text check (char_length(input_text) <= 5000),
  
  -- Content generation parameters
  content_type text not null default 'auto' check (content_type in ('auto','words','phrases','mini-phrases')),
  register text not null default 'neutral' check (register in ('neutral','informal','formal')),
  pairs_requested integer not null check (pairs_requested in (10, 30)),
  
  -- Job lifecycle tracking
  status text not null check (status in ('pending','running','succeeded','failed')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  
  -- Reference to base generation for "extend" type (future "+10" feature)
  base_generation_id uuid references public.generations(id) on delete set null
);

comment on table public.generations is 
  'Tracks AI-powered vocabulary pair generation jobs and their lifecycle';

comment on column public.generations.user_id is 
  'User who requested the generation (FK to profiles.id)';

comment on column public.generations.deck_id is 
  'Target deck where generated pairs will be inserted (FK to decks.id)';

comment on column public.generations.type is 
  'Generation type: topic (from predefined topic), text (from custom description), extend (add 10 more pairs)';

comment on column public.generations.topic_id is 
  'Predefined topic ID (only for type=topic), e.g., travel, business, food';

comment on column public.generations.input_text is 
  'Custom text description (only for type=text), max 5000 characters';

comment on column public.generations.content_type is 
  'Type of content to generate: auto (60% words, 30% phrases, 10% mini-phrases), words, phrases, or mini-phrases';

comment on column public.generations.register is 
  'Formality level: neutral, informal, or formal';

comment on column public.generations.pairs_requested is 
  'Number of pairs to generate: 10 (for extend) or 30 (for topic/text)';

comment on column public.generations.status is 
  'Job status: pending (awaiting worker), running (worker processing), succeeded (completed), failed (error)';

comment on column public.generations.created_at is 
  'Timestamp when generation job was created';

comment on column public.generations.started_at is 
  'Timestamp when worker started processing (set when status changes to running)';

comment on column public.generations.finished_at is 
  'Timestamp when job completed (succeeded or failed)';

comment on column public.generations.base_generation_id is 
  'Reference to original generation (for extend type to reuse context)';

-- ============================================================================
-- SECTION 2: Create indexes for performance
-- ============================================================================

-- Index for listing generations by deck (UI state queries)
create index if not exists idx_generations_deck_created_at 
  on public.generations (deck_id, created_at desc);

comment on index idx_generations_deck_created_at is 
  'Optimize queries for active generation per deck, ordered by most recent first';

-- Index for listing generations by user (quota tracking)
create index if not exists idx_generations_user_created_at 
  on public.generations (user_id, created_at desc);

comment on index idx_generations_user_created_at is 
  'Optimize quota queries: count succeeded generations per user per day';

-- Index for worker to select pending jobs
create index if not exists idx_generations_status_created_at 
  on public.generations (status, created_at);

comment on index idx_generations_status_created_at is 
  'Optimize worker queries: select pending jobs ordered by creation time';

-- ============================================================================
-- SECTION 3: Create unique constraints for business rules
-- ============================================================================

-- Enforce one active (pending/running) generation per user
-- Prevents concurrent generation requests and simplifies quota management
create unique index if not exists uniq_generations_user_active
  on public.generations (user_id)
  where status in ('pending','running');

comment on index uniq_generations_user_active is 
  'Enforces business rule: one active generation per user at a time (prevents concurrent requests)';

-- Enforce one active generation per deck (for UI state tracking)
-- Allows UI to show "generating..." indicator per deck
create unique index if not exists uniq_generations_deck_active
  on public.generations (deck_id)
  where status in ('pending','running');

comment on index uniq_generations_deck_active is 
  'Enforces business rule: one active generation per deck (simplifies UI state management)';

-- ============================================================================
-- SECTION 4: Row Level Security (RLS) policies
-- ============================================================================

alter table public.generations enable row level security;

-- ============================================================================
-- SECTION 4.1: Anonymous role policies (no access)
-- ============================================================================

-- Anonymous users cannot view generations
create policy "generations_select_anon"
  on public.generations
  for select
  to anon
  using (false);

comment on policy "generations_select_anon" on public.generations is 
  'Anonymous users cannot view any generation jobs (authentication required)';

-- Anonymous users cannot create generations
create policy "generations_insert_anon"
  on public.generations
  for insert
  to anon
  with check (false);

comment on policy "generations_insert_anon" on public.generations is 
  'Anonymous users cannot create generation jobs (authentication required)';

-- Anonymous users cannot update generations
create policy "generations_update_anon"
  on public.generations
  for update
  to anon
  using (false)
  with check (false);

comment on policy "generations_update_anon" on public.generations is 
  'Anonymous users cannot update generation jobs (authentication required)';

-- Anonymous users cannot delete generations
create policy "generations_delete_anon"
  on public.generations
  for delete
  to anon
  using (false);

comment on policy "generations_delete_anon" on public.generations is 
  'Anonymous users cannot delete generation jobs (authentication required)';

-- ============================================================================
-- SECTION 4.2: Authenticated role policies (owner access only)
-- ============================================================================

-- Authenticated users can view their own generations
create policy "generations_select_authenticated"
  on public.generations
  for select
  to authenticated
  using (user_id = auth.uid());

comment on policy "generations_select_authenticated" on public.generations is 
  'Authenticated users can view only their own generation jobs (user_id = auth.uid())';

-- Authenticated users can create generations for themselves
create policy "generations_insert_authenticated"
  on public.generations
  for insert
  to authenticated
  with check (user_id = auth.uid());

comment on policy "generations_insert_authenticated" on public.generations is 
  'Authenticated users can create generation jobs only for themselves (user_id = auth.uid())';

-- Authenticated users can update their own generations
-- Note: Workers use service role to bypass RLS when updating status
create policy "generations_update_authenticated"
  on public.generations
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

comment on policy "generations_update_authenticated" on public.generations is 
  'Authenticated users can update only their own generation jobs (user_id = auth.uid()). Workers use service role to bypass RLS';

-- Authenticated users cannot delete generations (workers may use service role if needed)
create policy "generations_delete_authenticated"
  on public.generations
  for delete
  to authenticated
  using (false);

comment on policy "generations_delete_authenticated" on public.generations is 
  'Authenticated users cannot delete generation jobs (soft deletes not needed, workers may use service role if cleanup required)';

-- ============================================================================
-- Migration Complete
-- ============================================================================

