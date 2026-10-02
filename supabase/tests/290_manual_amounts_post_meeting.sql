-- The post-meeting rule (#16): a manual amount belongs to a held meeting
-- that still waits for its invoice, so inserts fail unless the booking is
-- confirmed, its end time has passed, and no invoice is recorded — never
-- while the meeting is still ahead, and never on a cancelled booking, an
-- expired hold, or a booking marked faktureret: nothing was served, or
-- the basis an invoice was made from would change. The check constraints
-- (positive amount, non-empty note) are asserted alongside.

begin;
select plan(10);

-- Fixtures: one admin, one company, one room, three bookings — one that
-- ended (confirmed), one still ahead, one cancelled in the past window.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111001', 'authenticated', 'authenticated', 'admin@tsh.test', 'x', now(), '{"app_role":"admin"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111002', 'authenticated', 'authenticated', 'rituals@tsh.test', 'x', now(), '{}', '{}', now(), now());

insert into public.companies (company_id, company_auth_user_id, company_email, company_display_name) values
  ('22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111002', 'rituals@tsh.test', 'Rituals');

insert into public.rooms (room_id, room_name, room_capacity, room_hourly_price_ore) values
  ('44444444-4444-4444-4444-444444444001', 'Room of Power', 12, 800000);

insert into public.bookings (booking_id, booking_number, booking_company_id, booking_room_id, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore, booking_status, booking_invoicing_status, booking_invoice_date, booking_invoice_number, booking_invoiced_at, booking_invoiced_by) values
  ('66666666-6666-6666-6666-666666666001', 'B-TEST-0001', '22222222-2222-2222-2222-222222222001', '44444444-4444-4444-4444-444444444001', now() - interval '4 hours', now() - interval '2 hours', 8, 'Peter', 'peter@rituals.dk', '+45 2010 2030', 1600000, 'confirmed', 'not_invoiced', null, null, null, null),
  ('66666666-6666-6666-6666-666666666002', 'B-TEST-0002', '22222222-2222-2222-2222-222222222001', '44444444-4444-4444-4444-444444444001', now() + interval '2 hours', now() + interval '4 hours', 4, 'Anne', 'anne@nordicevents.dk', '+45 3020 3040', 800000, 'confirmed', 'not_invoiced', null, null, null, null),
  ('66666666-6666-6666-6666-666666666003', 'B-TEST-0003', '22222222-2222-2222-2222-222222222001', '44444444-4444-4444-4444-444444444001', now() - interval '4 hours', now() - interval '2 hours', 4, 'Anne', 'anne@nordicevents.dk', '+45 3020 3040', 800000, 'cancelled', 'not_invoiced', null, null, null, null),
  ('66666666-6666-6666-6666-666666666004', 'B-TEST-0004', '22222222-2222-2222-2222-222222222001', '44444444-4444-4444-4444-444444444001', now() - interval '4 hours', now() - interval '2 hours', 4, 'Anne', 'anne@nordicevents.dk', '+45 3020 3040', 800000, 'expired', 'not_invoiced', null, null, null, null),
  ('66666666-6666-6666-6666-666666666005', 'B-TEST-0005', '22222222-2222-2222-2222-222222222001', '44444444-4444-4444-4444-444444444001', now() - interval '9 hours', now() - interval '7 hours', 4, 'Anne', 'anne@nordicevents.dk', '+45 3020 3040', 800000, 'confirmed', 'invoiced', current_date, 'F-1001', now() - interval '1 hour', '11111111-1111-1111-1111-111111111001');

-- Admin session: the only writer (policies/115 carry the RLS proof).
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111001","role":"authenticated","app_role":"admin"}';

select lives_ok(
  'insert into public.manual_amounts (manual_amount_booking_id, manual_amount_amount_ore, manual_amount_note) values (''66666666-6666-6666-6666-666666666001'', 45000, ''Ekstra rengøring'')',
  'admin adds a manual amount to an ended booking');
select throws_ok(
  'insert into public.manual_amounts (manual_amount_booking_id, manual_amount_amount_ore, manual_amount_note) values (''66666666-6666-6666-6666-666666666002'', 10000, ''Ekstra tid'')',
  'P0001', 'a manual amount can only be added after the booking has been held',
  'no manual amount while the booking''s end time is still ahead');
select throws_ok(
  'insert into public.manual_amounts (manual_amount_booking_id, manual_amount_amount_ore, manual_amount_note) values (''66666666-6666-6666-6666-666666666003'', 10000, ''Ekstra tid'')',
  'P0001', 'a manual amount can only be added after the booking has been held',
  'no manual amount on a cancelled booking');
select throws_ok(
  'insert into public.manual_amounts (manual_amount_booking_id, manual_amount_amount_ore, manual_amount_note) values (''66666666-6666-6666-6666-666666666004'', 10000, ''Ekstra tid'')',
  'P0001', 'a manual amount can only be added after the booking has been held',
  'no manual amount on an expired hold');
select throws_ok(
  'insert into public.manual_amounts (manual_amount_booking_id, manual_amount_amount_ore, manual_amount_note) values (''66666666-6666-6666-6666-666666666005'', 10000, ''Ekstra tid'')',
  'P0001', 'the booking is already invoiced',
  'no manual amount behind a recorded invoice');
select throws_ok(
  'insert into public.manual_amounts (manual_amount_booking_id, manual_amount_amount_ore, manual_amount_note) values (''66666666-6666-6666-6666-666666666001'', 0, ''Ekstra tid'')',
  '23514', null,
  'a manual amount is a positive extra charge');
select throws_ok(
  'insert into public.manual_amounts (manual_amount_booking_id, manual_amount_amount_ore, manual_amount_note) values (''66666666-6666-6666-6666-666666666001'', 10000, ''   '')',
  '23514', null,
  'a manual amount carries a non-empty note');
select lives_ok(
  'insert into public.manual_amounts (manual_amount_booking_id, manual_amount_amount_ore, manual_amount_note) values (''66666666-6666-6666-6666-666666666001'', 10000, ''Ekstra tid''), (''66666666-6666-6666-6666-666666666001'', 25000, ''Eksterne omkostninger'')',
  'several manual amounts on one booking are allowed');
select is(
  (select count(*) from public.manual_amounts where manual_amount_booking_id = '66666666-6666-6666-6666-666666666001'),
  3::bigint,
  'all three amounts on the ended booking are kept');
select is(
  (select sum(manual_amount_amount_ore) from public.manual_amounts where manual_amount_booking_id = '66666666-6666-6666-6666-666666666001'),
  80000::bigint,
  'the amounts sum for the invoicing basis (#9)');

select * from finish();
rollback;
