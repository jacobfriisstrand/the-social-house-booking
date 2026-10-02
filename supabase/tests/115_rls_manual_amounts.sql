-- RLS tests for manual_amounts (#16): a booking's company reads its rows,
-- admin reads and inserts everywhere, nobody else touches anything. Only
-- admins get an insert policy — amounts are added by admin after a held
-- meeting — and there are no update or delete policies.

begin;
select plan(10);

-- Fixtures: two companies, one room, one ended booking each. The ended
-- bookings satisfy the post-meeting trigger (integrity/290), so the RLS
-- inserts here exercise the policies alone.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111001', 'authenticated', 'authenticated', 'admin@tsh.test', 'x', now(), '{"app_role":"admin"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111002', 'authenticated', 'authenticated', 'rituals@tsh.test', 'x', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111003', 'authenticated', 'authenticated', 'nordic@tsh.test', 'x', now(), '{}', '{}', now(), now());

insert into public.companies (company_id, company_auth_user_id, company_email, company_display_name) values
  ('22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111002', 'rituals@tsh.test', 'Rituals'),
  ('22222222-2222-2222-2222-222222222002', '11111111-1111-1111-1111-111111111003', 'nordic@tsh.test', 'Nordic Events');

insert into public.rooms (room_id, room_name, room_capacity, room_hourly_price_ore) values
  ('44444444-4444-4444-4444-444444444001', 'Room of Power', 12, 800000);

insert into public.bookings (booking_id, booking_number, booking_company_id, booking_room_id, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore, booking_status) values
  ('66666666-6666-6666-6666-666666666001', 'B-TEST-0001', '22222222-2222-2222-2222-222222222001', '44444444-4444-4444-4444-444444444001', now() - interval '4 hours', now() - interval '2 hours', 8, 'Peter', 'peter@rituals.dk', '+45 2010 2030', 1600000, 'confirmed'),
  ('66666666-6666-6666-6666-666666666002', 'B-TEST-0002', '22222222-2222-2222-2222-222222222002', '44444444-4444-4444-4444-444444444001', now() - interval '8 hours', now() - interval '6 hours', 4, 'Anne', 'anne@nordicevents.dk', '+45 3020 3040', 800000, 'confirmed');

insert into public.manual_amounts (manual_amount_id, manual_amount_booking_id, manual_amount_amount_ore, manual_amount_note, manual_amount_created_by) values
  ('88888888-8888-8888-8888-888888888001', '66666666-6666-6666-6666-666666666001', 45000, 'Ekstra rengøring', '11111111-1111-1111-1111-111111111001');
-- Company session (Rituals): reads its own amount, writes nothing.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111002","role":"authenticated"}';

select is((select count(*) from public.manual_amounts), 1::bigint, 'company reads its own manual amounts');
select is((select manual_amount_note from public.manual_amounts), 'Ekstra rengøring', 'company reads its own manual amount note');
select throws_ok(
  'insert into public.manual_amounts (manual_amount_booking_id, manual_amount_amount_ore, manual_amount_note) values (''66666666-6666-6666-6666-666666666001'', 10000, ''Ekstra tid'')',
  '42501', null,
  'company cannot add a manual amount');
update public.manual_amounts set manual_amount_amount_ore = 1 where true;
delete from public.manual_amounts where true;
select is((select manual_amount_amount_ore from public.manual_amounts), 45000, 'nobody updates or deletes manual amounts (row unchanged)');

-- Other company session (Nordic): Rituals' amount is invisible.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111003","role":"authenticated"}';
select is((select count(*) from public.manual_amounts), 0::bigint, 'foreign manual amounts are invisible');

-- Admin session: sees all, adds to any booking.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111001","role":"authenticated","app_role":"admin"}';
select is(
  (select count(*) from public.manual_amounts where manual_amount_booking_id in (
    '66666666-6666-6666-6666-666666666001', '66666666-6666-6666-6666-666666666002')),
  1::bigint,
  'admin sees all manual amounts (fixture bookings)');
select lives_ok(
  'insert into public.manual_amounts (manual_amount_id, manual_amount_booking_id, manual_amount_amount_ore, manual_amount_note, manual_amount_created_by) values (''88888888-8888-8888-8888-888888888002'', ''66666666-6666-6666-6666-666666666002'', 10000, ''Ekstra tid'', auth.uid())',
  'admin adds a manual amount to a booking');
select is(
  (select manual_amount_created_by from public.manual_amounts where manual_amount_id = '88888888-8888-8888-8888-888888888002'),
  '11111111-1111-1111-1111-111111111001'::uuid,
  'admin insert records the audit creator');
select lives_ok(
  'delete from public.manual_amounts where manual_amount_id = ''88888888-8888-8888-8888-888888888002''',
  'admin removes a manual amount');
select is(
  (select count(*) from public.manual_amounts),
  1::bigint,
  'admin delete removes only that amount');

select * from finish();
rollback;
