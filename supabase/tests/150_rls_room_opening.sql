-- RLS for the opening-hours tables (#3): companies read them (they need to
-- see when a room can be booked), admin manages them. Also the storage
-- policies for the room-images bucket: authenticated read, admin-only writes.

begin;
select plan(15);

-- Fixtures: one admin, one company, one room with weekly hours and one
-- special closing day. Counts are scoped to the fixture room so the seed
-- data never leaks into the assertions.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111001', 'authenticated', 'authenticated', 'admin@tsh.test', 'x', now(), '{"app_role":"admin"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111002', 'authenticated', 'authenticated', 'rituals@tsh.test', 'x', now(), '{}', '{}', now(), now());

insert into public.companies (company_id, company_auth_user_id, company_email, company_display_name) values
  ('22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111002', 'rituals@tsh.test', 'Rituals');

insert into public.rooms (room_id, room_name, room_capacity, room_hourly_price_ore) values
  ('44444444-4444-4444-4444-444444444001', 'Room of Power', 12, 800000);

insert into public.room_opening_hours (room_opening_hour_id, room_opening_hour_room_id, room_opening_hour_day_of_week, room_opening_hour_opens, room_opening_hour_closes, room_opening_hour_is_closed) values
  ('AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAA01', '44444444-4444-4444-4444-444444444001', 0, '08:00', '18:00', false),
  ('AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAA02', '44444444-4444-4444-4444-444444444001', 6, '08:00', '18:00', true);

insert into public.room_special_closing_days (
  room_special_closing_day_id, room_special_closing_day_room_id,
  room_special_closing_day_date, room_special_closing_day_opens,
  room_special_closing_day_closes, room_special_closing_day_is_closed
) values
  ('BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBB01', '44444444-4444-4444-4444-444444444001', date '2026-12-24', null, null, true),
  ('BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBB02', '44444444-4444-4444-4444-444444444001', date '2026-12-31', '09:00', '13:00', false);

-- Company session (Rituals).
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111002","role":"authenticated"}';

select is(
  (select count(*) from public.room_opening_hours where room_opening_hour_room_id = '44444444-4444-4444-4444-444444444001'),
  2::bigint, 'company reads weekly opening hours');
select is((select count(*) from public.room_special_closing_days), 2::bigint, 'company reads special closing days');
select throws_ok(
  'insert into public.room_opening_hours (room_opening_hour_room_id, room_opening_hour_day_of_week, room_opening_hour_opens, room_opening_hour_closes) values (''44444444-4444-4444-4444-444444444001'', 3, ''08:00'', ''18:00'')',
  '42501', null,
  'company cannot create opening hours');
select lives_ok(
  'update public.room_opening_hours set room_opening_hour_closes = ''19:00'' where room_opening_hour_id = ''AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAA01''',
  'company opening-hours update is silently scoped to zero rows');
select is(
  (select room_opening_hour_closes from public.room_opening_hours where room_opening_hour_id = 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAA01'),
  '18:00'::time, 'company could not change opening hours');
select lives_ok(
  'delete from public.room_special_closing_days',
  'company special-day delete is silently scoped to zero rows');
select is((select count(*) from public.room_special_closing_days), 2::bigint, 'company could not delete special closing days');

-- Admin session: full management rights.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111001","role":"authenticated","app_role":"admin"}';
select lives_ok(
  'insert into public.room_opening_hours (room_opening_hour_room_id, room_opening_hour_day_of_week, room_opening_hour_opens, room_opening_hour_closes, room_opening_hour_is_closed) values (''44444444-4444-4444-4444-444444444001'', 5, ''08:00'', ''14:00'', false)',
  'admin creates a weekly opening hour');
select lives_ok(
  'update public.room_opening_hours set room_opening_hour_is_closed = true where room_opening_hour_day_of_week = 5 and room_opening_hour_room_id = ''44444444-4444-4444-4444-444444444001''',
  'admin closes a weekday');
select lives_ok(
  'delete from public.room_opening_hours where room_opening_hour_id = ''AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAA01''',
  'admin deletes a weekly opening hour');
select lives_ok(
  'insert into public.room_special_closing_days (room_special_closing_day_room_id, room_special_closing_day_date, room_special_closing_day_is_closed) values (''44444444-4444-4444-4444-444444444001'', date ''2026-06-05'', true)',
  'admin adds a closed special day');
select lives_ok(
  'update public.room_special_closing_days set room_special_closing_day_is_closed = false, room_special_closing_day_opens = ''10:00'', room_special_closing_day_closes = ''16:00'' where room_special_closing_day_id = ''BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBB01''',
  'admin edits a special day to open hours');
select lives_ok(
  'delete from public.room_special_closing_days where room_special_closing_day_date = date ''2026-12-31''',
  'admin deletes a special day');

-- Storage: the room-images bucket is admin-write. (Deletion goes through the
-- Storage API; a guard trigger blocks direct DELETE from storage.objects.)
select lives_ok(
  'insert into storage.objects (bucket_id, name) values (''room-images'', ''rooms/x.jpg'')',
  'admin uploads to the room-images bucket');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111002","role":"authenticated"}';
select throws_ok(
  'insert into storage.objects (bucket_id, name) values (''room-images'', ''rooms/x.jpg'')',
  '42501', null,
  'company cannot upload room images');

select * from finish();
rollback;
