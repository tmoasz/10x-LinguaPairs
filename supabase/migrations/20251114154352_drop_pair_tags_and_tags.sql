-- Migration: Drop legacy tag tables (tags, pair_tags)
-- Purpose: Remove unused tagging infrastructure blocking MVP scope.
-- Notes:
--   * pair_tags must be dropped before tags due to the foreign key.
--   * This migration is destructive; data from both tables will be permanently removed.
--   * Dependent indexes, constraints, and RLS policies are automatically removed via CASCADE.

begin;

-- Drop many-to-many join table first to avoid foreign-key violations.
drop table if exists pair_tags cascade;

-- Drop the root tags table now that no relations depend on it.
drop table if exists tags cascade;

commit;
