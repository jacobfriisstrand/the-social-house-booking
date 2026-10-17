-- #126 follow-up: the admin's total-price override may sit below the
-- add-on lines — everything selected, total 1 kr. insertPendingBooking
-- starts the pending row at the override minus the lines' sum (a negative
-- intermediate) and the booking_addons_sync_totals trigger lands exactly
-- on the override; a confirmed row can never carry a negative total.

begin;
select plan(5);

-- Fixtures: one company, one room, one per-participant add-on. The
-- pending booking starts where the action starts it: the 1 kr override
-- (100 ore) minus lunch for 4 (90000 ore) = -89900 ore.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111003', 'authenticated', 'authenticated', 'admin@tsh.test', 'x', now(), '{}', '{}', now(), now());

insert into public.companies (company_id, company_auth_user_id, company_email, company_display_name) values
  ('22222222-2222-2222-2222-222222222003', '11111111-1111-1111-1111-111111111003', 'admin@tsh.test', 'Nordic Events');

insert into public.rooms (room_id, room_name, room_capacity, room_hourly_price_ore) values
  ('44444444-4444-4444-4444-444444444003', 'Room of Craft', 12, 800000);

insert into public.addons (addon_id, addon_name, addon_price_ore, addon_pricing_model) values
  ('55555555-5555-5555-5555-555555555003', 'Frokost', 22500, 'per_participant');

insert into public.bookings (booking_id, booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore, booking_expected_total_ore) values
  ('66666666-6666-6666-6666-666666666003', '22222222-2222-2222-2222-222222222003', '44444444-4444-4444-4444-444444444003', 'pending_verification', timestamptz '2026-11-03 09:00+01', timestamptz '2026-11-03 11:00+01', 4, 'Kirsten', 'admin@thesocialhouse.dk', '+45 3011 4011', 1600000, -89900);

select is(
  (select booking_expected_total_ore from public.bookings where booking_id = '66666666-6666-6666-6666-666666666003'),
  -89900,
  'the pending row holds the negative intermediate the override starts from');

-- The lines land the total exactly on the admin's 1 kr.
insert into public.booking_addons (booking_addon_booking_id, booking_addon_addon_id, booking_addon_unit_price_ore, booking_addon_quantity, booking_addon_total_ore) values
  ('66666666-6666-6666-6666-666666666003', '55555555-5555-5555-5555-555555555003', 22500, 4, 90000);

select is(
  (select booking_expected_total_ore from public.bookings where booking_id = '66666666-6666-6666-6666-666666666003'),
  100,
  'the sync trigger lands the total on the 1 kr override');

-- Confirming keeps the non-negative total.
update public.bookings set booking_status = 'confirmed'
where booking_id = '66666666-6666-6666-6666-666666666003';
select is(
  (select booking_status from public.bookings where booking_id = '66666666-6666-6666-6666-666666666003'),
  'confirmed'::public.booking_status,
  'the booking confirms on its 1 kr total');

-- A confirmed row can never carry a negative total.
select throws_ok(
  'insert into public.bookings (booking_id, booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore, booking_expected_total_ore) values (''66666666-6666-6666-6666-666666666005'', ''22222222-2222-2222-2222-222222222003'', ''44444444-4444-4444-4444-444444444003'', ''confirmed'', timestamptz ''2026-11-04 09:00+01'', timestamptz ''2026-11-04 11:00+01'', 4, ''Kirsten'', ''admin@thesocialhouse.dk'', ''+45 3011 4011'', 1600000, -500)',
  '23514', null,
  'a confirmed row cannot carry a negative expected total');

-- The release path expires an abandoned pending row whose total is still
-- negative (a failed add-on write before the sync trigger lands): that
-- update must go through, or the row keeps blocking the room.
insert into public.bookings (booking_id, booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore, booking_expected_total_ore) values
  ('66666666-6666-6666-6666-666666666004', '22222222-2222-2222-2222-222222222003', '44444444-4444-4444-4444-444444444003', 'pending_verification', timestamptz '2026-11-04 09:00+01', timestamptz '2026-11-04 11:00+01', 4, 'Kirsten', 'admin@thesocialhouse.dk', '+45 3011 4011', 1600000, -500);

select lives_ok(
  'update public.bookings set booking_status = ''expired'' where booking_id = ''66666666-6666-6666-6666-666666666004'' and booking_status = ''pending_verification''',
  'an abandoned pending row expires with its negative total intact');

select * from finish();
rollback;
