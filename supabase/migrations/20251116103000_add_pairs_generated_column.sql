-- ============================================================================
-- Migration: Add pairs_generated column to generations
-- ============================================================================
-- Purpose:
--   Track the actual number of pairs inserted for each generation job so that
--   API responses and telemetry align with persisted data.
--
-- Notes:
--   - Column defaults to 0 to keep historical rows valid.
--   - Marked NOT NULL for simpler aggregation and analytics.
-- ============================================================================

alter table public.generations
  add column if not exists pairs_generated integer not null default 0;

comment on column public.generations.pairs_generated is
  'Number of vocabulary pairs actually generated for this job';

