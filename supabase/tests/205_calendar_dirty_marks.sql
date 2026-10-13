-- The dirty-marking triggers (#13): writes to bookings and house_events mark
-- their calendar_events row (calendar_events.sql) for the Outlook sync
-- worker. Confirmed bookings get exactly one row; a hold gets none; a
-- cancellation re-marks the existing row so the worker removes the Graph
-- entry; a hard delete of a house event (the deleteHouseEvent path,
-- lib/house-events/actions.ts) tombstones the row through the FK's
-- ON DELETE SET NULL. The triggers run SECURITY DEFINER: a company's
-- RLS-scoped booking write still lands the mirror row.
--
-- The writes run under real sessions (company, admin); every verification
-- select runs back as postgres, which bypasses RLS — the table itself is
-- deny-all (117_rls_calendar_events.sql).

begin;
select plan(17);

-- Fixtures: one member company, one admin, three rooms.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111101', 'authenticated', 'authenticated', 'admin@tsh.test', 'x', now(), '{"app_role":"admin"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111102', 'authenticated', 'authenticated', 'rituals@tsh.test', 'x', now(), '{}', '{}', now(), now());

insert into public.companies (company_id, company_auth_user_id, company_email, company_display_name) values
  ('22222222-2222-2222-2222-222222222101', '11111111-1111-1111-1111-111111111102', 'rituals@tsh.test', 'Rituals');

insert into public.rooms (room_id, room_name, room_capacity, room_hourly_price_ore) values
  ('44444444-4444-4444-4444-444444444101', 'Room of Power', 12, 800000),
  ('44444444-4444-4444-4444-444444444102', 'Kitchen', 8, 400000),
  ('44444444-4444-4444-4444-444444444103', 'Atelier', 6, 500000);

-- The company books under its own RLS-scoped session — the real write path.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111102","role":"authenticated"}';

insert into public.bookings (booking_id, booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore, booking_hold_expires_at) values
  ('66666666-6666-6666-6666-666666666101', '22222222-2222-2222-2222-222222222101', '44444444-4444-4444-4444-444444444101', 'pending_verification', now() + interval '2 days', now() + interval '2 days' + interval '2 hours', 8, 'Peter', 'peter@rituals.dk', '+45 2010 2030', 1600000, now() + interval '10 minutes');

reset role;
select is(
  (select count(*) from public.calendar_events where calendar_event_booking_id = '66666666-6666-6666-6666-666666666101'),
  0::bigint,
  'a hold gets no mirror row');

-- The booker enters the verification code: the hold is confirmed.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111102","role":"authenticated"}';
update public.bookings
set booking_status = 'confirmed', booking_hold_expires_at = null
where booking_id = '66666666-6666-6666-6666-666666666101';

reset role;
select is(
  (select count(*) from public.calendar_events where calendar_event_booking_id = '66666666-6666-6666-6666-666666666101'),
  1::bigint,
  'confirming writes one mirror row');

select is(
  (select calendar_event_needs_sync
     from public.calendar_events
    where calendar_event_booking_id = '66666666-6666-6666-6666-666666666101'),
  true,
  'the new mirror row starts dirty');

select is(
  (select calendar_event_graph_event_id
     from public.calendar_events
    where calendar_event_booking_id = '66666666-6666-6666-6666-666666666101'),
  null,
  'the row carries no graph id before the worker ran');

-- A later edit touches the same row, never a second one.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111102","role":"authenticated"}';
update public.bookings
set booking_reference = 'MB-1042'
where booking_id = '66666666-6666-6666-6666-666666666101';

reset role;
select is(
  (select count(*) from public.calendar_events where calendar_event_booking_id = '66666666-6666-6666-6666-666666666101'),
  1::bigint,
  'a later booking edit touches the same row');

-- Cancelling re-marks the row; removing the Graph entry is the worker's job.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111102","role":"authenticated"}';
update public.bookings
set booking_status = 'cancelled', booking_cancelled_at = now()
where booking_id = '66666666-6666-6666-6666-666666666101';

reset role;
select is(
  (select calendar_event_needs_sync
     from public.calendar_events
    where calendar_event_booking_id = '66666666-6666-6666-6666-666666666101'),
  true,
  'a cancellation re-marks the mirror row');

-- House Events: the admin saves one with two rooms in one call (#12).
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111101","role":"authenticated","app_role":"admin"}';

select public.save_house_event(
  'Vi rydder hele huset.',
  now() + interval '10 days',
  now() + interval '10 days' + interval '4 hours',
  array['44444444-4444-4444-4444-444444444101', '44444444-4444-4444-4444-444444444102']::uuid[],
  'Værkstedsdag'
) as house_event_id \gset

reset role;
select is(
  (select count(*) from public.calendar_events where calendar_event_house_event_id = :'house_event_id'::uuid),
  1::bigint,
  'a house event mirrors as one row, rooms aside');

-- Adding a third room re-marks the same row.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111101","role":"authenticated","app_role":"admin"}';
select public.save_house_event(
  'Vi rydder hele huset.',
  now() + interval '10 days',
  now() + interval '10 days' + interval '4 hours',
  array['44444444-4444-4444-4444-444444444101', '44444444-4444-4444-4444-444444444102', '44444444-4444-4444-4444-444444444103']::uuid[],
  'Værkstedsdag',
  :'house_event_id'::uuid
) as house_event_id \gset

reset role;
select is(
  (select count(*) from public.calendar_events where calendar_event_house_event_id = :'house_event_id'::uuid),
  1::bigint,
  'a house event edit touches the same row');

-- Removing a room through the junction (the save does this) re-marks too.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111101","role":"authenticated","app_role":"admin"}';
delete from public.house_event_rooms
where house_event_room_event_id = :'house_event_id'::uuid
  and house_event_room_room_id = '44444444-4444-4444-4444-444444444103';

reset role;
select is(
  (select calendar_event_needs_sync from public.calendar_events where calendar_event_house_event_id = :'house_event_id'::uuid),
  true,
  'a room change re-marks the parent event row');

-- Hard delete (deleteHouseEvent): the FK nulls itself and the row
-- tombstones, still dirty — the worker removes the Graph entry and the row.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111101","role":"authenticated","app_role":"admin"}';
delete from public.house_events where house_event_id = :'house_event_id'::uuid;

reset role;
select is(
  (select count(*) from public.calendar_events
    where calendar_event_house_event_id is null
      and calendar_event_booking_id is null),
  1::bigint,
  'a deleted house event leaves one tombstone row');

select is(
  (select calendar_event_needs_sync from public.calendar_events
    where calendar_event_house_event_id is null
      and calendar_event_booking_id is null),
  true,
  'the tombstone stays dirty for the worker');

-- Renames flow into the entry text (subject = company display name,
-- location = room name), so a rename re-marks the live rows. The flag reset
-- stands in for the worker having just synced the row. The fixture booking
-- is admin-created and confirmed at once (ADR-0023).
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111101","role":"authenticated","app_role":"admin"}';

insert into public.bookings (booking_id, booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values
  ('66666666-6666-6666-6666-666666666102', '22222222-2222-2222-2222-222222222101', '44444444-4444-4444-4444-444444444102', 'confirmed', now() + interval '20 days', now() + interval '20 days' + interval '2 hours', 6, 'Mette', 'mette@rituals.dk', '+45 3020 3040', 800000),
  ('66666666-6666-6666-6666-666666666103', '22222222-2222-2222-2222-222222222101', '44444444-4444-4444-4444-444444444102', 'confirmed', now() - interval '2 days', now() - interval '1 hour', 6, 'Mette', 'mette@rituals.dk', '+45 3020 3040', 800000);

select public.save_house_event(
  'Låsedag',
  now() + interval '40 days',
  now() + interval '40 days' + interval '4 hours',
  array['44444444-4444-4444-4444-444444444103']::uuid[],
  'Låsedag'
) as house_event_two_id \gset

reset role;

update public.calendar_events set calendar_event_needs_sync = false
where calendar_event_booking_id in ('66666666-6666-6666-6666-666666666102', '66666666-6666-6666-6666-666666666103');
update public.rooms set room_name = 'Køkkenet'
where room_id = '44444444-4444-4444-4444-444444444102';

select is(
  (select calendar_event_needs_sync from public.calendar_events
    where calendar_event_booking_id = '66666666-6666-6666-6666-666666666102'),
  true,
  'a room rename re-marks the room''s live bookings');

-- The bound: an already-ended booking keeps its needs_sync flag — past
-- entries in the mailbox stay as they were written.
select is(
  (select calendar_event_needs_sync from public.calendar_events
    where calendar_event_booking_id = '66666666-6666-6666-6666-666666666103'),
  false,
  'a room rename leaves ended bookings alone');

update public.calendar_events set calendar_event_needs_sync = false
where calendar_event_house_event_id = :'house_event_two_id'::uuid;
update public.rooms set room_name = 'Værkstedet'
where room_id = '44444444-4444-4444-4444-444444444103';

select is(
  (select calendar_event_needs_sync from public.calendar_events
    where calendar_event_house_event_id = :'house_event_two_id'::uuid),
  true,
  'a room rename re-marks the house events on the room');

update public.calendar_events set calendar_event_needs_sync = false
where calendar_event_booking_id = '66666666-6666-6666-6666-666666666102';
update public.companies set company_display_name = 'Rituals ApS'
where company_id = '22222222-2222-2222-2222-222222222101';

select is(
  (select calendar_event_needs_sync from public.calendar_events
    where calendar_event_booking_id = '66666666-6666-6666-6666-666666666102'),
  true,
  'a company rename re-marks the company''s live bookings');

-- Schema guards: one mirror row per source item, never both sources on one
-- row.
select throws_ok(
  'insert into public.calendar_events (calendar_event_booking_id) values (''66666666-6666-6666-6666-666666666101'')',
  '23505', null,
  'a second mirror row for one booking is refused');

select throws_ok(
  'insert into public.calendar_events (calendar_event_booking_id, calendar_event_house_event_id) values (''66666666-6666-6666-6666-666666666101'', ''00000000-0000-0000-0000-000000000009'')',
  '23514', null,
  'one row cannot mirror both a booking and a house event');

select * from finish();
rollback;