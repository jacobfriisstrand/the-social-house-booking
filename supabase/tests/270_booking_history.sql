-- The booking history trail (#5): every write to bookings that changes a
-- tracked column appends one booking_history row with the column diff,
-- written by the bookings_record_history trigger regardless of which path
-- writes (company session, admin session, service role). The table is
-- admin-read-only under RLS and append-only: no update or delete policy
-- exists, so even an admin's Data-API write changes nothing.

begin;
select plan(18);

-- Fixtures: one member user, one admin user, one company, one room.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111101', 'authenticated', 'authenticated', 'rituals@tsh.test', 'x', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111102', 'authenticated', 'authenticated', 'admin@tsh.test', 'x', now(), '{"app_role":"admin"}', '{}', now(), now());

insert into public.companies (company_id, company_auth_user_id, company_email, company_display_name) values
  ('22222222-2222-2222-2222-222222222101', '11111111-1111-1111-1111-111111111101', 'rituals@tsh.test', 'Rituals');

insert into public.rooms (room_id, room_name, room_capacity, room_hourly_price_ore) values
  ('44444444-4444-4444-4444-444444444101', 'History Room', 12, 800000);

-- The hold is created without a session: the trail records every tracked
-- column with "from" null, and changed_by is null because nobody is logged
-- in (a service-role write).
insert into public.bookings (booking_id, booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_hold_expires_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore, booking_expected_total_ore) values
  ('66666666-6666-6666-6666-666666666101', '22222222-2222-2222-2222-222222222101', '44444444-4444-4444-4444-444444444101', 'pending_verification', timestamptz '2026-10-01 10:00+02', timestamptz '2026-10-01 12:00+02', now() + interval '15 minutes', 4, 'Peter', 'peter@rituals.dk', '+45 2010 2030', 1600000, 1600000);

select is(
  (select count(*) from public.booking_history where booking_history_booking_id = '66666666-6666-6666-6666-666666666101'),
  1::bigint,
  'the insert writes exactly one history row');
select is(
  (select booking_history_change -> 'booking_status' ->> 'from' from public.booking_history where booking_history_booking_id = '66666666-6666-6666-6666-666666666101'),
  null::text,
  'on insert every tracked column is recorded with "from" null');
select is(
  (select booking_history_change -> 'booking_status' ->> 'to' from public.booking_history where booking_history_booking_id = '66666666-6666-6666-6666-666666666101'),
  'pending_verification',
  'the created row records the status it was created in');
select is(
  (select booking_history_changed_by from public.booking_history where booking_history_booking_id = '66666666-6666-6666-6666-666666666101'),
  null::uuid,
  'a write without a session records no actor');

-- The company confirms: the diff is the status alone, with the session's
-- user id as the actor.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111101","role":"authenticated"}';
update public.bookings set booking_status = 'confirmed'
  where booking_id = '66666666-6666-6666-6666-666666666101';
-- The trail is admin-read-only, so every read of it happens as the
-- bootstrap role; the session stays only for the write itself.
reset role;
select is(
  (select count(*) from public.booking_history where booking_history_booking_id = '66666666-6666-6666-6666-666666666101'),
  2::bigint,
  'the confirm appends one row');
select is(
  (select booking_history_change -> 'booking_status' ->> 'from' from public.booking_history where booking_history_booking_id = '66666666-6666-6666-6666-666666666101' order by booking_history_changed_at desc limit 1),
  'pending_verification',
  'the confirm diff carries the old status');
select is(
  (select booking_history_changed_by from public.booking_history where booking_history_booking_id = '66666666-6666-6666-6666-666666666101' order by booking_history_changed_at desc limit 1),
  '11111111-1111-1111-1111-111111111101'::uuid,
  'the company session is recorded as the actor');

