-- Migration: Update allowed pair counts (10, 50)
-- Purpose: reflect new base generation size (50 pairs) while keeping extend at 10

alter table public.generations
  drop constraint if exists generations_pairs_requested_check;

alter table public.generations
  add constraint generations_pairs_requested_check
  check (pairs_requested in (10, 50));
