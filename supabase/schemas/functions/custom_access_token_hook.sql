-- Custom Access Token Hook: copies app_role from raw_app_meta_data into the
-- JWT claims so RLS can read (auth.jwt() ->> 'app_role') (docs/agents/auth.md).
-- app_role is 'admin' or absent; it is written only by seed.sql (local) and
-- scripts/create-admin.ts (cloud).

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  app_role text;
begin
  select (u.raw_app_meta_data ->> 'app_role')
    into app_role
    from auth.users u
    where u.id = (event->>'user_id')::uuid;

  if app_role is not null then
    event := jsonb_set(
      event,
      '{claims,app_role}',
      to_jsonb(app_role)
    );
  end if;

  return event;
end;
$$;

grant execute
  on function public.custom_access_token_hook(jsonb)
  to supabase_auth_admin;

revoke execute
  on function public.custom_access_token_hook(jsonb)
  from authenticated, anon, public;
