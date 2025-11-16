-- Simple migration: database-backed runtime configuration (non-sensitive values)
-- Keep it minimal (KISS) so Supabase CLI can generate/rollback without surprises.

-- 1) Table definition --------------------------------------------------------
create table public.app_config (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

comment on table public.app_config is 'Runtime configuration (non-sensitive only)';

-- 2) Row Level Security ------------------------------------------------------
alter table public.app_config enable row level security;

-- Authenticated users need read access at runtime.
create policy app_config_read_authenticated
  on public.app_config
  for select
  to authenticated
  using (true);

-- Service role (Supabase dashboard / admin scripts) can manage values.
create policy app_config_manage_service_role
  on public.app_config
  for all
  to service_role
  using (true)
  with check (true);

-- 3) Optional helper for upserts (keeps statements short) --------------------
create or replace function public.upsert_app_config(p_key text, p_value text, p_description text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_config (key, value, description)
  values (p_key, p_value, p_description)
  on conflict (key) do update
    set value = excluded.value,
        description = coalesce(excluded.description, app_config.description),
        updated_at = now();
end;
$$;

grant execute on function public.upsert_app_config(text, text, text) to service_role;

