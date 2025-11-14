-- Migration: Update allowed pair counts (10, 50)
-- Purpose: reflect new base generation size (50 pairs) while keeping extend at 10

-- Step 1: Drop the old constraint
alter table public.generations
  drop constraint if exists generations_pairs_requested_check;

-- Step 2: Update existing rows with old value (30) to new base value (50)
-- Old base generation was 30, new is 50. Extend was already 10, so no change needed.
update public.generations
  set pairs_requested = 50
  where pairs_requested = 30;

-- Step 3: Add the new constraint with updated allowed values
alter table public.generations
  add constraint generations_pairs_requested_check
  check (pairs_requested in (10, 50));
