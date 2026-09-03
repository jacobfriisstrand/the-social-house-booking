-- RLS tests for bookings, booking_addons, and outbound_emails (#19): a
-- company reads/writes its own rows, admin manages all, nobody deletes
-- bookings.

begin;
select plan(17);

-- Fixtures: two companies, one room, one booking each, one add-on on the
-- first booking, three send-log rows (own, foreign, system).
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111001', 'authenticated', 'authenticated', 'admin@tsh.test', 'x', now(), '{"app_role":"admin"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111002', 'authenticated', 'authenticated', 'rituals@tsh.test', 'x', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111003', 'authenticated', 'authenticated', 'nordic@tsh.test', 'x', now(), '{}', '{}', now(), now());

insert into public.companies (company_id, company_auth_user_id, company_email, company_display_name) values
  ('22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111002', 'rituals@tsh.test', 'Rituals'),
  ('22222222-2222-2222-2222-222222222002', '11111111-1111-1111-1111-111111111003', 'nordic@tsh.test', 'Nordic Events');

insert into public.rooms (room_id, room_name, room_capacity, room_price_ore, room_opens_at, room_closes_at) values
  ('44444444-4444-4444-4444-444444444001', 'Room of Power', 12, 800000, '08:00', '18:00');

insert into public.addons (addon_id, addon_name, addon_price_ore, addon_pricing_model) values
  ('55555555-5555-5555-5555-555555555001', 'Lunch', 22500, 'per_participant');

insert into public.bookings (booking_id, booking_number, booking_company_id, booking_room_id, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values
  ('66666666-6666-6666-6666-666666666001', 'B-TEST-0001', '22222222-2222-2222-2222-222222222001', '44444444-4444-4444-4444-444444444001', timestamptz '2026-10-01 09:00+02', timestamptz '2026-10-01 11:00+02', 8, 'Peter', 'peter@rituals.dk', '+45 2010 2030', 1600000),
  ('66666666-6666-6666-6666-666666666002', 'B-TEST-0002', '22222222-2222-2222-2222-222222222002', '44444444-4444-4444-4444-444444444001', timestamptz '2026-10-02 09:00+02', timestamptz '2026-10-02 11:00+02', 4, 'Anne', 'anne@nordicevents.dk', '+45 3020 3040', 800000);

insert into public.booking_addons (booking_addon_booking_id, booking_addon_addon_id, booking_addon_price_ore) values
  ('66666666-6666-6666-6666-666666666001', '55555555-5555-5555-5555-555555555001', 180000);

insert into public.outbound_emails (outbound_email_id, outbound_email_kind, outbound_email_to, outbound_email_company_id, outbound_email_booking_id) values
  ('77777777-7777-7777-7777-777777777001', 'booking-confirmation', 'peter@rituals.dk', '22222222-2222-2222-2222-222222222001', '66666666-6666-6666-6666-666666666001'),
  ('77777777-7777-7777-7777-777777777002', 'booking-confirmation', 'anne@nordicevents.dk', '22222222-2222-2222-2222-222222222002', '66666666-6666-6666-6666-666666666002'),
  ('77777777-7777-7777-7777-777777777003', 'admin-new-booking', 'admin@thesocialhouse.dk', null, null);

-- Company session (Rituals).
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111002","role":"authenticated"}';

select is((select count(*) from public.bookings), 1::bigint, 'company sees only its own bookings');
select is((select booking_number from public.bookings), 'B-TEST-0001', 'company reads its own booking');
select is((select count(*) from public.booking_addons), 1::bigint, 'company reads its own booking add-ons');
select is((select count(*) from public.outbound_emails), 1::bigint, 'company reads only its own send-log rows');
select lives_ok(
  'update public.booking_addons set booking_addon_price_ore = 190000 where booking_addon_booking_id = ''66666666-6666-6666-6666-666666666001''',
  'company updates its own booking add-on');
select is((select outbound_email_kind from public.outbound_emails), 'booking-confirmation', 'company send-log row is its own');
select lives_ok(
  'update public.bookings set booking_status = ''cancelled'', booking_cancelled_at = now() where booking_number = ''B-TEST-0001''',
  'company cancels its own booking');
select throws_ok(
  'insert into public.bookings (booking_number, booking_company_id, booking_room_id, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values (''B-TEST-0003'', ''22222222-2222-2222-2222-222222222002'', ''44444444-4444-4444-4444-444444444001'', now(), now() + interval ''1 hour'', 2::bigint, ''X'', ''x@x.dk'', ''+45'', 1)',
  '42501', null,
  'company cannot create a booking for another company');
select throws_ok(
  'insert into public.booking_addons (booking_addon_booking_id, booking_addon_addon_id, booking_addon_price_ore) values (''66666666-6666-6666-6666-666666666002'', ''55555555-5555-5555-5555-555555555001'', 1)',
  '42501', null,
  'company cannot add add-ons to a foreign booking');
delete from public.bookings where true;
select is((select count(*) from public.bookings), 1::bigint, 'nobody deletes bookings (own booking remains)');

-- Other company session (Nordic): cannot touch Rituals' booking.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111003","role":"authenticated"}';
select is((select count(*) from public.booking_addons), 0::bigint, 'foreign booking add-ons are invisible');
select lives_ok(
  'update public.bookings set booking_booker_name = ''HACKED'' where booking_number = ''B-TEST-0001''',
  'foreign booking update is silently scoped to zero rows');

-- Admin session.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111001","role":"authenticated","app_role":"admin"}';
select is((select count(*) from public.bookings), 2::bigint, 'admin sees all bookings');
select is((select booking_booker_name from public.bookings where booking_number = 'B-TEST-0001'), 'Peter', 'foreign booking was not modified');
select is((select count(*) from public.booking_addons), 1::bigint, 'admin sees all booking add-ons');
select is((select count(*) from public.outbound_emails), 3::bigint, 'admin sees the whole send log incl. system mail');
select lives_ok(
  'insert into public.bookings (booking_number, booking_company_id, booking_room_id, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values (''B-TEST-0004'', ''22222222-2222-2222-2222-222222222002'', ''44444444-4444-4444-4444-444444444001'', now(), now() + interval ''1 hour'', 2::bigint, ''X'', ''x@x.dk'', ''+45'', 1)',
  'admin creates a booking');

select * from finish();
rollback;
