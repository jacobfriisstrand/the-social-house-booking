-- Local seed: runs on `supabase db reset` only, never against cloud projects
-- (docs/agents/supabase.md). Cloud admins come from scripts/create-admin.ts.
--
-- Demo logins (all with password "password"; email is the login):
--   admin@thesocialhouse.dk      app_role = admin
--   kontakt@rituals.dk           member company, 50% discount
--   booking@nordicevents.dk      external company, 0% discount
--
-- Bookings: each company gets past and upcoming rows (incl. cancelled ones
-- with fees) so the overview, sheet, and cancellation flows have realistic
-- data after every reset. Pending holds are not seeded — a real hold lives
-- only minutes — so QA creates its own through the booking flow.

begin;
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  phone, phone_change, phone_change_token,
  created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated',
    'admin@thesocialhouse.dk',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{"app_role": "admin"}',
    '{}',
    '', '', '', '',
    '+4500000001', '', '',
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated',
    'kontakt@rituals.dk',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{}',
    '{}',
    '', '', '', '',
    '+4500000002', '', '',
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000003',
    'authenticated', 'authenticated',
    'booking@nordicevents.dk',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{}',
    '{}',
    '', '', '', '',
    '+4500000003', '', '',
    now(), now()
  );

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
select
  u.id, u.id, u.id,
  jsonb_build_object('sub', u.id, 'email', u.email, 'email_verified', true),
  'email', u.created_at, u.created_at, u.updated_at
from auth.users u
where u.id in (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003'
);

insert into public.admins (
  admin_id, admin_auth_user_id, admin_display_name
) values (
  '00000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-000000000001',
  'The Social House'
);

insert into public.companies (
  company_id, company_auth_user_id, company_email,
  company_display_name, company_legal_name, company_membership_status,
  company_discount_percent, company_cvr_number, company_contact_name,
  company_billing_address, company_billing_postal_code, company_billing_city,
  company_billing_country, company_invoice_email, company_reference,
  company_economic_customer_number, company_master_data_completed_at
) values
  (
    '00000000-0000-0000-0000-0000000000b2',
    '00000000-0000-0000-0000-000000000002',
    'kontakt@rituals.dk',
    'Rituals', 'Rituals ApS', 'member',
    50, '12345678', 'Peter Pedersen',
    'Strøget 1', '1160', 'København K', 'Danmark',
    'faktura@rituals.dk', 'RIT-2024',
    '10042', now()
  ),
  (
    '00000000-0000-0000-0000-0000000000b3',
    '00000000-0000-0000-0000-000000000003',
    'booking@nordicevents.dk',
    'Nordic Events', 'Nordic Events ApS', 'external',
    0, '87654321', 'Ali Hassan',
    'Havnegade 12', '1058', 'København K', 'Danmark',
    'regnskab@nordicevents.dk', null,
    null, now()
  );

insert into public.rooms (
  room_id, room_name, room_description, room_location,
  room_capacity, room_hourly_price_ore, room_practical_notes
) values
  (
    '00000000-0000-0000-0000-0000000000c1',
    'Room of Power',
    'Det store mødelokale med plads til store møder og workshops.',
    '1. sal',
    12, 80000,
    'Skærm, whiteboard og kaffeautomat. Husk at rykke borde og stole tilbage.'
  ),
  (
    '00000000-0000-0000-0000-0000000000c2',
    'Room of Art',
    'Lyst kreativt lokale med langbord og god naturlig lys.',
    'Stueetage',
    6, 40000,
    'Kaffe og te kan hentes i køkkenet.'
  );

-- Weekly opening hours: day_of_week 0 = Monday … 6 = Sunday.
insert into public.room_opening_hours (
  room_opening_hour_room_id, room_opening_hour_day_of_week,
  room_opening_hour_opens, room_opening_hour_closes, room_opening_hour_is_closed
) values
  ('00000000-0000-0000-0000-0000000000c1', 0, '08:00', '18:00', false),
  ('00000000-0000-0000-0000-0000000000c1', 1, '08:00', '18:00', false),
  ('00000000-0000-0000-0000-0000000000c1', 2, '08:00', '18:00', false),
  ('00000000-0000-0000-0000-0000000000c1', 3, '08:00', '18:00', false),
  ('00000000-0000-0000-0000-0000000000c1', 4, '08:00', '18:00', false),
  ('00000000-0000-0000-0000-0000000000c1', 5, '08:00', '14:00', false),
  ('00000000-0000-0000-0000-0000000000c1', 6, '08:00', '18:00', true),
  ('00000000-0000-0000-0000-0000000000c2', 0, '09:00', '17:00', false),
  ('00000000-0000-0000-0000-0000000000c2', 1, '09:00', '17:00', false),
  ('00000000-0000-0000-0000-0000000000c2', 2, '09:00', '17:00', false),
  ('00000000-0000-0000-0000-0000000000c2', 3, '09:00', '17:00', false),
  ('00000000-0000-0000-0000-0000000000c2', 4, '09:00', '17:00', false),
  ('00000000-0000-0000-0000-0000000000c2', 5, '09:00', '17:00', false),
  ('00000000-0000-0000-0000-0000000000c2', 6, '09:00', '17:00', true);