-- The cancellation is one write whose diff carries the fee, the time and
-- the actor (ADR-0006). The member price is 1600000 øre; cancelling 48
-- hours before means a 50 % fee of 800000 øre.
update public.bookings
  set booking_status = 'cancelled',
      booking_cancelled_at = now(),
      booking_cancelled_by = 'member',
      booking_cancellation_fee_ore = 800000
  where booking_id = '66666666-6666-6666-6666-666666666101';
reset role;
select is(
  (select count(*) from public.booking_history where booking_history_booking_id = '66666666-6666-6666-6666-666666666101'),
  3::bigint,
  'the cancellation appends one row');
select is(
  (select booking_history_change from public.booking_history
     where booking_history_booking_id = '66666666-6666-6666-6666-666666666101'
     order by booking_history_changed_at desc limit 1)
    -> 'booking_cancellation_fee_ore' ->> 'to',
  '800000',
  'the cancellation diff carries the computed fee');
select is(
  (select booking_history_change -> 'booking_cancelled_by' ->> 'to' from public.booking_history
     where booking_history_booking_id = '66666666-6666-6666-6666-666666666101'
     order by booking_history_changed_at desc limit 1),
  'member',
  'the cancellation diff carries who cancelled');
select is(
  (select booking_history_change ? 'booking_cancelled_at' from public.booking_history
     where booking_history_booking_id = '66666666-6666-6666-6666-666666666101'
     order by booking_history_changed_at desc limit 1),
  true::boolean,
  'the cancellation diff carries the cancellation time');

-- An admin waives the fee: the flag is its own transition in the trail
-- (Bilag 1 "Ombooking og fejl"), and the admin session is the actor.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111102","role":"authenticated","app_role":"admin"}';
update public.bookings set booking_cancellation_fee_waived = true
  where booking_id = '66666666-6666-6666-6666-666666666101';
reset role;
select is(
  (select booking_history_change -> 'booking_cancellation_fee_waived' ->> 'from' from public.booking_history
     where booking_history_booking_id = '66666666-6666-6666-6666-666666666101'
     order by booking_history_changed_at desc limit 1),
  'false',
  'the waive diff starts at false');
select is(
  (select booking_history_changed_by from public.booking_history
     where booking_history_booking_id = '66666666-6666-6666-6666-666666666101'
     order by booking_history_changed_at desc limit 1),
  '11111111-1111-1111-1111-111111111102'::uuid,
  'the admin session is recorded as the actor');

-- A write that changes no tracked column (booking_updated_at excluded) is
-- not logged.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111101","role":"authenticated"}';
update public.bookings set booking_updated_at = now()
  where booking_id = '66666666-6666-6666-6666-666666666101';
reset role;
select is(
  (select count(*) from public.booking_history where booking_history_booking_id = '66666666-6666-6666-6666-666666666101'),
  4::bigint,
  'a write that changes nothing tracked writes no history row');

-- The trail is admin-read-only: the company sees none of it, and no policy
-- lets anyone update or delete a row.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111101","role":"authenticated"}';
select is(
  (select count(*) from public.booking_history where booking_history_booking_id = '66666666-6666-6666-6666-666666666101'),
  0::bigint,
  'a company reads none of the trail');
update public.booking_history set booking_history_change = '{"rewritten":true}'
  where booking_history_booking_id = '66666666-6666-6666-6666-666666666101';
select is(
  (select count(*) from public.booking_history where booking_history_change ? 'rewritten'),
  0::bigint,
  'no authenticated session can rewrite the trail');
delete from public.booking_history
  where booking_history_booking_id = '66666666-6666-6666-6666-666666666101';
reset role;
select is(
  (select count(*) from public.booking_history where booking_history_booking_id = '66666666-6666-6666-6666-666666666101'),
  4::bigint,
  'no authenticated session can delete the trail');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111102","role":"authenticated","app_role":"admin"}';
select is(
  (select count(*) from public.booking_history where booking_history_booking_id = '66666666-6666-6666-6666-666666666101'),
  4::bigint,
  'the admin reads the whole trail');

select * from finish();
rollback;