-- Integrity tests for save_house_event (#12): an event and its rooms are
-- saved in one transaction, so a refused room leaves nothing behind; an
-- edit moves the rooms and the times together; the function stays
-- admin-only through RLS (security invoker).

begin;
select plan(11);

-- Fixtures: one admin, one company, two rooms, one confirmed booking on
-- Room of Power 09:00-11:00 (buffer until 11:30).
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111001', 'authenticated', 'authenticated', 'admin@tsh.test', 'x', now(), '{"app_role":"admin"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111002', 'authenticated', 'authenticated', 'rituals@tsh.test', 'x', now(), '{}', '{}', now(), now());

insert into public.companies (company_id, company_auth_user_id, company_email, company_display_name) values
  ('22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111002', 'rituals@tsh.test', 'Rituals');

insert into public.rooms (room_id, room_name, room_capacity, room_hourly_price_ore) values
  ('44444444-4444-4444-4444-444444444001', 'Room of Power', 12, 800000),
  ('44444444-4444-4444-4444-444444444002', 'The Loft', 20, 1200000);

insert into public.bookings (booking_id, booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values
  ('66666666-6666-6666-6666-666666666001', '22222222-2222-2222-2222-222222222001', '44444444-4444-4444-4444-444444444001', 'confirmed', timestamptz '2026-10-01 09:00+02', timestamptz '2026-10-01 11:00+02', 8, 'Peter', 'peter@rituals.dk', '+45 2010 2030', 1600000);

-- Company session: the function exists for them, RLS refuses the write.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111002","role":"authenticated"}';
select throws_ok(
  $$select public.save_house_event(p_description := 'x', p_start_at := timestamptz '2026-10-02 09:00+02', p_end_at := timestamptz '2026-10-02 10:00+02', p_room_ids := array['44444444-4444-4444-4444-444444444002']::uuid[], p_title := 'x')$$,
  '42501', null,
  'a company cannot save a house event');

-- Admin session.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111001","role":"authenticated","app_role":"admin"}';

select throws_ok(
  $$select public.save_house_event(p_description := 'x', p_start_at := timestamptz '2026-10-02 09:00+02', p_end_at := timestamptz '2026-10-02 10:00+02', p_room_ids := array[]::uuid[], p_title := 'x')$$,
  '22023', null,
  'an event without rooms is refused');

-- Both rooms, but Room of Power is taken until 11:30 (buffer): the whole
-- save is refused and no half-saved event remains.
select throws_ok(
  $$select public.save_house_event(p_description := 'Product launch', p_start_at := timestamptz '2026-10-01 11:00+02', p_end_at := timestamptz '2026-10-01 12:00+02', p_room_ids := array['44444444-4444-4444-4444-444444444002', '44444444-4444-4444-4444-444444444001']::uuid[], p_title := 'Launch')$$,
  '23P01', null,
  'an event on a booked room (incl. its buffer) is refused');
select is((select count(*) from public.house_events), 0::bigint, 'a refused save leaves no event behind');
select is((select count(*) from public.house_event_rooms), 0::bigint, 'a refused save leaves no rooms behind');

-- A free period on both rooms is saved with both rooms.
select lives_ok(
  $$select public.save_house_event(p_description := 'Product launch', p_start_at := timestamptz '2026-10-01 12:00+02', p_end_at := timestamptz '2026-10-01 14:00+02', p_room_ids := array['44444444-4444-4444-4444-444444444001', '44444444-4444-4444-4444-444444444002']::uuid[], p_title := 'Launch')$$,
  'an event on free rooms is saved');
select is(
  (select count(*) from public.house_event_rooms her join public.house_events he on he.house_event_id = her.house_event_room_event_id where he.house_event_title = 'Launch'),
  2::bigint,
  'the saved event blocks both rooms');

-- Edit: drop Room of Power and move earlier, into the slot Room of Power's
-- booking holds. Allowed, because the room leaves the event first.
select lives_ok(
  $$select public.save_house_event(p_description := 'Moved', p_start_at := timestamptz '2026-10-01 10:00+02', p_end_at := timestamptz '2026-10-01 11:00+02', p_room_ids := array['44444444-4444-4444-4444-444444444002']::uuid[], p_title := 'Launch', p_house_event_id := (select house_event_id from public.house_events where house_event_title = 'Launch'))$$,
  'an edit that drops a room can move into that room''s booked time');
select is(
  (select array_agg(her.house_event_room_room_id) from public.house_event_rooms her),
  array['44444444-4444-4444-4444-444444444002']::uuid[],
  'the edit keeps only the rooms it was given');

-- Edit: add Room of Power back at the booked time. Refused, and the event
-- keeps its previous state.
select throws_ok(
  $$select public.save_house_event(p_description := 'Again', p_start_at := timestamptz '2026-10-01 10:00+02', p_end_at := timestamptz '2026-10-01 11:00+02', p_room_ids := array['44444444-4444-4444-4444-444444444001', '44444444-4444-4444-4444-444444444002']::uuid[], p_title := 'Launch', p_house_event_id := (select house_event_id from public.house_events where house_event_title = 'Launch'))$$,
  '23P01', null,
  'an edit that adds a booked room is refused');

select throws_ok(
  $$select public.save_house_event(p_description := 'x', p_start_at := timestamptz '2026-10-03 09:00+02', p_end_at := timestamptz '2026-10-03 10:00+02', p_room_ids := array['44444444-4444-4444-4444-444444444002']::uuid[], p_title := 'x', p_house_event_id := '99999999-9999-9999-9999-999999999999')$$,
  'P0002', null,
  'editing an unknown event is refused');

select * from finish();
rollback;
