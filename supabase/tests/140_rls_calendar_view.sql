-- RLS tests for the calendar_entries projection (#12/#19): any
-- authenticated user sees every non-cancelled booking (Display name only)
-- and every house event; anon sees zero rows because the gate is in the
-- definition; booker/PII columns do not exist on the view.

begin;
select plan(9);

-- Fixtures: two companies with bookings, one house event blocking a room,
-- one cancelled booking that must not appear.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111001', 'authenticated', 'authenticated', 'admin@tsh.test', 'x', now(), '{"app_role":"admin"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111002', 'authenticated', 'authenticated', 'rituals@tsh.test', 'x', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111003', 'authenticated', 'authenticated', 'nordic@tsh.test', 'x', now(), '{}', '{}', now(), now());

insert into public.companies (company_id, company_auth_user_id, company_username, company_email, company_display_name) values
  ('22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111002', 'test-rituals', 'rituals@tsh.test', 'Rituals'),
  ('22222222-2222-2222-2222-222222222002', '11111111-1111-1111-1111-111111111003', 'test-nordic', 'nordic@tsh.test', 'Nordic Events');

insert into public.rooms (room_id, room_name, room_capacity, room_price_ore, room_opens_at, room_closes_at) values
  ('44444444-4444-4444-4444-444444444001', 'Room of Power', 12, 800000, '08:00', '18:00');

insert into public.bookings (booking_id, booking_number, booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values
  ('66666666-6666-6666-6666-666666666001', 'B-TEST-0001', '22222222-2222-2222-2222-222222222001', '44444444-4444-4444-4444-444444444001', 'confirmed', timestamptz '2026-10-01 09:00+02', timestamptz '2026-10-01 11:00+02', 8, 'Peter', 'peter@rituals.dk', '+45 2010 2030', 1600000),
  ('66666666-6666-6666-6666-666666666002', 'B-TEST-0002', '22222222-2222-2222-2222-222222222001', '44444444-4444-4444-4444-444444444001', 'cancelled', timestamptz '2026-10-02 09:00+02', timestamptz '2026-10-02 11:00+02', 8, 'Peter', 'peter@rituals.dk', '+45 2010 2030', 1600000);

insert into public.house_events (house_event_id, house_event_title, house_event_description, house_event_start_at, house_event_end_at) values
  ('99999999-9999-9999-9999-999999999001', 'Strategy day', 'Internal strategy day', timestamptz '2026-10-05 09:00+02', timestamptz '2026-10-05 16:00+02');

insert into public.house_event_rooms (house_event_room_event_id, house_event_room_room_id) values
  ('99999999-9999-9999-9999-999999999001', '44444444-4444-4444-4444-444444444001');

-- Anonymous: the view gate excludes everything.
set local role anon;
select is((select count(*) from public.calendar_entries), 0::bigint, 'anon sees zero calendar entries');
set local role authenticated;

-- Company session (Rituals): cross-company projection without PII.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111002","role":"authenticated"}';
select is((select count(*) from public.calendar_entries), 2::bigint, 'company sees confirmed bookings + house events (not cancelled)');
select is((select count(*) from public.calendar_entries where calendar_entry_kind = 'booking' and company_display_name = 'Rituals'), 1::bigint, 'booking entry carries Display name only');
select is((select count(*) from public.calendar_entries where calendar_entry_kind = 'house_event' and house_event_title = 'Strategy day'), 1::bigint, 'house event entry carries its title');
select is((select calendar_entry_id from public.calendar_entries where calendar_entry_kind = 'house_event'), '99999999-9999-9999-9999-999999999001', 'house event id is exposed for calendar joins');
select is((
  select count(*) from information_schema.columns
  where table_schema = 'public' and table_name = 'calendar_entries'
    and (column_name like '%booker%' or column_name like '%note%' or column_name like '%participant%')
), 0::bigint, 'view exposes no booker/notes/participant columns');
select is((select count(*) from public.bookings), 2::bigint, 'base bookings stay own-only (incl. cancelled history)');

-- Admin sees the same projection (already covered by any-authenticated) and
-- keeps full base-table access.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111001","role":"authenticated","app_role":"admin"}';
select is((select count(*) from public.calendar_entries), 2::bigint, 'admin sees the projection');
select is((select count(*) from public.bookings), 2::bigint, 'admin sees all base bookings');

select * from finish();
rollback;
