-- Allow anon role to read app_config (values are non-sensitive and needed at runtime)

create policy app_config_read_anon
  on public.app_config
  for select
  to anon
  using (true);

