-- RLS for the add-on catalogue (#7): companies read the active add-ons and
-- the room links in the booking flow; inactive add-ons and all writes stay
-- admin-only. The booking_addons line rows follow the booking's ownership
-- (tested in 110_rls_bookings.sql).

begin;
select plan(10);

-- Fixtures: one company, one room, one active and one inactive add-on,
-- both linked to the room.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111002', 'authenticated', 'authenticated', 'rituals@tsh.test', 'x', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111001', 'authenticated', 'authenticated', 'admin@tsh.test', 'x', now(), '{"app_role":"admin"}', '{}', now(), now());

insert into public.companies (company_id, company_auth_user_id, company_email, company_display_name) values
  ('22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111002', 'rituals@tsh.test', 'Rituals');

insert into public.rooms (room_id, room_name, room_capacity, room_hourly_price_ore) values
  ('44444444-4444-4444-4444-444444444001', 'Room of Power', 12, 800000);

insert into public.addons (addon_id, addon_name, addon_price_ore, addon_pricing_model, addon_is_active) values
  ('55555555-5555-5555-5555-555555555001', 'Lunch', 22500, 'per_participant', true),
  ('55555555-5555-5555-5555-555555555002', 'Retired add-on', 5000, 'fixed', false);

insert into public.room_addons (room_addon_room_id, room_addon_addon_id) values
  ('44444444-4444-4444-4444-444444444001', '55555555-5555-5555-5555-555555555001'),
  ('44444444-4444-4444-4444-444444444001', '55555555-5555-5555-5555-555555555002');

-- Company session (Rituals).
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111002","role":"authenticated"}';

select is(
  (select count(*) from public.addons where addon_id = '55555555-5555-5555-5555-555555555001'),
  1::bigint,
  'company reads an active add-on');
select is(
  (select count(*) from public.addons where addon_id = '55555555-5555-5555-5555-555555555002'),
  0::bigint,
  'company cannot read an inactive add-on');
select is((select count(*) from public.room_addons), 8::bigint,
  'company reads the room add-on links (2 fixture + 6 seed; the flow filters active ones)');
select throws_ok(
  'insert into public.addons (addon_name, addon_price_ore, addon_pricing_model) values (''X'', 1, ''fixed'')',
  '42501', null,
  'company cannot create add-ons');
select lives_ok(
  'update public.addons set addon_price_ore = 1 where addon_id = ''55555555-5555-5555-5555-555555555001''',
  'company add-on update is silently scoped to zero rows');
select is(
  (select addon_price_ore from public.addons where addon_id = '55555555-5555-5555-5555-555555555001'),
  22500,
  'the company''s add-on edit changed nothing');

-- Admin session: full management rights, active or not.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111001","role":"authenticated","app_role":"admin"}';

select is((select count(*) from public.addons), 6::bigint, 'admin reads inactive add-ons too (2 fixture + 4 seed)');
select lives_ok(
  'update public.addons set addon_price_ore = 23500 where addon_id = ''55555555-5555-5555-5555-555555555001''',
  'admin edits an add-on');
select lives_ok(
  'insert into public.addons (addon_name, addon_price_ore, addon_pricing_model) values (''Ekstra skærm'', 50000, ''fixed'')',
  'admin creates an add-on');
select lives_ok(
  'update public.addons set addon_is_active = false where addon_id = ''55555555-5555-5555-5555-555555555002''',
  'admin deactivates an add-on');

select * from finish();
rollback;
