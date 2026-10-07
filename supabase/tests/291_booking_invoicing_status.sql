-- Invoicing status integrity (#9): only an admin changes
-- booking_invoicing_status; a booking whose end time has not passed can be
-- neither invoiced nor refused; every actual change writes one
-- invoicing_events row in the same transaction. Enforced by the triggers
-- on public.bookings (schemas/bookings.sql).

begin;
select plan(11);

-- Fixtures: one admin, one company, one room, one ended and one future
-- confirmed booking.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111201', 'authenticated', 'authenticated', 'admin@tsh.test', 'x', now(), '{"app_role":"admin"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111202', 'authenticated', 'authenticated', 'rituals@tsh.test', 'x', now(), '{}', '{}', now(), now());

insert into public.companies (company_id, company_auth_user_id, company_email, company_display_name) values
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111202', 'rituals@tsh.test', 'Rituals');

insert into public.rooms (room_id, room_name, room_capacity, room_hourly_price_ore) values
  ('44444444-4444-4444-4444-444444444201', 'Room of Power', 12, 800000);

insert into public.bookings (booking_id, booking_company_id, booking_room_id, booking_start_at, booking_end_at, booking_status, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values
  ('66666666-6666-6666-6666-666666666201', '22222222-2222-2222-2222-222222222201', '44444444-4444-4444-4444-444444444201', now() - interval '2 days', now() - interval '2 days' + interval '2 hours', 'confirmed', 8, 'Peter', 'peter@rituals.dk', '+45 2010 2030', 1600000),
  ('66666666-6666-6666-6666-666666666202', '22222222-2222-2222-2222-222222222201', '44444444-4444-4444-4444-444444444201', now() + interval '2 days', now() + interval '2 days' + interval '2 hours', 'confirmed', 8, 'Peter', 'peter@rituals.dk', '+45 2010 2030', 1600000);

-- Admin session.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111201","role":"authenticated","app_role":"admin"}';

select throws_ok(
  'update public.bookings set booking_invoicing_status = ''invoiced'' where booking_id = ''66666666-6666-6666-6666-666666666202''',
  'P0001',
  'a booking can first be marked invoiced or not invoicable after its end time',
  'a future booking cannot be marked invoiced');

select throws_ok(
  'update public.bookings set booking_invoicing_status = ''not_invoicable'' where booking_id = ''66666666-6666-6666-6666-666666666202''',
  'P0001',
  'a booking can first be marked invoiced or not invoicable after its end time',
  'a future booking cannot be marked not invoicable');

select is(
  (select count(*) from public.invoicing_events where invoicing_event_booking_id = '66666666-6666-6666-6666-666666666202'),
  0::bigint,
  'a refused change writes no audit row');

select lives_ok(
  'update public.bookings set booking_invoicing_status = ''not_invoicable'' where booking_id = ''66666666-6666-6666-6666-666666666201''',
  'an ended booking can be marked not invoicable');

select is(
  (select invoicing_event_from_status::text || '>' || invoicing_event_to_status::text
   from public.invoicing_events
   where invoicing_event_booking_id = '66666666-6666-6666-6666-666666666201'),
  'not_invoiced>not_invoicable',
  'the audit row mirrors the status it recorded');

-- Re-opening an invoiced/refused booking writes a second event: the trail
-- holds every change, not only the first.
select lives_ok(
  'update public.bookings set booking_invoicing_status = ''not_invoiced'', booking_invoice_date = null, booking_invoice_number = null where booking_id = ''66666666-6666-6666-6666-666666666201''',
  'an admin can re-open a refused booking');

select is(
  (select count(*) from public.invoicing_events where invoicing_event_booking_id = '66666666-6666-6666-6666-666666666201'),
  2::bigint,
  'every status change writes its own audit row');

select is(
  (select booking_invoice_number is null
     and booking_invoiced_at is null
     and booking_invoiced_by is null
   from public.bookings
   where booking_id = '66666666-6666-6666-6666-666666666201'),
  true,
  'leaving invoiced clears the invoice columns');

select lives_ok(
  'update public.bookings set booking_invoicing_status = ''invoiced'', booking_invoice_date = (now() - interval ''1 day'')::date, booking_invoice_number = ''1043'' where booking_id = ''66666666-6666-6666-6666-666666666201''',
  'an ended booking can be marked invoiced');

select is(
  (select booking_invoiced_by = '11111111-1111-1111-1111-111111111201'
   from public.bookings
   where booking_id = '66666666-6666-6666-6666-666666666201'),
  true,
  'the action sets invoiced_by, the audit names the same admin');

-- Company session: owns its booking row, but not the invoicing status.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111202","role":"authenticated"}';

select throws_ok(
  'update public.bookings set booking_invoicing_status = ''not_invoiced'' where booking_id = ''66666666-6666-6666-6666-666666666201''',
  '42501',
  'only an admin can change the invoicing status',
  'a company cannot change its own booking''s invoicing status');

select * from finish();
rollback;
