-- Add-on line integrity (#7, ADR-0011): the line total is unit × quantity
-- (constraint), the quantity rule is the headcount for per-participant
-- add-ons and 1 for fixed ones (trigger), and the booking's frozen add-on
-- total plus expected total follow the lines (sync trigger). A House Host
-- price override rides on the line's unit price without touching the
-- catalogue.

begin;
select plan(18);

-- Fixtures: one company, one room, one fixed and one per-participant
-- add-on, one pending booking for 10 participants.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111002', 'authenticated', 'authenticated', 'rituals@tsh.test', 'x', now(), '{}', '{}', now(), now());

insert into public.companies (company_id, company_auth_user_id, company_email, company_display_name) values
  ('22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111002', 'rituals@tsh.test', 'Rituals');

insert into public.rooms (room_id, room_name, room_capacity, room_hourly_price_ore) values
  ('44444444-4444-4444-4444-444444444001', 'Room of Power', 12, 800000);

insert into public.addons (addon_id, addon_name, addon_price_ore, addon_pricing_model) values
  ('55555555-5555-5555-5555-555555555001', 'Lunch', 22500, 'per_participant'),
  ('55555555-5555-5555-5555-555555555002', 'House Host', 100000, 'fixed');

insert into public.bookings (booking_id, booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore, booking_expected_total_ore) values
  ('66666666-6666-6666-6666-666666666001', '22222222-2222-2222-2222-222222222001', '44444444-4444-4444-4444-444444444001', 'pending_verification', timestamptz '2026-10-01 09:00+02', timestamptz '2026-10-01 11:00+02', 10, 'Peter', 'peter@rituals.dk', '+45 2010 2030', 1600000, 1600000);

-- The line rules raise on wrong quantities.
select throws_ok(
  'insert into public.booking_addons (booking_addon_booking_id, booking_addon_addon_id, booking_addon_unit_price_ore, booking_addon_quantity, booking_addon_total_ore) values (''66666666-6666-6666-6666-666666666001'', ''55555555-5555-5555-5555-555555555001'', 22500, 8, 180000)',
  'P0001', null,
  'a per-participant line''s quantity must equal the participant count');
select throws_ok(
  'insert into public.booking_addons (booking_addon_booking_id, booking_addon_addon_id, booking_addon_unit_price_ore, booking_addon_quantity, booking_addon_total_ore) values (''66666666-6666-6666-6666-666666666001'', ''55555555-5555-5555-5555-555555555002'', 100000, 2, 200000)',
  'P0001', null,
  'a fixed line''s quantity must be 1');
select throws_ok(
  'insert into public.booking_addons (booking_addon_booking_id, booking_addon_addon_id, booking_addon_unit_price_ore, booking_addon_quantity, booking_addon_total_ore) values (''66666666-6666-6666-6666-666666666001'', ''55555555-5555-5555-5555-555555555001'', 22500, 10, 100000)',
  '23514', null,
  'the line total must be unit price × quantity');
select throws_ok(
  'insert into public.booking_addons (booking_addon_booking_id, booking_addon_addon_id, booking_addon_unit_price_ore, booking_addon_quantity, booking_addon_total_ore) values (''66666666-6666-6666-6666-666666666001'', ''55555555-5555-5555-5555-555555555002'', 22500, 0, 0)',
  'P0001', null,
  'a fixed line''s quantity of 0 fails the quantity rule');

-- Correct lines: lunch for 10 (22500 × 10) and House Host with an admin's
-- per-booking override of 150000 (catalogue stays 100000). The sync
-- trigger moves the booking's add-on total to 375000 and the expected
-- total by the same delta.
insert into public.booking_addons (booking_addon_booking_id, booking_addon_addon_id, booking_addon_unit_price_ore, booking_addon_quantity, booking_addon_total_ore) values
  ('66666666-6666-6666-6666-666666666001', '55555555-5555-5555-5555-555555555001', 22500, 10, 225000),
  ('66666666-6666-6666-6666-666666666001', '55555555-5555-5555-5555-555555555002', 150000, 1, 150000);

select is(
  (select booking_addon_total_ore from public.bookings where booking_id = '66666666-6666-6666-6666-666666666001'),
  375000,
  'the frozen add-on total is the sum of the line totals');
select is(
  (select booking_expected_total_ore from public.bookings where booking_id = '66666666-6666-6666-6666-666666666001'),
  1975000,
  'the expected total moves by the add-on delta');
select is(
  (select addon_price_ore from public.addons where addon_id = '55555555-5555-5555-5555-555555555002'),
  100000,
  'the catalogue keeps the House Host base price (#7 override)');

-- A participant-count change before confirmation rewrites the lines; the
-- sync trigger follows (booking first, then the lines).
update public.bookings set booking_participant_count = 12
where booking_id = '66666666-6666-6666-6666-666666666001';
update public.booking_addons set booking_addon_quantity = 12, booking_addon_total_ore = 270000
where booking_addon_booking_id = '66666666-6666-6666-6666-666666666001'
  and booking_addon_addon_id = '55555555-5555-5555-5555-555555555001';

select is(
  (select booking_addon_total_ore from public.bookings where booking_id = '66666666-6666-6666-6666-666666666001'),
  420000,
  'the add-on total recomputes when the participant count changes');

-- Removing a line re-syncs too.
delete from public.booking_addons
where booking_addon_booking_id = '66666666-6666-6666-6666-666666666001'
  and booking_addon_addon_id = '55555555-5555-5555-5555-555555555002';

select is(
  (select booking_addon_total_ore from public.bookings where booking_id = '66666666-6666-6666-6666-666666666001'),
  270000,
  'the add-on total follows a removed line');
select is(
  (select booking_expected_total_ore from public.bookings where booking_id = '66666666-6666-6666-6666-666666666001'),
  1870000,
  'the expected total follows a removed line');

-- Confirmation freezes the totals; a final write attempt raises.
update public.bookings set booking_status = 'confirmed'
where booking_id = '66666666-6666-6666-6666-666666666001';
select is(
  (select booking_addon_total_ore from public.bookings where booking_id = '66666666-6666-6666-6666-666666666001'),
  270000,
  'confirmation freezes the recomputed add-on total');
select throws_ok(
  'insert into public.booking_addons (booking_addon_booking_id, booking_addon_addon_id, booking_addon_unit_price_ore, booking_addon_quantity, booking_addon_total_ore) values (''66666666-6666-6666-6666-666666666001'', ''55555555-5555-5555-5555-555555555002'', 100000, 1, 100000)',
  'P0001', null,
  'no add-on lines are written after confirmation');

-- (#7) Deactivating an add-on after confirmation must not touch the
-- booking: the snapshot line is frozen, the totals stay, and the add-on
-- simply stops being offered for a room's future selections.
insert into public.room_addons (room_addon_room_id, room_addon_addon_id) values
  ('44444444-4444-4444-4444-444444444001', '55555555-5555-5555-5555-555555555001');

update public.addons set addon_is_active = false
where addon_id = '55555555-5555-5555-5555-555555555001';

select is(
  (select booking_addon_unit_price_ore from public.booking_addons
    where booking_addon_booking_id = '66666666-6666-6666-6666-666666666001'
      and booking_addon_addon_id = '55555555-5555-5555-5555-555555555001'),
  22500,
  'the frozen line keeps its unit price after the add-on is deactivated');
select is(
  (select booking_addon_total_ore from public.booking_addons
    where booking_addon_booking_id = '66666666-6666-6666-6666-666666666001'
      and booking_addon_addon_id = '55555555-5555-5555-5555-555555555001'),
  270000,
  'the frozen line keeps its total after the add-on is deactivated');
select is(
  (select booking_addon_total_ore from public.bookings where booking_id = '66666666-6666-6666-6666-666666666001'),
  270000,
  'the booking''s add-on total is untouched by the deactivation');
select is(
  (select booking_expected_total_ore from public.bookings where booking_id = '66666666-6666-6666-6666-666666666001'),
  1870000,
  'the expected total is untouched by the deactivation');
select is(
  (select count(*)::integer from public.room_addons r
    join public.addons a on a.addon_id = r.room_addon_addon_id
    where r.room_addon_room_id = '44444444-4444-4444-4444-444444444001'
      and a.addon_is_active),
  0,
  'a deactivated add-on is no longer offered for the room');

-- The catering acceptance timestamp is settable on a booking (Bilag 1
-- "Forplejning og hospitality").
select lives_ok(
  'update public.bookings set booking_catering_accepted_at = now() where booking_id = ''66666666-6666-6666-6666-666666666001''',
  'the catering acceptance timestamp is writable');

select * from finish();
rollback;
