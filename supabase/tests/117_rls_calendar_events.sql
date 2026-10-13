-- RLS tests for calendar_events (#13): the Outlook mirror's dirty-row table
-- is internal sync state — no login reads or writes it. The sync worker runs
-- on the service key (RLS is bypassed) and the dirty-marking triggers run
-- SECURITY DEFINER (205_calendar_dirty_marks.sql). With no policies the
-- default rule is denial for every session, admin included.

begin;
select plan(9);

-- Fixtures: one admin, one member company, one room, one confirmed booking.
-- The bookings_calendar_dirty trigger (bookings.sql) writes the mirror row
-- for the confirmed booking as part of the insert, SECURITY DEFINER, so the
-- row exists before any role check.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111101', 'authenticated', 'authenticated', 'admin@tsh.test', 'x', now(), '{"app_role":"admin"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111102', 'authenticated', 'authenticated', 'rituals@tsh.test', 'x', now(), '{}', '{}', now(), now());

insert into public.companies (company_id, company_auth_user_id, company_email, company_display_name) values
  ('22222222-2222-2222-2222-222222222101', '11111111-1111-1111-1111-111111111102', 'rituals@tsh.test', 'Rituals');

insert into public.rooms (room_id, room_name, room_capacity, room_hourly_price_ore) values
  ('44444444-4444-4444-4444-444444444101', 'Room of Power', 12, 800000);

insert into public.bookings (booking_id, booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values
  ('66666666-6666-6666-6666-666666666101', '22222222-2222-2222-2222-222222222101', '44444444-4444-4444-4444-444444444101', 'confirmed', now() + interval '2 days', now() + interval '2 days' + interval '2 hours', 8, 'Peter', 'peter@rituals.dk', '+45 2010 2030', 1600000);

-- The definer trigger wrote the mirror row; this runs as postgres, which
-- bypasses RLS.
select is(
  (select count(*) from public.calendar_events where calendar_event_booking_id = '66666666-6666-6666-6666-666666666101'),
  1::bigint,
  'the confirmed fixture booking has one mirror row');

-- Anonymous: nothing visible, nothing writable.
set local role anon;
select is(
  (select count(*) from public.calendar_events),
  0::bigint,
  'anon sees no mirror rows');

select throws_ok(
  'insert into public.calendar_events (calendar_event_booking_id) values (''66666666-6666-6666-6666-666666666101'')',
  '42501', null,
  'anon cannot insert mirror rows');

-- Company session: the mirror row of its own booking stays invisible and
-- unwritable.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111102","role":"authenticated"}';

select is(
  (select count(*) from public.calendar_events),
  0::bigint,
  'a company sees no mirror rows, its booking included');

-- A company cannot flip a row's sync flag and cannot delete one: the
-- statements run, but RLS gives them zero rows.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111102","role":"authenticated"}';

update public.calendar_events set calendar_event_needs_sync = false;
delete from public.calendar_events;

reset role;
select is(
  (select calendar_event_needs_sync
     from public.calendar_events
    where calendar_event_booking_id = '66666666-6666-6666-6666-666666666101'),
  true,
  'a company updates no mirror rows');

select is(
  (select count(*)
     from public.calendar_events
    where calendar_event_booking_id = '66666666-6666-6666-6666-666666666101'),
  1::bigint,
  'a company deletes no mirror rows');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111102","role":"authenticated"}';

select throws_ok(
  'insert into public.calendar_events (calendar_event_booking_id) values (''66666666-6666-6666-6666-666666666101'')',
  '42501', null,
  'a company cannot insert mirror rows');

-- Admin session: same denial — the table is not part of any screen.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111101","role":"authenticated","app_role":"admin"}';

select is(
  (select count(*) from public.calendar_events),
  0::bigint,
  'an admin sees no mirror rows either');

select throws_ok(
  'insert into public.calendar_events (calendar_event_booking_id) values (''66666666-6666-6666-6666-666666666101'')',
  '42501', null,
  'an admin cannot insert mirror rows');

select * from finish();
rollback;