-- ============================================================================
-- Migration: create challenge_demo_results table
-- Purpose : persist challenge outcomes for the homepage demo (anonymous users)
-- ============================================================================

create table public.challenge_demo_results (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null, -- Generated client-side to track the same browser session
  guest_name text not null,
  total_time_ms integer not null check (total_time_ms >= 0),
  incorrect smallint not null default 0 check (incorrect >= 0),
  created_at timestamptz not null default now()
);

comment on table public.challenge_demo_results is 'Stored outcomes for Homepage Challenge Demo (anonymous).';

create index challenge_demo_results_perf_idx 
  on public.challenge_demo_results (total_time_ms, incorrect, created_at);

alter table public.challenge_demo_results enable row level security;

-- Allow anyone (including anon) to insert and select
-- In a real prod env, we might want to rate limit or captcha this, 
-- but for this demo feature, open access is acceptable.
create policy "Allow public insert" 
  on public.challenge_demo_results 
  for insert 
  with check (true);

create policy "Allow public select" 
  on public.challenge_demo_results 
  for select 
  using (true);

