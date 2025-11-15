-- ============================================================================
-- Migration: create pair_flags table for reporting incorrect pairs
-- Purpose : persist user-submitted flags with lightweight status tracking
-- Notes   :
--   * Stores reason text (max 500 chars) and pending/reviewed status
--   * Links to pairs (required), decks (for owner policies), and reporter profile
--   * Enables RLS with policies for authenticated reporters and deck owners
-- ============================================================================

-- create table to capture flags for vocabulary pairs
create table public.pair_flags (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  pair_id uuid not null references public.pairs (id) on delete cascade,
  flagged_by uuid references public.profiles (id) on delete set null,
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  flagged_at timestamptz not null default now()
);

comment on table public.pair_flags is 'User-submitted flags for vocabulary pairs (quality feedback).';
comment on column public.pair_flags.deck_id is 'Deck to which the flagged pair belongs (for ownership policies).';
comment on column public.pair_flags.reason is 'User-provided description explaining what is wrong with the pair.';
comment on column public.pair_flags.status is 'Simple workflow marker, defaults to pending for MVP.';

create index pair_flags_deck_id_idx on public.pair_flags (deck_id);
create index pair_flags_pair_id_idx on public.pair_flags (pair_id);
create index pair_flags_flagged_by_idx on public.pair_flags (flagged_by);
create unique index pair_flags_unique_pair_user_idx on public.pair_flags (pair_id, flagged_by) where flagged_by is not null;

-- enable row level security and policies
alter table public.pair_flags enable row level security;

-- deck owners or reporters can read flags for their decks
create policy "deck owners or reporters can view flags" on public.pair_flags
for select
to authenticated
using (
  (flagged_by is not null and flagged_by = auth.uid())
  or exists (
    select 1
    from public.decks d
    where d.id = pair_flags.deck_id
      and d.owner_user_id = auth.uid()
  )
);

-- any authenticated user can flag a pair (API enforces visibility rules)
create policy "authenticated users can flag pairs" on public.pair_flags
for insert
to authenticated
with check (auth.uid() is not null);
