-- RLS tests for invoicing_events (#9): the audit trail is admin-only — a
-- company sees none of it and cannot write it, an admin reads the rows the
-- record_invoicing_event trigger wrote under its session.

begin;
select plan(7);

-- Fixtures: one admin, two companies, one room, one ended booking each.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111101', 'authenticated', 'authenticated', 'admin@tsh.test', 'x', now(), '{"app_role":"admin"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111102', 'authenticated', 'authenticated', 'rituals@tsh.test', 'x', now(), '{}', '{}', now(), now());

insert into public.companies (company_id, company_auth_user_id, company_email, company_display_name) values
  ('22222222-2222-2222-2222-222222222101', '11111111-1111-1111-1111-111111111102', 'rituals@tsh.test', 'Rituals');

insert into public.rooms (room_id, room_name, room_capacity, room_hourly_price_ore) values
  ('44444444-4444-4444-4444-444444444101', 'Room of Power', 12, 800000);

insert into public.bookings (booking_id, booking_company_id, booking_room_id, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values
  ('66666666-6666-6666-6666-666666666101', '22222222-2222-2222-2222-222222222101', '44444444-4444-4444-4444-444444444101', now() - interval '2 days', now() - interval '2 days' + interval '2 hours', 8, 'Peter', 'peter@rituals.dk', '+45 2010 2030', 1600000);

-- Admin session: mark the ended booking invoiced, which writes the audit
-- row through the trigger (bookings.sql).
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111101","role":"authenticated","app_role":"admin"}';

select lives_ok(
  'update public.bookings set booking_invoicing_status = ''invoiced'', booking_invoice_date = (now() - interval ''1 day'')::date, booking_invoice_number = ''1042'' where booking_id = ''66666666-6666-6666-6666-666666666101''',
  'admin marks an ended booking invoiced');

-- The seed (supabase/seed.sql) has written its own audit row for its
-- invoiced booking, so every count here reads the fixture booking only.
select is(
  (select count(*) from public.invoicing_events where invoicing_event_booking_id = '66666666-6666-6666-6666-666666666101'),
  1::bigint,
  'admin reads the audit row the status change wrote');

select is(
  (select invoicing_event_to_status::text || '/' || invoicing_event_invoice_number
   from public.invoicing_events
   where invoicing_event_booking_id = '66666666-6666-6666-6666-666666666101'),
  'invoiced/1042',
  'the audit row carries the new status and the recorded invoice number');

select is(
  (select invoicing_event_changed_by = '11111111-1111-1111-1111-111111111101'
   from public.invoicing_events
   where invoicing_event_booking_id = '66666666-6666-6666-6666-666666666101'),
  true,
  'the audit row names the admin whose update fired it');

select is(
  (select booking_invoiced_by = '11111111-1111-1111-1111-111111111101'
     and booking_invoiced_at is not null
   from public.bookings
   where booking_id = '66666666-6666-6666-6666-666666666101'),
  true,
  'the booking carries who/when without the writer supplying them');

-- Company session: the trail of its own booking is invisible and unwritable.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111102","role":"authenticated"}';

select is(
  (select count(*) from public.invoicing_events),
  0::bigint,
  'a company sees no invoicing events, its booking included');

select throws_ok(
  'insert into public.invoicing_events (invoicing_event_booking_id, invoicing_event_from_status, invoicing_event_to_status) values (''66666666-6666-6666-6666-666666666101'', ''not_invoiced'', ''invoiced'')',
  '42501', null,
  'a company cannot write invoicing events');

select * from finish();
rollback;
