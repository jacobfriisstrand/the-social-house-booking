-- RLS for site_images (#89): the public layout reads the hero slot with an
-- anonymous session, any authenticated user reads along, and only the admin
-- claim writes. There is deliberately no delete policy: the slot's row is
-- replaced by upsert, never removed.

begin;
select plan(8);

-- Fixtures: one admin, one member company user.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111001', 'authenticated', 'authenticated', 'admin@tsh.test', 'x', now(), '{"app_role":"admin"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111002', 'authenticated', 'authenticated', 'rituals@tsh.test', 'x', now(), '{}', '{}', now(), now());

-- Anonymous session (the public layout's visitor).
set local role anon;

select is(
  (select site_image_path from public.site_images where site_image_slot = 'hero'),
  null::text,
  'anon reads no hero slot before any admin save');

-- Admin session uploads the hero.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111001","role":"authenticated","app_role":"admin"}';

select lives_ok(
  'insert into public.site_images (site_image_slot, site_image_path) values (''hero'', ''hero/0123456789abcdef0123456789abcdef.jpg'')',
  'admin inserts the hero slot');

-- Anonymous reads the saved path but cannot write.
set local role anon;

select is(
  (select site_image_path from public.site_images where site_image_slot = 'hero'),
  'hero/0123456789abcdef0123456789abcdef.jpg',
  'anon reads the saved hero path');
select throws_ok(
  'insert into public.site_images (site_image_slot, site_image_path) values (''hero'', ''hero/stolen.jpg'')',
  '42501', null,
  'anon cannot insert');
select lives_ok(
  'update public.site_images set site_image_path = ''hero/hax.jpg''',
  'anon update is silently scoped to zero rows by RLS');

-- Member session: reads along, writes nothing.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111002","role":"authenticated"}';

select lives_ok(
  'update public.site_images set site_image_path = ''hero/hax.jpg''',
  'member update is silently scoped to zero rows by RLS');

-- Admin replaces the slot's path (the settings form's save).
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111001","role":"authenticated","app_role":"admin"}';

select lives_ok(
  'update public.site_images set site_image_path = ''hero/ffffffffffffffffffffffffffffffff.png'' where site_image_slot = ''hero''',
  'admin replaces the hero slot');
select is(
  (select site_image_path from public.site_images where site_image_slot = 'hero'),
  'hero/ffffffffffffffffffffffffffffffff.png',
  'the replacement is visible to the next read');

select * from finish();
rollback;
