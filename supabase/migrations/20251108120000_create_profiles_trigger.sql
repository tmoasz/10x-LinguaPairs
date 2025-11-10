-- ============================================================================
-- Migration: Ensure profiles row exists for every auth user
-- ============================================================================
-- Purpose:
--   - Automatically create a profile entry whenever a new Supabase auth user
--     is registered.
--   - Backfill existing auth users that might be missing profile rows to
--     satisfy FK constraints (e.g., decks.owner_user_id).
--
-- Notes:
--   - Username defaults to the user's email for now so that downstream flows
--     (deck creation) work immediately after signup.
--   - Function uses SECURITY DEFINER so that inserts work even when invoked
--     from auth schema triggers.
-- ============================================================================

set check_function_bodies = off;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_username citext;
begin
  new_username := coalesce(
    new.email,
    new.raw_user_meta_data->>'username',
    new.phone,
    'user-' || left(new.id::text, 8)
  )::citext;

  insert into public.profiles (id, username)
  values (new.id, new_username)
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_auth_user is
  'Maintains 1:1 profiles row for each auth user.';

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

-- Backfill any missing profiles (in case existing users registered before trigger)
insert into public.profiles (id, username)
select
  u.id,
  coalesce(
    u.email,
    u.raw_user_meta_data->>'username',
    u.phone,
    'user-' || left(u.id::text, 8)
  )::citext as username
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
)
on conflict (id) do nothing;
