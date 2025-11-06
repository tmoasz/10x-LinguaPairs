-- =============================================================================
-- Migration: Create pair_generation_errors table for deck pair generation errors
-- =============================================================================
-- Purpose:
--   Store detailed logs of errors that occur during generation of word pairs
--   for a specific deck. Supports observability, troubleshooting, and cost/time
--   tracking, aligned with PRD telemetry (prompt SHA, duration, cache, cost).
--
-- Affected Objects:
--   - New table: pair_generation_errors
--   - Indexes for common queries
--   - Row Level Security (RLS) policies
--
-- Notes:
--   - Table is append-only (no update/delete by clients)
--   - Access only for admins/service role at DB level (MVP)
--   - No public RLS access; inserts performed internally by backend
-- =============================================================================

-- create table
create table pair_generation_errors (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references decks(id) on delete cascade,
  attempt smallint not null default 1 check (attempt >= 1),

  -- generation context
  provider text, -- e.g. openai, anthropic, openrouter
  model text,    -- e.g. gpt-4o-mini
  prompt_sha256 text, -- hash of full prompt/context per PRD
  request_params jsonb not null default '{}'::jsonb, -- topic_id, filters, register, etc.

  -- error details
  error_code text not null,          -- machine-readable class, e.g. ELLM_TIMEOUT
  error_message text not null,       -- human-readable message
  error_details jsonb,               -- raw provider error, stack, validation issues
  http_status integer,
  retryable boolean not null default false,

  -- timing/cost/telemetry
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  cost_usd numeric(10,4) check (cost_usd is null or cost_usd >= 0),
  cache_hit boolean,

  created_at timestamptz not null default now()
);

comment on table pair_generation_errors is 'Error logs for word pair generation per deck (append-only)';
comment on column pair_generation_errors.deck_id is 'FK to decks.id that this generation attempt belonged to';
comment on column pair_generation_errors.attempt is 'Retry attempt number starting from 1';
comment on column pair_generation_errors.provider is 'Model provider identifier (e.g., openai)';
comment on column pair_generation_errors.model is 'Model name/version used for generation';
comment on column pair_generation_errors.prompt_sha256 is 'SHA-256 of full prompt/context (do not store raw prompt)';
comment on column pair_generation_errors.request_params is 'JSON with generation input parameters (topic, filters, register)';
comment on column pair_generation_errors.error_code is 'Machine-readable error class (e.g., validation_error, timeout)';
comment on column pair_generation_errors.error_message is 'Human-readable error message for UI/support';
comment on column pair_generation_errors.error_details is 'Raw provider payload or validation failure details';
comment on column pair_generation_errors.http_status is 'HTTP status when applicable';
comment on column pair_generation_errors.retryable is 'Whether the error is safe to retry automatically';
comment on column pair_generation_errors.duration_ms is 'End-to-end generation time in milliseconds';
comment on column pair_generation_errors.cost_usd is 'Approximate model/API cost in USD for the failed attempt';
comment on column pair_generation_errors.cache_hit is 'Whether a backend cache was hit earlier in the flow';

-- indexes
create index idx_pair_gen_err_deck_created on pair_generation_errors(deck_id, created_at desc);
create index idx_pair_gen_err_code on pair_generation_errors(error_code);
create index idx_pair_gen_err_prompt_sha on pair_generation_errors(prompt_sha256);

comment on index idx_pair_gen_err_deck_created is 'List latest errors for a given deck';
comment on index idx_pair_gen_err_code is 'Filter by machine-readable error code';
comment on index idx_pair_gen_err_prompt_sha is 'Trace errors by prompt/context hash';

-- row level security
alter table pair_generation_errors enable row level security;

-- anon role: no access at all
create policy "pair_gen_err_select_anon"
  on pair_generation_errors
  for select
  to anon
  using (false);

create policy "pair_gen_err_insert_anon"
  on pair_generation_errors
  for insert
  to anon
  with check (false);

create policy "pair_gen_err_update_anon"
  on pair_generation_errors
  for update
  to anon
  using (false)
  with check (false);

create policy "pair_gen_err_delete_anon"
  on pair_generation_errors
  for delete
  to anon
  using (false);

-- authenticated role: no access (service role bypasses RLS)
create policy "pair_gen_err_select_authenticated"
  on pair_generation_errors
  for select
  to authenticated
  using (false);

create policy "pair_gen_err_insert_authenticated"
  on pair_generation_errors
  for insert
  to authenticated
  with check (false);

create policy "pair_gen_err_update_authenticated"
  on pair_generation_errors
  for update
  to authenticated
  using (false)
  with check (false);

create policy "pair_gen_err_delete_authenticated"
  on pair_generation_errors
  for delete
  to authenticated
  using (false);

-- =============================================================================
-- Migration Complete
-- =============================================================================
