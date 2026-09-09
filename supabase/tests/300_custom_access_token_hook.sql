-- Custom Access Token Hook (#25): copies app_role from
-- auth.users.raw_app_meta_data into the JWT claims. Calling the function
-- directly with the jsonb event GoTrue sends; function_privs_are checks the
-- grants the vendor doc requires (docs/vendor/supabase/auth-custom-access-token-hook.md).

begin;
select plan(6);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '55555555-5555-5555-5555-555555555001', 'authenticated', 'authenticated', 'hook-admin@tsh.test', 'x', now(), '{"app_role":"admin"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '55555555-5555-5555-5555-555555555002', 'authenticated', 'authenticated', 'hook-company@tsh.test', 'x', now(), '{}', '{}', now(), now());

select function_privs_are(
  'public', 'custom_access_token_hook', array['jsonb'],
  'supabase_auth_admin', array['EXECUTE'],
  'auth service may execute the hook');
select function_privs_are(
  'public', 'custom_access_token_hook', array['jsonb'],
  'authenticated', '{}'::name[],
  'authenticated may not execute the hook');
select function_privs_are(
  'public', 'custom_access_token_hook', array['jsonb'],
  'anon', '{}'::name[],
  'anon may not execute the hook');

select is(
  public.custom_access_token_hook(
    jsonb_build_object(
      'user_id', '55555555-5555-5555-5555-555555555001',
      'claims', '{"sub":"55555555-5555-5555-5555-555555555001","role":"authenticated"}'::jsonb,
      'authentication_method', 'password'
    )
  ) -> 'claims',
  '{"sub":"55555555-5555-5555-5555-555555555001","role":"authenticated","app_role":"admin"}'::jsonb,
  'hook adds app_role without clobbering existing claims');

select is(
  public.custom_access_token_hook(
    jsonb_build_object(
      'user_id', '55555555-5555-5555-5555-555555555002',
      'claims', '{"sub":"55555555-5555-5555-5555-555555555002","role":"authenticated"}'::jsonb,
      'authentication_method', 'password'
    )
  ) -> 'claims' ? 'app_role',
  false,
  'hook leaves claims untouched without app_role');

select is(
  public.custom_access_token_hook(
    jsonb_build_object(
      'user_id', '00000000-0000-0000-0000-0000000000ff',
      'claims', '{"sub":"00000000-0000-0000-0000-0000000000ff","role":"authenticated"}'::jsonb,
      'authentication_method', 'password'
    )
  ) -> 'claims',
  '{"sub":"00000000-0000-0000-0000-0000000000ff","role":"authenticated"}'::jsonb,
  'unknown user passes through with claims untouched');

select * from finish();
rollback;
