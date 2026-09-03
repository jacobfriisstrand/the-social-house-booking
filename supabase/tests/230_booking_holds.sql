-- Hold liveness (#24): a pending_verification hold whose
-- booking_hold_expires_at has passed is 'expired' — flipped by any write
-- (bookings_live_hold trigger) or by the expire_stale_holds() sweep the
-- hourly job calls. With that invariant, calendar_entries and the exclusion
-- constraint agree: pending means live, expired renders nowhere.

begin;
select plan(8);

-- Fixtures: one company, one room.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111002', 'authenticated', 'authenticated', 'rituals@tsh.test', 'x', now(), '{}', '{}', now(), now());

insert into public.companies (company_id, company_auth_user_id, company_username, company_email, company_display_name) values
  ('22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111002', 'test-rituals', 'rituals@tsh.test', 'Rituals');

insert into public.rooms (room_id, room_name, room_capacity, room_price_ore, room_opens_at, room_closes_at) values
  ('44444444-4444-4444-4444-444444444001', 'Room of Power', 12, 800000, '08:00', '18:00');

-- A live hold stays pending and keeps blocking (the 10:00 hold overlaps the
-- slot below, so the insert would fail if the hold did not block).
insert into public.bookings (booking_id, booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_hold_expires_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values
  ('66666666-6666-6666-6666-666666666001', '22222222-2222-2222-2222-222222222001', '44444444-4444-4444-4444-444444444001', 'pending_verification', timestamptz '2026-10-01 10:00+02', timestamptz '2026-10-01 11:00+02', now() + interval '15 minutes', 4, 'Peter', 'peter@rituals.dk', '+45 2010 2030', 1600000);
select is(
  (select booking_status from public.bookings where booking_id = '66666666-6666-6666-6666-666666666001'),
  'pending_verification'::public.booking_status,
  'a hold inside its window stays pending_verification');
select throws_ok(
  'insert into public.bookings (booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values (''22222222-2222-2222-2222-222222222001'', ''44444444-4444-4444-4444-444444444001'', ''confirmed'', timestamptz ''2026-10-01 10:00+02'', timestamptz ''2026-10-01 11:00+02'', 4, ''X'', ''x@x.dk'', ''+45'', 1)',
  '23P01', null,
  'a live hold blocks the room like any other booking');

-- A dead-on-arrival hold (expiry already past) is flipped on write.
insert into public.bookings (booking_id, booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_hold_expires_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values
  ('66666666-6666-6666-6666-666666666002', '22222222-2222-2222-2222-222222222001', '44444444-4444-4444-4444-444444444001', 'pending_verification', timestamptz '2026-10-01 12:00+02', timestamptz '2026-10-01 13:00+02', now() - interval '1 minute', 4, 'Peter', 'peter@rituals.dk', '+45 2010 2030', 1600000);
select is(
  (select booking_status from public.bookings where booking_id = '66666666-6666-6666-6666-666666666002'),
  'expired'::public.booking_status,
  'a hold past its expiry is flipped to expired on write');

-- Time passes without a write: craft the stale row by disabling the trigger
-- (the only way SQL can produce one), then sweep.
alter table public.bookings disable trigger bookings_live_hold;
insert into public.bookings (booking_id, booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_hold_expires_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values
  ('66666666-6666-6666-6666-666666666003', '22222222-2222-2222-2222-222222222001', '44444444-4444-4444-4444-444444444001', 'pending_verification', timestamptz '2026-10-01 14:00+02', timestamptz '2026-10-01 15:00+02', now() - interval '1 minute', 4, 'Peter', 'peter@rituals.dk', '+45 2010 2030', 1600000);
alter table public.bookings enable trigger bookings_live_hold;

select is(public.expire_stale_holds(), 1::integer, 'the sweep flips exactly the stale hold');
select is((select count(*) from public.bookings where booking_status = 'expired'), 2::bigint, 'both dead holds are expired');
select is((select count(*) from public.bookings where booking_status = 'pending_verification'), 1::bigint, 'the live hold is untouched');
select is(public.expire_stale_holds(), 0::integer, 'a second sweep finds nothing to flip');

-- With pending meaning live, the calendar shows the live hold and none of
-- the expired ones — no double-rendering of a slot.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111002","role":"authenticated"}';
select is(
  (select count(*) from public.calendar_entries where calendar_entry_kind = 'booking'),
  1::bigint,
  'calendar_entries shows the live hold only');

select * from finish();
rollback;
