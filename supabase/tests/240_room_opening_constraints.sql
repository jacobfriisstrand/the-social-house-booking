-- Opening-hours integrity (#3): one row per weekday per room, closes after
-- opens on open days, special closing days override per date, closed days
-- carry no times. Postgres verifies; TypeScript computes the fit (#4).

begin;
select plan(11);

-- Fixtures: an admin (for any admin-path writes), the seed member company
-- (Rituals) for the booking, and one room with weekly hours.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111001', 'authenticated', 'authenticated', 'admin@tsh.test', 'x', now(), '{"app_role":"admin"}', '{}', now(), now());

insert into public.rooms (room_id, room_name, room_capacity, room_hourly_price_ore) values
  ('44444444-4444-4444-4444-444444444001', 'Room of Power', 12, 800000);

insert into public.room_opening_hours (room_opening_hour_room_id, room_opening_hour_day_of_week, room_opening_hour_opens, room_opening_hour_closes, room_opening_hour_is_closed) values
  ('44444444-4444-4444-4444-444444444001', 0, '08:00', '18:00', false);

-- Weekly hours: one row per weekday, 0–6, and closes must be after opens
-- unless the day is closed.
select lives_ok(
  'insert into public.room_opening_hours (room_opening_hour_room_id, room_opening_hour_day_of_week, room_opening_hour_opens, room_opening_hour_closes, room_opening_hour_is_closed) values (''44444444-4444-4444-4444-444444444001'', 2, ''08:00'', ''18:00'', false)',
  'open weekday within 0-6 is accepted');
select throws_ok(
  'insert into public.room_opening_hours (room_opening_hour_room_id, room_opening_hour_day_of_week, room_opening_hour_opens, room_opening_hour_closes) values (''44444444-4444-4444-4444-444444444001'', 7, ''08:00'', ''18:00'')',
  '23514', null,
  'day_of_week above 6 is rejected');
select throws_ok(
  'insert into public.room_opening_hours (room_opening_hour_room_id, room_opening_hour_day_of_week, room_opening_hour_opens, room_opening_hour_closes) values (''44444444-4444-4444-4444-444444444001'', 1, ''18:00'', ''08:00'')',
  '23514', null,
  'closing before opening is rejected');
select throws_ok(
  'insert into public.room_opening_hours (room_opening_hour_room_id, room_opening_hour_day_of_week, room_opening_hour_opens, room_opening_hour_closes) values (''44444444-4444-4444-4444-444444444001'', 0, ''09:00'', ''17:00'')',
  '23505', null,
  'one weekly row per room and weekday');

-- Special closing days: one row per date; open requires both times, closed
-- requires none.
select lives_ok(
  'insert into public.room_special_closing_days (room_special_closing_day_room_id, room_special_closing_day_date, room_special_closing_day_opens, room_special_closing_day_closes, room_special_closing_day_is_closed) values (''44444444-4444-4444-4444-444444444001'', date ''2026-12-24'', ''08:00'', ''13:00'', false)',
  'open special day with both times is accepted');
select throws_ok(
  'insert into public.room_special_closing_days (room_special_closing_day_room_id, room_special_closing_day_date, room_special_closing_day_opens, room_special_closing_day_closes, room_special_closing_day_is_closed) values (''44444444-4444-4444-4444-444444444001'', date ''2026-12-24'', ''10:00'', ''13:00'', false)',
  '23505', null,
  'one special closing day per room and date');
select throws_ok(
  'insert into public.room_special_closing_days (room_special_closing_day_room_id, room_special_closing_day_date, room_special_closing_day_opens, room_special_closing_day_closes, room_special_closing_day_is_closed) values (''44444444-4444-4444-4444-444444444001'', date ''2026-12-25'', ''08:00'', ''13:00'', true)',
  '23514', null,
  'closed special day cannot carry times');
select throws_ok(
  'insert into public.room_special_closing_days (room_special_closing_day_room_id, room_special_closing_day_date, room_special_closing_day_is_closed) values (''44444444-4444-4444-4444-444444444001'', date ''2026-12-26'', false)',
  '23514', null,
  'open special day requires both times');

-- Deactivated rooms keep their history: a booking survives the deactivation.
insert into public.bookings (booking_id, booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values
  ('66666666-6666-6666-6666-666666666001', '00000000-0000-0000-0000-0000000000b2', '44444444-4444-4444-4444-444444444001', 'confirmed', timestamptz '2026-10-01 09:00+02', timestamptz '2026-10-01 11:00+02', 4, 'X', 'x@x.dk', '+45', 800000);

select lives_ok(
  'update public.rooms set room_is_active = false where room_id = ''44444444-4444-4444-4444-444444444001''',
  'deactivation only flips room_is_active');
select is(
  (select b.booking_id from public.bookings b
   join public.rooms r on r.room_id = b.booking_room_id
   where r.room_id = '44444444-4444-4444-4444-444444444001'),
  '66666666-6666-6666-6666-666666666001',
  'history (the booking) survives deactivation');
select is(
  (select room_opening_hour_closes from public.room_opening_hours
   where room_opening_hour_room_id = '44444444-4444-4444-4444-444444444001'
     and room_opening_hour_day_of_week = 0),
  '18:00'::time,
  'opening hours survive deactivation');

select * from finish();
rollback;
