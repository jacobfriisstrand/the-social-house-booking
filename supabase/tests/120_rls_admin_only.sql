-- RLS tests for the admin-default tables (#19): rooms and room_images are
-- member-readable (booking search), everything else here is admin-only
-- until its feature ticket specifies otherwise.

begin;
select plan(22);

-- Fixtures: one admin, one company, two rooms (one image), one add-on with
-- a room link, one house event with a room link, one verification code.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111001', 'authenticated', 'authenticated', 'admin@tsh.test', 'x', now(), '{"app_role":"admin"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111002', 'authenticated', 'authenticated', 'rituals@tsh.test', 'x', now(), '{}', '{}', now(), now());

insert into public.companies (company_id, company_auth_user_id, company_email, company_display_name) values
  ('22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111002', 'rituals@tsh.test', 'Rituals');

insert into public.rooms (room_id, room_name, room_capacity, room_price_ore, room_opens_at, room_closes_at, room_is_active) values
  ('44444444-4444-4444-4444-444444444001', 'Room of Power', 12, 800000, '08:00', '18:00', true),
  ('44444444-4444-4444-4444-444444444002', 'Room of Art', 6, 400000, '09:00', '17:00', false);

insert into public.room_images (room_image_id, room_image_room_id, room_image_url) values
  ('88888888-8888-8888-8888-888888888001', '44444444-4444-4444-4444-444444444001', 'https://example.test/power.jpg');

insert into public.addons (addon_id, addon_name, addon_price_ore, addon_pricing_model) values
  ('55555555-5555-5555-5555-555555555001', 'House Service', 50000, 'fixed');

insert into public.room_addons (room_addon_room_id, room_addon_addon_id) values
  ('44444444-4444-4444-4444-444444444001', '55555555-5555-5555-5555-555555555001');

insert into public.house_events (house_event_id, house_event_description, house_event_start_at, house_event_end_at) values
  ('99999999-9999-9999-9999-999999999001', 'Internal strategy day', timestamptz '2026-10-05 09:00+02', timestamptz '2026-10-05 16:00+02');

insert into public.house_event_rooms (house_event_room_event_id, house_event_room_room_id) values
  ('99999999-9999-9999-9999-999999999001', '44444444-4444-4444-4444-444444444001');

insert into public.bookings (booking_id, booking_number, booking_company_id, booking_room_id, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values
  ('66666666-6666-6666-6666-666666666001', 'B-TEST-0001', '22222222-2222-2222-2222-222222222001', '44444444-4444-4444-4444-444444444001', timestamptz '2026-10-01 09:00+02', timestamptz '2026-10-01 11:00+02', 8, 'Peter', 'peter@rituals.dk', '+45 2010 2030', 1600000);

insert into public.verification_codes (verification_code_id, verification_code_booking_id, verification_code_hash, verification_code_expires_at) values
  ('AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', '66666666-6666-6666-6666-666666666001', 'hash', now() + interval '10 minutes');

-- Company session (Rituals).
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111002","role":"authenticated"}';

select is((select count(*) from public.rooms), 4::bigint, 'company reads rooms incl. deactivated (2 fixture + 2 seed)');
select is((select count(*) from public.room_images), 1::bigint, 'company reads room images');
select throws_ok(
  'insert into public.rooms (room_name, room_capacity, room_price_ore, room_opens_at, room_closes_at) values (''X'', 1, 1::bigint, ''08:00'', ''09:00'')',
  '42501', null,
  'company cannot create rooms');
select lives_ok(
  'update public.rooms set room_is_active = false where room_id = ''44444444-4444-4444-4444-444444444001''',
  'company room update is silently scoped to zero rows');
select is((select count(*) from public.addons), 0::bigint, 'addons stay admin-only until #7');
select is((select count(*) from public.room_addons), 0::bigint, 'room_addons stay admin-only until #7');
select is((select count(*) from public.house_events), 0::bigint, 'house_events are admin-only on the base table');
select is((select count(*) from public.house_event_rooms), 0::bigint, 'house_event_rooms are admin-only');
select is((select count(*) from public.verification_codes), 0::bigint, 'verification_codes are admin-only');

-- Admin session: full management rights.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111001","role":"authenticated","app_role":"admin"}';
select is((select count(*) from public.house_events), 1::bigint, 'admin manages house_events');
select is((select count(*) from public.addons), 5::bigint, 'admin manages addons (1 fixture + 4 seed)');
select is((select room_is_active from public.rooms where room_id = '44444444-4444-4444-4444-444444444001'), true, 'company could not deactivate a room');
select lives_ok(
  'update public.rooms set room_is_active = true where room_name = ''Room of Art''',
  'admin reactivates a room');
select lives_ok(
  'insert into public.addons (addon_name, addon_price_ore, addon_pricing_model) values (''Extra skærm'', 50000, ''fixed'')',
  'admin creates an add-on');
select lives_ok(
  'insert into public.verification_codes (verification_code_id, verification_code_booking_id, verification_code_hash, verification_code_expires_at) values (''AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAB'', ''66666666-6666-6666-6666-666666666001'', ''hash2'', now() + interval ''10 minutes'')',
  'admin inserts a verification code');
select lives_ok(
  'delete from public.verification_codes',
  'admin deletes verification codes');
select lives_ok(
  'insert into public.house_events (house_event_id, house_event_description, house_event_start_at, house_event_end_at) values (''99999999-9999-9999-9999-999999999002'', ''Second event'', timestamptz ''2026-10-06 09:00+02'', timestamptz ''2026-10-06 16:00+02'')',
  'admin creates a house event');
select lives_ok(
  'insert into public.house_event_rooms (house_event_room_event_id, house_event_room_room_id) values (''99999999-9999-9999-9999-999999999002'', ''44444444-4444-4444-4444-444444444002'')',
  'admin links a house event to a room');
select lives_ok(
  'insert into public.room_images (room_image_id, room_image_room_id, room_image_url) values (''88888888-8888-8888-8888-888888888002'', ''44444444-4444-4444-4444-444444444002'', ''https://example.test/art.jpg'')',
  'admin uploads a room image');
select lives_ok(
  'update public.room_images set room_image_sort_order = 1 where room_image_id = ''88888888-8888-8888-8888-888888888002''',
  'admin reorders a room image');
select lives_ok(
  'delete from public.room_images where room_image_id = ''88888888-8888-8888-8888-888888888002''',
  'admin deletes a room image');
select lives_ok(
  'delete from public.rooms where room_id = ''44444444-4444-4444-4444-444444444002''',
  'admin deletes a room');

select * from finish();
rollback;
