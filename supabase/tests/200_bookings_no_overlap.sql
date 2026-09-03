-- Integrity tests for the no-overlap rule (#24): live bookings (incl. the
-- 30-minute buffer, ADR-0002) and House Events block each other per room;
-- cancelled/expired rows do not. Also proves the SECURITY DEFINER helper
-- still raises for a company session that cannot read house_events (RLS).

begin;
select plan(14);

-- Fixtures: one company, two rooms.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111002', 'authenticated', 'authenticated', 'rituals@tsh.test', 'x', now(), '{}', '{}', now(), now());

insert into public.companies (company_id, company_auth_user_id, company_username, company_email, company_display_name) values
  ('22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111002', 'test-rituals', 'rituals@tsh.test', 'Rituals');

insert into public.rooms (room_id, room_name, room_capacity, room_price_ore, room_opens_at, room_closes_at) values
  ('44444444-4444-4444-4444-444444444001', 'Room of Power', 12, 800000, '08:00', '18:00'),
  ('44444444-4444-4444-4444-444444444002', 'The Loft', 20, 1200000, '08:00', '22:00');

-- The anchor booking on Room of Power: 09:00-11:00, buffer until 11:30.
insert into public.bookings (booking_id, booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values
  ('66666666-6666-6666-6666-666666666001', '22222222-2222-2222-2222-222222222001', '44444444-4444-4444-4444-444444444001', 'confirmed', timestamptz '2026-10-01 09:00+02', timestamptz '2026-10-01 11:00+02', 8, 'Peter', 'peter@rituals.dk', '+45 2010 2030', 1600000);

select throws_ok(
  'insert into public.bookings (booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values (''22222222-2222-2222-2222-222222222001'', ''44444444-4444-4444-4444-444444444001'', ''confirmed'', timestamptz ''2026-10-01 10:00+02'', timestamptz ''2026-10-01 12:00+02'', 2, ''X'', ''x@x.dk'', ''+45'', 1)',
  'conflicting key value violates exclusion constraint "bookings_no_overlap"',
  'direct overlap on the same room is rejected');
select throws_ok(
  'insert into public.bookings (booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values (''22222222-2222-2222-2222-222222222001'', ''44444444-4444-4444-4444-444444444001'', ''confirmed'', timestamptz ''2026-10-01 11:10+02'', timestamptz ''2026-10-01 12:00+02'', 2, ''X'', ''x@x.dk'', ''+45'', 1)',
  'conflicting key value violates exclusion constraint "bookings_no_overlap"',
  'start inside the previous booking''s 30-minute buffer is rejected');
select lives_ok(
  'insert into public.bookings (booking_id, booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values (''66666666-6666-6666-6666-666666666002'', ''22222222-2222-2222-2222-222222222001'', ''44444444-4444-4444-4444-444444444001'', ''confirmed'', timestamptz ''2026-10-01 11:30+02'', timestamptz ''2026-10-01 12:30+02'', 2, ''X'', ''x@x.dk'', ''+45'', 1)',
  'start exactly at the buffer end is allowed');
select lives_ok(
  'insert into public.bookings (booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values (''22222222-2222-2222-2222-222222222001'', ''44444444-4444-4444-4444-444444444002'', ''confirmed'', timestamptz ''2026-10-01 10:00+02'', timestamptz ''2026-10-01 12:00+02'', 2, ''X'', ''x@x.dk'', ''+45'', 1)',
  'overlap on a different room is allowed');
select throws_ok(
  'update public.bookings set booking_start_at = timestamptz ''2026-10-01 10:00+02'' where booking_id = ''66666666-6666-6666-6666-666666666002''',
  'conflicting key value violates exclusion constraint "bookings_no_overlap"',
  'moving a booking into an occupied slot is rejected');

-- Cancelled and expired rows keep history without blocking the room.
insert into public.bookings (booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values
  ('22222222-2222-2222-2222-222222222001', '44444444-4444-4444-4444-444444444001', 'cancelled', timestamptz '2026-10-01 14:00+02', timestamptz '2026-10-01 15:00+02', 2, 'X', 'x@x.dk', '+45', 1),
  ('22222222-2222-2222-2222-222222222001', '44444444-4444-4444-4444-444444444001', 'expired', timestamptz '2026-10-01 16:00+02', timestamptz '2026-10-01 17:00+02', 2, 'X', 'x@x.dk', '+45', 1);
select lives_ok(
  'insert into public.bookings (booking_id, booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values (''66666666-6666-6666-6666-666666666003'', ''22222222-2222-2222-2222-222222222001'', ''44444444-4444-4444-4444-444444444001'', ''confirmed'', timestamptz ''2026-10-01 14:00+02'', timestamptz ''2026-10-01 15:00+02'', 2, ''X'', ''x@x.dk'', ''+45'', 1)',
  'a cancelled booking does not block the slot');
select lives_ok(
  'insert into public.bookings (booking_id, booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values (''66666666-6666-6666-6666-666666666004'', ''22222222-2222-2222-2222-222222222001'', ''44444444-4444-4444-4444-444444444001'', ''confirmed'', timestamptz ''2026-10-01 16:00+02'', timestamptz ''2026-10-01 17:00+02'', 2, ''X'', ''x@x.dk'', ''+45'', 1)',
  'an expired booking does not block the slot');

-- House Events participate in the same constraint (buffered ranges, one
-- shared check). Live booking 666...004 occupies 16:00-17:00 (buffer to
-- 17:30); the event below occupies 18:00-19:00 (buffer to 19:30).
insert into public.house_events (house_event_id, house_event_title, house_event_description, house_event_start_at, house_event_end_at) values
  ('99999999-9999-9999-9999-999999999001', 'Strategy day', 'Internal strategy day', timestamptz '2026-10-01 18:00+02', timestamptz '2026-10-01 19:00+02');
insert into public.house_event_rooms (house_event_room_event_id, house_event_room_room_id) values
  ('99999999-9999-9999-9999-999999999001', '44444444-4444-4444-4444-444444444001');

select throws_ok(
  'insert into public.bookings (booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values (''22222222-2222-2222-2222-222222222001'', ''44444444-4444-4444-4444-444444444001'', ''confirmed'', timestamptz ''2026-10-01 18:30+02'', timestamptz ''2026-10-01 19:30+02'', 2, ''X'', ''x@x.dk'', ''+45'', 1)',
  'room is blocked by a house event in that period (incl. buffer)',
  'booking inside a house event (incl. its buffer) is rejected');
select lives_ok(
  'insert into public.bookings (booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values (''22222222-2222-2222-2222-222222222001'', ''44444444-4444-4444-4444-444444444001'', ''confirmed'', timestamptz ''2026-10-01 19:30+02'', timestamptz ''2026-10-01 20:00+02'', 2, ''X'', ''x@x.dk'', ''+45'', 1)',
  'booking at the house event buffer end is allowed');
-- An event insert carries no rooms, so the clash check fires when the room
-- link is written.
insert into public.house_events (house_event_id, house_event_title, house_event_description, house_event_start_at, house_event_end_at) values
  ('99999999-9999-9999-9999-999999999002', 'Clash', 'Overlaps the confirmed booking', timestamptz '2026-10-01 16:30+02', timestamptz '2026-10-01 17:30+02'),
  ('99999999-9999-9999-9999-999999999003', 'Clash', 'Overlaps the other event', timestamptz '2026-10-01 17:30+02', timestamptz '2026-10-01 18:00+02'),
  ('99999999-9999-9999-9999-999999999004', 'Loft day', 'Same time, other room', timestamptz '2026-10-01 18:00+02', timestamptz '2026-10-01 19:00+02');

select throws_ok(
  'insert into public.house_event_rooms (house_event_room_event_id, house_event_room_room_id) values (''99999999-9999-9999-9999-999999999002'', ''44444444-4444-4444-4444-444444444001'')',
  'room is already blocked by a booking in that period (incl. buffer)',
  'linking a room conflicts with the confirmed booking occupying it');
select throws_ok(
  'insert into public.house_event_rooms (house_event_room_event_id, house_event_room_room_id) values (''99999999-9999-9999-9999-999999999003'', ''44444444-4444-4444-4444-444444444001'')',
  'room is blocked by another house event in that period (incl. buffer)',
  'house events block each other on the same room');
select throws_ok(
  'update public.house_events set house_event_start_at = timestamptz ''2026-10-01 16:30+02'', house_event_end_at = timestamptz ''2026-10-01 17:30+02'' where house_event_id = ''99999999-9999-9999-9999-999999999001''',
  'room is already blocked by a booking in that period (incl. buffer)',
  'moving a house event into an occupied slot is rejected');

select lives_ok(
  'insert into public.house_event_rooms (house_event_room_event_id, house_event_room_room_id) values (''99999999-9999-9999-9999-999999999004'', ''44444444-4444-4444-4444-444444444002'')',
  'a house event on a different room is allowed');

-- Company session: house_events are admin-only under RLS, yet the trigger
-- must still see them (the helper is SECURITY DEFINER for exactly this).
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111002","role":"authenticated"}';
select throws_ok(
  'insert into public.bookings (booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values (''22222222-2222-2222-2222-222222222001'', ''44444444-4444-4444-4444-444444444001'', ''confirmed'', timestamptz ''2026-10-01 18:00+02'', timestamptz ''2026-10-01 19:00+02'', 2, ''X'', ''x@x.dk'', ''+45'', 1)',
  'room is blocked by a house event in that period (incl. buffer)',
  'company session still collides with the invisible house event');

select * from finish();
rollback;
