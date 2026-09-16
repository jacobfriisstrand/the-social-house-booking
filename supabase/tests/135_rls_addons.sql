-- RLS for the add-on catalogue (#4): every logged-in company reads add-ons
-- and the room links (the booking dialog lists them with prices); admin
-- manages both. Anonymous sessions see nothing.

begin;
select plan(9);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111001', 'authenticated', 'authenticated', 'admin@tsh.test', 'x', now(), '{"app_role":"admin"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111002', 'authenticated', 'authenticated', 'rituals@tsh.test', 'x', now(), '{}', '{}', now(), now());

insert into public.companies (company_id, company_auth_user_id, company_email, company_display_name) values
  ('22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111002', 'rituals@tsh.test', 'Rituals');

insert into public.rooms (room_id, room_name, room_capacity, room_hourly_price_ore) values
  ('44444444-4444-4444-4444-444444444001', 'Room of Power', 12, 80000);

insert into public.addons (addon_id, addon_name, addon_price_ore, addon_pricing_model) values
  ('55555555-5555-5555-5555-555555555001', 'Ekstra skærm', 50000, 'fixed'),
  ('55555555-5555-5555-5555-555555555002', 'Frokost', 22500, 'per_participant');

insert into public.room_addons (room_addon_room_id, room_addon_addon_id) values
  ('44444444-4444-4444-4444-444444444001', '55555555-5555-5555-5555-555555555001');

-- Company session (Rituals): reads, no writes.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111002","role":"authenticated"}';

select is(
  (select count(*) from public.addons where addon_id in ('55555555-5555-5555-5555-555555555001', '55555555-5555-5555-5555-555555555002')),
  2::bigint, 'company reads the add-on catalogue');
select is(
  (select count(*) from public.room_addons where room_addon_room_id = '44444444-4444-4444-4444-444444444001'),
  1::bigint, 'company reads which add-ons a room offers');
select throws_ok(
  'insert into public.addons (addon_name, addon_price_ore, addon_pricing_model) values (''Kaffe'', 1000, ''fixed'')',
  '42501', null,
  'company cannot create an add-on');
select lives_ok(
  'update public.addons set addon_price_ore = 1 where addon_id = ''55555555-5555-5555-5555-555555555001''',
  'company add-on update is silently scoped to zero rows');
select is(
  (select addon_price_ore from public.addons where addon_id = '55555555-5555-5555-5555-555555555001'),
  50000, 'company could not change an add-on price');
select throws_ok(
  'insert into public.room_addons (room_addon_room_id, room_addon_addon_id) values (''44444444-4444-4444-4444-444444444001'', ''55555555-5555-5555-5555-555555555002'')',
  '42501', null,
  'company cannot link an add-on to a room');

-- Anonymous session: nothing.
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is((select count(*) from public.addons), 0::bigint, 'anon reads no add-ons');

-- Admin session: full management.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111001","role":"authenticated","app_role":"admin"}';
select lives_ok(
  'update public.addons set addon_price_ore = 60000 where addon_id = ''55555555-5555-5555-5555-555555555001''',
  'admin edits an add-on');
select is(
  (select addon_price_ore from public.addons where addon_id = '55555555-5555-5555-5555-555555555001'),
  60000, 'admin change is visible');

select * from finish();
rollback;