-- House Service and House Host also ship from migration
-- 20260917120000_seed_house_addons.sql; the on conflict guard keeps this
-- insert from colliding with it on `db reset`.
insert into public.addons (
  addon_id, addon_name, addon_description, addon_price_ore, addon_pricing_model,
  addon_sort_order
) values
  (
    '00000000-0000-0000-0000-0000000000d1',
    'House Service',
    'The Social House gør lokalet klar og rydder op efter mødet. Kaffe, te og vand, som I bestiller, serveres og ryddes bort. Til mindre møder uden forplejning: højst 5 deltagere og højst 4 timer.',
    50000, 'fixed',
    1
  ),
  (
    '00000000-0000-0000-0000-0000000000d2',
    'House Host',
    'Vært til stede under mødet: forberedelse og opsætning, servering af bestilt forplejning, praktisk hjælp og koordinering af særlige ønsker. Standardprisen er 1.000 kr ekskl. moms pr. mødedag. Anbefales ved mere end 5 deltagere, frokost eller anden forplejning, møder over 4 timer eller særlig opsætning. Over 15 deltagere eller komplekse behov: pris og briefing aftales særskilt.',
    100000, 'fixed',
    2
  ),
  (
    '00000000-0000-0000-0000-0000000000d3',
    'Lunch',
    'Leveret sandwichmenu med tilbehør. Beregnes pr. deltager.',
    22500, 'per_participant',
    3
  ),
  (
    '00000000-0000-0000-0000-0000000000d4',
    'Ekstra skærm',
    'Ekstra 55" skærm i lokalet til præsentation.',
    50000, 'fixed',
    4
  )
on conflict (addon_id) do nothing;

insert into public.room_addons (room_addon_room_id, room_addon_addon_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d2'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d3'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d4'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000d3');

