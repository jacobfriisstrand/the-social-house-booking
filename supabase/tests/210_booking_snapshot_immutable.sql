-- Snapshot immutability (#24, ADR-0005): the frozen price columns cannot
-- change once a booking is confirmed; status, cancellation columns, and a
-- pending booking's columns stay writable. Add-on rows freeze with the
-- booking: no insert, update, or delete on a confirmed booking's add-ons.

begin;
select plan(11);

-- Fixtures: one company, one room, one pending and one confirmed booking,
-- one add-on each.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111002', 'authenticated', 'authenticated', 'rituals@tsh.test', 'x', now(), '{}', '{}', now(), now());

insert into public.companies (company_id, company_auth_user_id, company_username, company_email, company_display_name) values
  ('22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111002', 'test-rituals', 'rituals@tsh.test', 'Rituals');

insert into public.rooms (room_id, room_name, room_capacity, room_price_ore, room_opens_at, room_closes_at) values
  ('44444444-4444-4444-4444-444444444001', 'Room of Power', 12, 800000, '08:00', '18:00');

insert into public.bookings (booking_id, booking_company_id, booking_room_id, booking_status, booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_room_price_ore) values
  ('66666666-6666-6666-6666-666666666001', '22222222-2222-2222-2222-222222222001', '44444444-4444-4444-4444-444444444001', 'pending_verification', timestamptz '2026-10-01 09:00+02', timestamptz '2026-10-01 11:00+02', 8, 'Peter', 'peter@rituals.dk', '+45 2010 2030', 1600000),
  ('66666666-6666-6666-6666-666666666002', '22222222-2222-2222-2222-222222222001', '44444444-4444-4444-4444-444444444001', 'pending_verification', timestamptz '2026-10-02 09:00+02', timestamptz '2026-10-02 11:00+02', 8, 'Peter', 'peter@rituals.dk', '+45 2010 2030', 1600000);

insert into public.addons (addon_id, addon_name, addon_price_ore, addon_pricing_model) values
  ('55555555-5555-5555-5555-555555555001', 'Lunch', 22500, 'per_participant'),
  ('55555555-5555-5555-5555-555555555002', 'Host service', 5000, 'fixed');

insert into public.booking_addons (booking_addon_booking_id, booking_addon_addon_id, booking_addon_price_ore) values
  ('66666666-6666-6666-6666-666666666001', '55555555-5555-5555-5555-555555555001', 180000),
  ('66666666-6666-6666-6666-666666666002', '55555555-5555-5555-5555-555555555001', 180000);

-- Booking 002 starts pending so its add-on rows can exist; it is confirmed
-- here, which itself changes no snapshot column.
update public.bookings set booking_status = 'confirmed'
where booking_id = '66666666-6666-6666-6666-666666666002';

-- The pending booking is still negotiable.
select lives_ok(
  'update public.bookings set booking_room_price_ore = 1700000, booking_discount_percent = 10, booking_addon_total_ore = 190000, booking_expected_total_ore = 1720000, booking_cancellation_terms = ''Free until 24h before'' where booking_status = ''pending_verification''',
  'a pending booking''s snapshot columns stay writable');

-- The confirmed booking is frozen, column by column.
select throws_ok(
  'update public.bookings set booking_room_price_ore = 1700000 where booking_id = ''66666666-6666-6666-6666-666666666002''',
  'P0001', null,
  'confirmed room price is frozen');
select throws_ok(
  'update public.bookings set booking_discount_percent = 10 where booking_id = ''66666666-6666-6666-6666-666666666002''',
  'P0001', null,
  'confirmed discount is frozen');
select throws_ok(
  'update public.bookings set booking_addon_total_ore = 190000 where booking_id = ''66666666-6666-6666-6666-666666666002''',
  'P0001', null,
  'confirmed add-on total is frozen');
select throws_ok(
  'update public.bookings set booking_expected_total_ore = 1720000 where booking_id = ''66666666-6666-6666-6666-666666666002''',
  'P0001', null,
  'confirmed expected total is frozen');
select throws_ok(
  'update public.bookings set booking_cancellation_terms = ''Newer terms'' where booking_id = ''66666666-6666-6666-6666-666666666002''',
  'P0001', null,
  'confirmed cancellation terms are frozen');

-- Add-on rows freeze with the booking.
select throws_ok(
  'insert into public.booking_addons (booking_addon_booking_id, booking_addon_addon_id, booking_addon_price_ore) values (''66666666-6666-6666-6666-666666666002'', ''55555555-5555-5555-5555-555555555002'', 5000)',
  'P0001', null,
  'no add-on can be added to a confirmed booking');
select throws_ok(
  'update public.booking_addons set booking_addon_price_ore = 190000 where booking_addon_booking_id = ''66666666-6666-6666-6666-666666666002''',
  'P0001', null,
  'a confirmed booking''s add-on price is frozen');
select throws_ok(
  'delete from public.booking_addons where booking_addon_booking_id = ''66666666-6666-6666-6666-666666666002''',
  'P0001', null,
  'a confirmed booking''s add-on cannot be removed');

-- Status and cancellation columns remain writable (ADR-0006).
select lives_ok(
  'update public.bookings set booking_status = ''cancelled'', booking_cancelled_at = now(), booking_cancellation_fee_ore = 1000 where booking_id = ''66666666-6666-6666-6666-666666666002''',
  'cancelling a confirmed booking is allowed');

-- And a pending booking's add-ons are still editable.
select lives_ok(
  'update public.booking_addons set booking_addon_price_ore = 190000 where booking_addon_booking_id = ''66666666-6666-6666-6666-666666666001''',
  'a pending booking''s add-on price stays writable');

select * from finish();
rollback;
