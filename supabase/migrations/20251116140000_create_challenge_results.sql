-- ============================================================================
-- Migration: create challenge_results table for Challenge mode leaderboard
-- Purpose : persist user challenge outcomes with timing + error stats
-- Notes   :
--   * Tracks per-deck results with total time + incorrect attempts
--   * round_times_ms stores optional lap data for auditing/perf tuning
--   * RLS allows inserts by the player and reads for viewers of the deck
-- ============================================================================

create table public.challenge_results (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  total_time_ms integer not null check (total_time_ms >= 0),
  correct smallint not null default 0 check (correct between 0 and 50),
  incorrect smallint not null default 0 check (incorrect between 0 and 50),
  version text not null default 'challenge_v1',
  round_times_ms jsonb,
  created_at timestamptz not null default now()
);

comment on table public.challenge_results is 'Stored outcomes for Challenge mode runs (speed + accuracy).';
comment on column public.challenge_results.deck_id is 'Deck the Challenge run belongs to.';
comment on column public.challenge_results.user_id is 'Player who completed the Challenge.';
comment on column public.challenge_results.total_time_ms is 'Total stopwatch time in milliseconds.';
comment on column public.challenge_results.round_times_ms is 'Optional lap timings per round stored as JSON array.';

create index challenge_results_deck_time_idx on public.challenge_results (deck_id, total_time_ms, incorrect, created_at);
create index challenge_results_user_idx on public.challenge_results (user_id, deck_id, created_at desc);

alter table public.challenge_results enable row level security;

-- Allow authenticated users to view results if they can view the deck or own the result
create policy "challenge results readable when deck is viewable" on public.challenge_results
for select
to authenticated
using (
  (user_id = auth.uid())
  or exists (
    select 1
    from public.decks d
    where d.id = challenge_results.deck_id
      and (
        d.owner_user_id = auth.uid()
        or d.visibility in ('public', 'unlisted')
      )
  )
);

-- Allow authenticated users to insert their own result for decks they can view
create policy "users can store their own challenge results" on public.challenge_results
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.decks d
    where d.id = challenge_results.deck_id
      and (
        d.owner_user_id = auth.uid()
        or d.visibility in ('public', 'unlisted')
      )
  )
);