-- ---------------------------------------------------------------------------
-- Demo bookings (#5): past and upcoming rows for each company so the booking
-- overview, the sheet, and the cancellation flows carry realistic data after
-- every reset. Numbers come from the bookings_assign_number trigger; add-on
-- lines are written while the booking is still pending and freeze with the
-- confirmation (ADR-0005), mirroring the app's write order. Dates are
-- relative to the reset, so "upcoming" stays upcoming; an offset lands on
-- whatever weekday follows the reset, and only the slot picker enforces
-- opening hours — a seeded row outside them is cosmetic.
--
-- Bookers: Peter Pedersen and Mette Lund (Rituals, 50 %), Ali Hassan
-- (Nordic Events, 0 %). Fees follow ADR-0006 on the member price:
--   e3  cancelled the same morning              → 100 % = 80 000 øre
--   e4  cancelled two days ahead                → 50 %  = 10 000 øre
--   e9  cancelled five days ahead               → free tier, 0 øre
--   f3  cancelled by admin inside 24 h, waived  → computed 100 %

create function pg_temp.local_at(p_days integer, p_time time)
returns timestamptz
language sql
immutable
as $$
  select (current_date + p_days + p_time) at time zone 'Europe/Copenhagen';
$$;

insert into public.bookings (
  booking_id, booking_company_id, booking_room_id, booking_status,
  booking_start_at, booking_end_at, booking_participant_count,
  booking_booker_name, booking_booker_email, booking_booker_phone,
  booking_reference, booking_practical_notes, booking_internal_note,
  booking_room_price_ore, booking_discount_percent,
  booking_addon_total_ore, booking_expected_total_ore,
  booking_catering_accepted_at, booking_hold_expires_at,
  booking_cancelled_at, booking_cancellation_fee_ore,
  booking_cancelled_by, booking_cancellation_fee_waived
) values
  -- Rituals, past: invoiced workshop with House Service and Lunch for 8.
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c1', 'pending_verification', pg_temp.local_at(-21, time '10:00'), pg_temp.local_at(-21, time '12:00'), 8, 'Peter Pedersen', 'peter@rituals.dk', '+45 2010 2030', 'PO-4411', 'Kaffe og vand til mødet.', null, 160000, 50, 230000, 310000, now(), now() + interval '7 days', null, null, null, false),
  -- Rituals, past: ordinary member meeting.
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c2', 'confirmed', pg_temp.local_at(-14, time '09:00'), pg_temp.local_at(-14, time '11:00'), 5, 'Peter Pedersen', 'peter@rituals.dk', '+45 2010 2030', null, null, null, 80000, 50, 0, 40000, now(), null, null, null, null, false),
  -- Rituals, past: cancelled the same morning, full fee.
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c1', 'cancelled', pg_temp.local_at(-7, time '13:00'), pg_temp.local_at(-7, time '15:00'), 6, 'Peter Pedersen', 'peter@rituals.dk', '+45 2010 2030', null, null, null, 160000, 50, 0, 80000, now(), null, pg_temp.local_at(-7, time '09:00'), 80000, 'member', false),
  -- Rituals, past: cancelled two days ahead, half fee.
  ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c2', 'cancelled', pg_temp.local_at(-7, time '13:00'), pg_temp.local_at(-7, time '14:00'), 4, 'Mette Lund', 'mette@rituals.dk', '+45 2010 2031', null, null, null, 40000, 50, 0, 20000, now(), null, pg_temp.local_at(-9, time '13:00'), 10000, 'member', false),
  -- Rituals, past: cancelled five days ahead — beyond 72 hours, so no fee.
  ('00000000-0000-0000-0000-0000000000e9', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c2', 'cancelled', pg_temp.local_at(-14, time '13:00'), pg_temp.local_at(-14, time '15:00'), 5, 'Peter Pedersen', 'peter@rituals.dk', '+45 2010 2030', null, null, null, 80000, 50, 0, 40000, now(), null, pg_temp.local_at(-19, time '10:00'), 0, 'member', false),
  -- Nordic Events, past: training day with Lunch for 12.
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000c1', 'pending_verification', pg_temp.local_at(-14, time '09:00'), pg_temp.local_at(-14, time '10:30'), 12, 'Ali Hassan', 'ali@nordicevents.dk', '+45 3020 3040', null, 'Sandwichmenuen skal være klar fra start.', null, 120000, 0, 270000, 390000, now(), now() + interval '7 days', null, null, null, false),
  -- Nordic Events, past: ordinary meeting.
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000c2', 'confirmed', pg_temp.local_at(-21, time '10:00'), pg_temp.local_at(-21, time '12:00'), 4, 'Ali Hassan', 'ali@nordicevents.dk', '+45 3020 3040', null, null, null, 80000, 0, 0, 80000, now(), null, null, null, null, false),
  -- Nordic Events, past: booked in error — admin cancelled inside 24 h, fee waived.
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000c2', 'cancelled', pg_temp.local_at(-4, time '14:00'), pg_temp.local_at(-4, time '16:00'), 10, 'Ali Hassan', 'ali@nordicevents.dk', '+45 3020 3040', null, null, 'Fejlbooking — aflyst af admin umiddelbart efter oprettelse.', 80000, 0, 0, 80000, now(), null, pg_temp.local_at(-4, time '09:00'), 80000, 'admin', true),
  -- Rituals, upcoming: board meeting with House Host and Lunch for 10.
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c1', 'pending_verification', pg_temp.local_at(7, time '10:00'), pg_temp.local_at(7, time '12:00'), 10, 'Peter Pedersen', 'peter@rituals.dk', '+45 2010 2030', 'PO-4488', 'Frokost bestilles til klokken 12.', null, 160000, 50, 325000, 405000, now(), now() + interval '7 days', null, null, null, false),
  -- Rituals, upcoming: workshop inside the 24–72 hour fee window.
  ('00000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c1', 'pending_verification', pg_temp.local_at(3, time '09:00'), pg_temp.local_at(3, time '11:00'), 6, 'Peter Pedersen', 'peter@rituals.dk', '+45 2010 2030', null, null, null, 160000, 50, 50000, 130000, now(), now() + interval '7 days', null, null, null, false),
  -- Rituals, upcoming: ordinary member meeting.
  ('00000000-0000-0000-0000-0000000000e6', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c2', 'confirmed', pg_temp.local_at(9, time '13:00'), pg_temp.local_at(9, time '15:00'), 4, 'Mette Lund', 'mette@rituals.dk', '+45 2010 2031', null, null, null, 40000, 50, 0, 40000, now(), null, null, null, null, false),
  -- Rituals, upcoming: tomorrow, inside the under-24-hour fee window.
  ('00000000-0000-0000-0000-0000000000e8', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c2', 'confirmed', pg_temp.local_at(1, time '13:00'), pg_temp.local_at(1, time '14:00'), 3, 'Mette Lund', 'mette@rituals.dk', '+45 2010 2031', null, null, null, 40000, 50, 0, 20000, now(), null, null, null, null, false),
  -- Nordic Events, upcoming: planning day with House Host.
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000c1', 'pending_verification', pg_temp.local_at(7, time '13:00'), pg_temp.local_at(7, time '16:00'), 6, 'Ali Hassan', 'ali@nordicevents.dk', '+45 3020 3040', null, null, null, 240000, 0, 100000, 340000, now(), now() + interval '7 days', null, null, null, false),
  -- Nordic Events, upcoming: customer event with Lunch for 5.
  ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000c2', 'pending_verification', pg_temp.local_at(14, time '09:00'), pg_temp.local_at(14, time '12:00'), 5, 'Ali Hassan', 'ali@nordicevents.dk', '+45 3020 3040', null, null, null, 120000, 0, 112500, 232500, now(), now() + interval '7 days', null, null, null, false);

-- Add-on lines belong to pending bookings (ADR-0005 freezes them at
-- confirmation); the sync trigger finds the stored totals already correct,
-- so no extra write happens.
insert into public.booking_addons (
  booking_addon_booking_id, booking_addon_addon_id,
  booking_addon_unit_price_ore, booking_addon_quantity, booking_addon_total_ore
) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1', 50000, 1, 50000),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d3', 22500, 8, 180000),
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000d2', 100000, 1, 100000),
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000d3', 22500, 10, 225000),
  ('00000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000d1', 50000, 1, 50000),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d3', 22500, 12, 270000),
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000d2', 100000, 1, 100000),
  ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000d3', 22500, 5, 112500);

-- Confirm the pending rows (the price snapshot they carry is then frozen).
update public.bookings
set booking_status = 'confirmed', booking_hold_expires_at = null
where booking_id in (
  '00000000-0000-0000-0000-0000000000e1',
  '00000000-0000-0000-0000-0000000000e5',
  '00000000-0000-0000-0000-0000000000e7',
  '00000000-0000-0000-0000-0000000000f1',
  '00000000-0000-0000-0000-0000000000f4',
  '00000000-0000-0000-0000-0000000000f5'
);

-- The past Rituals workshop was invoiced manually in e-conomic (#9).
update public.bookings
set booking_invoicing_status = 'invoiced',
    booking_invoice_date = (pg_temp.local_at(-7, time '00:00'))::date,
    booking_invoice_number = '1042',
    booking_invoiced_at = pg_temp.local_at(-7, time '11:00'),
    booking_invoiced_by = '00000000-0000-0000-0000-000000000001'
where booking_id = '00000000-0000-0000-0000-0000000000e1';

-- Site-wide settings (#55 footer, single row per settings.sql): the Wi-Fi
-- credentials the shell footer shows until an admin edits them.
insert into public.settings (setting_wifi_network, setting_wifi_password)
values ('TheSocialHouseguest', 'SocialHouse')
on conflict (setting_id) do nothing;

-- Booking terms, privacy policy, and GDPR overview (#15): version 1 of
-- each, published, so the booking dialog has texts to link and record.
-- Placeholders only: The Social House delivers the real texts, and an
-- admin publishes them under Betingelser in each cloud project.
insert into public.terms_versions (
  terms_version_name, terms_version_version, terms_version_content, terms_version_published_at
) values
  ('Booking terms', '1', E'Eksempeltekst til lokal udvikling.\n\nAfbooking mere end 72 timer før mødet er gratis. Fra 72 til 24 timer før betaler I 50 % af lokaleprisen efter rabat. Under 24 timer før betaler I 100 %.\n\nAlle priser er ekskl. moms.', now()),
  ('Privacy policy', '1', E'Eksempeltekst til lokal udvikling.\n\nVi gemmer bookerens navn, arbejdsemail og mobilnummer for at kunne håndtere bookingen.', now()),
  ('GDPR overview', '1', E'Eksempeltekst til lokal udvikling.\n\nOversigten over persondata, databehandlere og sletning skrives ud fra docs/compliance/gdpr-data-inventory.md.', now());

commit;
