-- Booking number rule (#24): the database assigns B-YYMM-NNNN through a
-- sequence-backed function; app-supplied values are overwritten, the number
-- is unique, and it cannot be changed afterwards.

begin;
select plan(6);

-- Fixtures: one company, one room, two bookings in distant slots.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111002', 'authenticated', 'authenticated', 'rituals@tsh.test', 'x', now(), '{}', '{}', now(), now());

insert into public.companies (company_id, company_auth_user_id, company_username, company_email, company_display_name) values
  ('22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111002', 'test-rituals', 'rituals@tsh.test', 'Rituals');

insert into public.rooms (room_id, room_name, room_capacity, room_price_ore, room_opens_at, room_closes_at) values
  ('44444444-4444-4444-4444-444444444001', 'Room of Power', 12, 800000, '08:00', '18:00');

select lives_ok(
  'insert into public.bookings (booking_id, booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values (''66666666-6666-6666-6666-666666666001'', ''22222222-2222-2222-2222-222222222001'', ''44444444-4444-4444-4444-444444444001'', ''confirmed'', timestamptz ''2026-10-01 09:00+02'', timestamptz ''2026-10-01 11:00+02'', 8, ''Peter'', ''peter@rituals.dk'', ''+45 2010 2030'', 1600000)',
  'a booking can be inserted without a booking number');
select is(
  (select booking_number ~ '^B-[0-9]{4}-[0-9]{4}$' from public.bookings where booking_id = '66666666-6666-6666-6666-666666666001'),
  true,
  'the database assigned a B-YYMM-NNNN booking number');

select lives_ok(
  'insert into public.bookings (booking_id, booking_number, booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values (''66666666-6666-6666-6666-666666666002'', ''B-APP-9999'', ''22222222-2222-2222-2222-222222222001'', ''44444444-4444-4444-4444-444444444001'', ''confirmed'', timestamptz ''2026-10-02 09:00+02'', timestamptz ''2026-10-02 11:00+02'', 8, ''Peter'', ''peter@rituals.dk'', ''+45 2010 2030'', 1600000)',
  'an app-supplied booking number does not break the insert');
select is(
  (select booking_number <> 'B-APP-9999' from public.bookings where booking_id = '66666666-6666-6666-6666-666666666002'),
  true,
  'the app-supplied booking number was overwritten');
select is(
  (select count(distinct booking_number) from public.bookings),
  2::bigint,
  'every booking gets a distinct booking number');

select throws_ok(
  'update public.bookings set booking_number = ''B-HACK-0001'' where booking_id = ''66666666-6666-6666-6666-666666666001''',
  'P0001', null,
  'a booking number cannot be changed afterwards');

select * from finish();
rollback;
