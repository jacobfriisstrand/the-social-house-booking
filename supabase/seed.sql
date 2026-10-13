-- Local seed: runs on `supabase db reset` only, never against cloud projects
-- (docs/agents/supabase.md). Cloud admins come from scripts/create-admin.ts.
--
-- Demo logins (all with password "password"; email is the login):
--   admin@thesocialhouse.dk      app_role = admin
--   kontakt@rituals.dk           member company, 50% discount
--   booking@nordicevents.dk      external company, 0% discount
--   hej@nordvest.dk              member company, 25% discount
--   post@faelleshuset.dk         member company, 25% discount
--   studio@vest.dk               external company, 0% discount
--
-- Bookings: the hand-written fixtures below pin the flows (cancellation
-- fees, add-on freezes, the invoiced workshop with manual amounts), and
-- the generator after them fills every room with deterministic weekday
-- meetings — six weeks back, five ahead — so the calendar and the
-- paginated list read like a working house after every reset. Pending
-- holds are not seeded — a real hold lives only minutes — so QA creates
-- its own through the booking flow.

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
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000004',
    'authenticated', 'authenticated',
    'hej@nordvest.dk',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{}',
    '{}',
    '', '', '', '',
    '+4500000004', '', '',
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000005',
    'authenticated', 'authenticated',
    'post@faelleshuset.dk',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{}',
    '{}',
    '', '', '', '',
    '+4500000005', '', '',
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000006',
    'authenticated', 'authenticated',
    'studio@vest.dk',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(),
    '{}',
    '{}',
    '', '', '', '',
    '+4500000006', '', '',
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
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000006'
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
  ),
  (
    '00000000-0000-0000-0000-0000000000b4',
    '00000000-0000-0000-0000-000000000004',
    'hej@nordvest.dk',
    'Kontoret Nordvest', 'Kontoret Nordvest ApS', 'member',
    25, '23456789', 'Sofie Kruse',
    'Nørrebrogade 45', '2200', 'København N', 'Danmark',
    'okonomi@nordvest.dk', 'KNV-88',
    '10077', now()
  ),
  (
    '00000000-0000-0000-0000-0000000000b5',
    '00000000-0000-0000-0000-000000000005',
    'studio@vest.dk',
    'Studio Vest', 'Studio Vest I/S', 'external',
    0, '34567890', 'Jonas Berg',
    'Vesterbrogade 88', '1620', 'København V', 'Danmark',
    'jonas@studiovest.dk', null,
    null, now()
  ),
  (
    '00000000-0000-0000-0000-0000000000b6',
    '00000000-0000-0000-0000-000000000006',
    'post@faelleshuset.dk',
    'Fælleshuset', 'Fælleshuset ApS', 'member',
    25, '45678901', 'Line Møller',
    'Fælledvej 7', '2200', 'København N', 'Danmark',
    'post@faelleshuset.dk', 'FH-12',
    '10091', now()
  );

-- Ten rooms across the house: small cheap huddles to the big boardroom,
-- every one of them in daily use once the booking wall below lands.
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
  ),
  (
    '00000000-0000-0000-0000-0000000000c3',
    'Room of Calm',
    'Hjørnelokale med bohbøger, bløde stole og ro til samtaler.',
    '1. sal',
    10, 90000,
    'Passer til interviews og 1:1-møder. Hænk op ad væggen efter brug.'
  ),
  (
    '00000000-0000-0000-0000-0000000000c4',
    'Room of Focus',
    'Lille intet lokale til korte møder og opkald.',
    'Stueetage',
    4, 25000,
    'Skærm og telefonbrik. Book højst en time ad gangen i travle perioder.'
  ),
  (
    '00000000-0000-0000-0000-0000000000c5',
    'Room of Ideas',
    'Åbent rum med skriveborde, flipover og post-its i alle farver.',
    'Stueetage',
    8, 50000,
    'Flipoverpapir findes i skabet. Ryd op i papir og pins efter brug.'
  ),
  (
    '00000000-0000-0000-0000-0000000000c6',
    'Room of Board',
    'Den formelle bestyrelseslokale med stor skærm og conferencesystem.',
    '2. sal',
    14, 120000,
    'Book til bestyrelsesmøder og kundemøder med eksterne. Kaffe bestilles via huset.'
  ),
  (
    '00000000-0000-0000-0000-0000000000c7',
    'Room of Light',
    'Solrigt hjørnelokale under taget med udsigt over gaderne.',
    '2. sal',
    6, 60000,
    'Godt lys hele dagen. Markiser trækkes ned mod syd om eftermiddagen.'
  ),
  (
    '00000000-0000-0000-0000-0000000000c8',
    'Room of Rest',
    'Afslappet loungeområde til kaffe, små møder og fælles pauser.',
    'Stueetage',
    10, 35000,
    'Ikke til lukkede møder middagen: medlemmer arbejder her hele dagen.'
  ),
  (
    '00000000-0000-0000-0000-0000000000c9',
    'Room of Craft',
    'Praktisk lokale med workbench, værktøj og god plads til protoyper.',
    'Kælderen',
    12, 75000,
    'Sikkerhedsbriller på ved værktøj. Støvsug og ryd bænken efter brug.'
  ),
  (
    '00000000-0000-0000-0000-0000000000ca',
    'Room of View',
    'Det lille rum øverst oppe med udsigt over tagene og roen til fokus.',
    '3. sal',
    5, 65000,
    'Snævre trappe op — møder med mange deltagere bør bruge Room of Power.'
  );

-- Weekly opening hours: day_of_week 0 = Monday … 6 = Sunday. Room of
-- Board, Room of Rest and Room of Art hold office hours, the big rooms
-- run long, Saturdays are short, Sundays closed.
insert into public.room_opening_hours (
  room_opening_hour_room_id, room_opening_hour_day_of_week,
  room_opening_hour_opens, room_opening_hour_closes, room_opening_hour_is_closed
)
select
  r.room_id,
  d.dow,
  case when r.room_id in ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c8', '00000000-0000-0000-0000-0000000000c6') then time '09:00' else time '08:00' end,
  case
    when d.dow = 5 and r.room_id in ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c3') then time '14:00'
    when r.room_id in ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c8', '00000000-0000-0000-0000-0000000000c6') then time '17:00'
    else time '18:00'
  end,
  d.dow = 6
    or (d.dow = 5 and r.room_id not in (
      '00000000-0000-0000-0000-0000000000c1',
      '00000000-0000-0000-0000-0000000000c3'
    ))
from public.rooms r
cross join generate_series(0, 6) as d (dow);

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
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000d3'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000d2'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000d3'),
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000d3'),
  ('00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000d3'),
  ('00000000-0000-0000-0000-0000000000c6', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-0000000000c6', '00000000-0000-0000-0000-0000000000d2'),
  ('00000000-0000-0000-0000-0000000000c6', '00000000-0000-0000-0000-0000000000d3'),
  ('00000000-0000-0000-0000-0000000000c6', '00000000-0000-0000-0000-0000000000d4'),
  ('00000000-0000-0000-0000-0000000000c7', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-0000000000c7', '00000000-0000-0000-0000-0000000000d3'),
  ('00000000-0000-0000-0000-0000000000c8', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-0000000000c8', '00000000-0000-0000-0000-0000000000d3'),
  ('00000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-0000000000d2'),
  ('00000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-0000000000d3'),
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-0000000000d3');

-- ---------------------------------------------------------------------------
-- Demo bookings (#5): the hand-written fixtures pin the flows — cancellation
-- fees on the member price (ADR-0006), add-on freezes at confirmation
-- (ADR-0005), the invoiced workshop with manual amounts (#9, #16). Numbers
-- come from the bookings_assign_number trigger; add-on lines are written
-- while the booking is still pending and freeze with the confirmation,
-- mirroring the app's write order. Dates are relative to the reset, so
-- "upcoming" stays upcoming; an offset lands on whatever weekday follows
-- the reset, and only the slot picker enforces opening hours — a seeded row
-- outside them is cosmetic.
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

-- ---------------------------------------------------------------------------
-- The house's own events (#24): they block their rooms like bookings do and
-- show as the info-coloured blocks on the calendar. Evening and weekend
-- slots clear of the last booking's turnaround, one weekday strategy day —
-- the booking wall below reads these rows and leaves their rooms free.
insert into public.house_events (
  house_event_id, house_event_title, house_event_description,
  house_event_start_at, house_event_end_at
) values
  (
    '00000000-0000-0000-0000-0000000000aa',
    'Sommerfest',
    'Fælles sommerfest for husets virksomheder: grill, musik og hygge på terrassen og i stueetagen.',
    pg_temp.local_at(-35, time '13:00'),
    pg_temp.local_at(-35, time '20:00')
  ),
  (
    '00000000-0000-0000-0000-0000000000ab',
    'Brandøvelse',
    'Kort brandøvelse med husets vært — vi samles i gården og er klar igen på en kvart.',
    pg_temp.local_at(-21, time '18:00'),
    pg_temp.local_at(-21, time '18:45')
  ),
  (
    '00000000-0000-0000-0000-0000000000ac',
    'Månedlig morgenmad',
    'Fælles morgenmad i Room of Rest og Room of Art. Kom forbi inden arbejdet starter.',
    pg_temp.local_at(12, time '09:00'),
    pg_temp.local_at(12, time '11:00')
  ),
  (
    '00000000-0000-0000-0000-0000000000ad',
    'Strategidag',
    'Huset holder strategidag: Room of Power og Room of Board er beslaglagt hele dagen.',
    pg_temp.local_at(20, time '09:00'),
    pg_temp.local_at(20, time '16:30')
  ),
  (
    '00000000-0000-0000-0000-0000000000ae',
    'Julefrokost',
    'Årets julefrokost for hele huset — tilmelding på opslagstavlen.',
    pg_temp.local_at(63, time '18:00'),
    pg_temp.local_at(63, time '23:00')
  );

insert into public.house_event_rooms (
  house_event_room_event_id, house_event_room_room_id
) values
  ('00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-0000000000c2'),
  ('00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-0000000000c5'),
  ('00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-0000000000c8'),
  ('00000000-0000-0000-0000-0000000000ab', '00000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-0000000000ab', '00000000-0000-0000-0000-0000000000c2'),
  ('00000000-0000-0000-0000-0000000000ac', '00000000-0000-0000-0000-0000000000c2'),
  ('00000000-0000-0000-0000-0000000000ac', '00000000-0000-0000-0000-0000000000c8'),
  ('00000000-0000-0000-0000-0000000000ad', '00000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-0000000000ad', '00000000-0000-0000-0000-0000000000c6'),
  ('00000000-0000-0000-0000-0000000000ae', '00000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-0000000000ae', '00000000-0000-0000-0000-0000000000c2'),
  ('00000000-0000-0000-0000-0000000000ae', '00000000-0000-0000-0000-0000000000c3'),
  ('00000000-0000-0000-0000-0000000000ae', '00000000-0000-0000-0000-0000000000c5'),
  ('00000000-0000-0000-0000-0000000000ae', '00000000-0000-0000-0000-0000000000c7'),
  ('00000000-0000-0000-0000-0000000000ae', '00000000-0000-0000-0000-0000000000c8'),
  ('00000000-0000-0000-0000-0000000000ae', '00000000-0000-0000-0000-0000000000c9'),
  ('00000000-0000-0000-0000-0000000000ae', '00000000-0000-0000-0000-0000000000ca');

-- ---------------------------------------------------------------------------
-- The house at work: a deterministic wall of weekday bookings across every
-- room, six weeks back and five ahead. Buffer-safe slots (the 30-minute
-- turnaround of ADR-0002 is inside the gap between them), one booking per
-- room per slot, and md5 of room|day|slot decides everything — occupancy,
-- company, participants, the odd cancellation — so every `db reset` grows
-- the same house. The older past is invoiced in batches; the current month
-- waits, which is the backlog the invoicing view works through.

create function pg_temp.h(p_key text, p_mod integer)
returns integer
language sql
immutable
as $$
  select (('x' || substr(md5(p_key), 1, 7))::bit(28)::int) % p_mod;
$$;

-- A room is busy when a live booking's or a house event's blocked range
-- (end + 30-minute buffer, ADR-0002) overlaps the candidate's — the same
-- test the exclusion constraint and the event triggers run, so the seed
-- never trips them.
create function pg_temp.slot_busy(p_room uuid, p_start timestamptz, p_end timestamptz)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.bookings b
    where b.booking_room_id = p_room
      and b.booking_status in ('pending_verification', 'confirmed')
      and tstzrange(b.booking_start_at, public.booking_blocked_until(b.booking_end_at), '[)')
        && tstzrange(p_start, public.booking_blocked_until(p_end), '[)')
  ) or exists (
    select 1
    from public.house_events he
    join public.house_event_rooms her
      on her.house_event_room_event_id = he.house_event_id
    where her.house_event_room_room_id = p_room
      and tstzrange(he.house_event_start_at, public.booking_blocked_until(he.house_event_end_at), '[)')
        && tstzrange(p_start, public.booking_blocked_until(p_end), '[)')
  );
$$;

insert into public.bookings (
  booking_id, booking_company_id, booking_room_id, booking_status,
  booking_start_at, booking_end_at, booking_participant_count,
  booking_booker_name, booking_booker_email, booking_booker_phone,
  booking_reference, booking_room_price_ore, booking_discount_percent,
  booking_addon_total_ore, booking_expected_total_ore,
  booking_catering_accepted_at, booking_hold_expires_at,
  booking_cancelled_at, booking_cancellation_fee_ore,
  booking_cancelled_by, booking_cancellation_fee_waived,
  booking_invoicing_status
)
select
  md5('tsh-seed|' || y.key)::uuid,
  y.company_id,
  y.room_id,
  case when y.is_cancelled then 'cancelled'::booking_status else 'confirmed'::booking_status end,
  y.starts_at,
  y.ends_at,
  2 + pg_temp.h(y.key || '|p', 100) % greatest(y.room_capacity - 1, 1),
  y.booker_name,
  y.booker_email,
  y.booker_phone,
  case
    when y.discount > 0 and pg_temp.h(y.key || '|po', 3) = 0
      then 'PO-' || (4000 + pg_temp.h(y.key || '|po', 600))::text
    else null
  end,
  y.room_price_ore,
  y.discount,
  0,
  y.expected_ore,
  now(),
  null,
  case when y.is_cancelled then y.cancelled_at end,
  case when y.is_cancelled then round(y.expected_ore * y.fee_pct)::int end,
  case
    when y.is_cancelled and y.admin_cancelled then 'admin'::booking_cancelled_by
    when y.is_cancelled then 'member'::booking_cancelled_by
    else null
  end,
  case when y.is_cancelled then y.waived_flag else false end,
  case
    when y.is_cancelled then 'not_invoiced'::booking_invoicing_status
    when y.ends_at < date_trunc('month', now())
      and pg_temp.h(y.key || '|iv', 50) = 0 then 'not_invoicable'::booking_invoicing_status
    when y.ends_at < date_trunc('month', now()) then 'invoiced'::booking_invoicing_status
    else 'not_invoiced'::booking_invoicing_status
  end
from (
  select
    cand.*,
    c.company_id,
    c.discount,
    c.booker_name,
    c.booker_email,
    c.booker_phone,
    cand.room_hourly_price_ore
      * (extract(epoch from (cand.ends_at - cand.starts_at)) / 3600)::int as room_price_ore,
    round(
      cand.room_hourly_price_ore
        * (extract(epoch from (cand.ends_at - cand.starts_at)) / 3600)::int
        * (100 - c.discount) / 100.0
    )::int as expected_ore,
    -- A slice of the past cancels ahead of time; future rows stand.
    cand.stb < 8 and cand.starts_at < now() as is_cancelled,
    cand.starts_at - ((cand.cdd + 1) || ' days')::interval as cancelled_at,
    -- ADR-0006 on the member price: cancelled three days ahead or more is
    -- free, inside 72 hours half, inside 24 hours everything.
    case
      when cand.cdd + 1 >= 3 then 0.0
      when cand.cdd + 1 >= 1 then 0.5
      else 1.0
    end as fee_pct,
    cand.cb = 0 as admin_cancelled,
    cand.cw = 0 as waived_flag
  from (
    select
      r.room_id,
      r.room_capacity,
      r.room_hourly_price_ore,
      (d.day + s.opens) at time zone 'Europe/Copenhagen' as starts_at,
      (d.day + s.ends) at time zone 'Europe/Copenhagen' as ends_at,
      r.room_id::text || '|' || d.day::text || '|' || s.opens::text as key,
      pg_temp.h(r.room_id::text || '|' || d.day::text || '|' || s.opens::text, 100) as occ,
      pg_temp.h(r.room_id::text || '|' || d.day::text || '|' || s.opens::text || '|co', 100) as cob,
      pg_temp.h(r.room_id::text || '|' || d.day::text || '|' || s.opens::text || '|st', 100) as stb,
      pg_temp.h(r.room_id::text || '|' || d.day::text || '|' || s.opens::text || '|cd', 9) as cdd,
      pg_temp.h(r.room_id::text || '|' || d.day::text || '|' || s.opens::text || '|cb', 4) as cb,
      pg_temp.h(r.room_id::text || '|' || d.day::text || '|' || s.opens::text || '|cw', 15) as cw
    from (
      select generate_series(
        current_date - 42, current_date + 35, interval '1 day'
      )::date as day
    ) d
    cross join (values
      (time '08:00', time '10:00'),
      (time '10:30', time '12:30'),
      (time '13:00', time '15:00'),
      (time '15:30', time '17:30')
    ) as s (opens, ends)
    cross join public.rooms r
    join public.room_opening_hours oh
      on oh.room_opening_hour_room_id = r.room_id
     and oh.room_opening_hour_day_of_week = extract(isodow from d.day)::int - 1
     and oh.room_opening_hour_is_closed = false
     and s.opens >= oh.room_opening_hour_opens
     and s.ends <= oh.room_opening_hour_closes
    where
      -- Weekdays only; the weekend cells stay empty like the house does.
      extract(isodow from d.day) between 1 and 5
      -- Half of every room's two-hour slots run, on the hash.
      and pg_temp.h(r.room_id::text || '|' || d.day::text || '|' || s.opens::text, 100) < 50
  ) cand
  cross join lateral (
    select
      tb.company_id, tb.discount,
      tb.booker_name, tb.booker_email, tb.booker_phone
    from (
      select
        t.*,
        lead(t.bucket) over (order by t.bucket) as next_bucket
      from (values
        (0,  '00000000-0000-0000-0000-0000000000b2'::uuid, 50, 'Peter Pedersen', 'peter@rituals.dk',     '+45 2010 2030'),
        (25, '00000000-0000-0000-0000-0000000000b4'::uuid, 25, 'Sofie Kruse',    'sofie@nordvest.dk',    '+45 3120 4050'),
        (45, '00000000-0000-0000-0000-0000000000b6'::uuid, 25, 'Line Møller',    'line@faelleshuset.dk', '+45 6150 7060'),
        (60, '00000000-0000-0000-0000-0000000000b3'::uuid, 0,  'Ali Hassan',     'ali@nordicevents.dk',  '+45 3020 3040'),
        (80, '00000000-0000-0000-0000-0000000000b5'::uuid, 0,  'Jonas Berg',     'jonas@studiovest.dk',  '+45 2620 2080')
      ) as t (bucket, company_id, discount, booker_name, booker_email, booker_phone)
    ) tb
    where cand.cob >= tb.bucket
      and cand.cob < coalesce(tb.next_bucket, 100)
  ) c
  where not pg_temp.slot_busy(cand.room_id, cand.starts_at, cand.ends_at)
) y;

-- The invoiced wall gets its e-conomic numbers in one pass: the generated
-- rows landed as 'invoiced' without date or number, and only they lack one.
update public.bookings b
set booking_invoice_date = b.booking_end_at::date + 2,
    booking_invoice_number = '10' || lpad(x.rn::text, 4, '0'),
    booking_invoiced_at = b.booking_end_at + interval '2 days',
    booking_invoiced_by = '00000000-0000-0000-0000-000000000001'
from (
  select booking_id, row_number() over (order by booking_end_at, booking_id) as rn
  from public.bookings
  where booking_status = 'confirmed'
    and booking_invoicing_status = 'invoiced'
    and booking_invoice_number is null
) x
where x.booking_id = b.booking_id;

-- A few of the ended, still-open meetings carry manual amounts (#16): the
-- admin added them after the meeting, and the audit names the house admin
-- by its auth user (manual_amount_created_by references auth.users).
insert into public.manual_amounts (
  manual_amount_booking_id, manual_amount_amount_ore, manual_amount_note,
  manual_amount_created_by, manual_amount_created_at
)
select
  b.booking_id,
  case row_number() over (order by b.booking_end_at) % 3
    when 0 then 45000 when 1 then 25000 else 75000 end,
  case row_number() over (order by b.booking_end_at) % 3
    when 0 then 'Ekstra kaffe, te og morgenbrød til deltagerne.'
    when 1 then 'Forlænget møde med en halv time.'
    else 'Ekstra skærm og elektrisk forlængelse lejet.'
  end,
  '00000000-0000-0000-0000-000000000001',
  b.booking_end_at + interval '3 hours'
from (
  select booking_id, booking_end_at
  from public.bookings
  where booking_status = 'confirmed'
    and booking_invoicing_status = 'not_invoiced'
    and booking_end_at < now()
    -- Generated ids hash out wide; the hand fixtures all start 00000000.
    and booking_id::text like '1%'
  order by booking_end_at
  limit 4
) b;

-- Message-board notices (#12): the board and the front page show the
-- active ones whose end has not passed; one is turned off and one has
-- expired, so both admin states have data.
insert into public.notices (
  notice_id, notice_title, notice_body, notice_is_active, notice_ends_at
) values
  (
    '00000000-0000-0000-0000-0000000000af',
    'Renovering af køkkenet',
    'Køkkenet på stueetagen renoveres i uge 45. Midlertidig kaffe findes i Room of Rest, og opvaskemaskinen er afstængt i perioden.',
    true,
    now() + interval '18 days'
  ),
  (
    '00000000-0000-0000-0000-0000000000b0',
    'Fælles fredagsfrokost',
    'Hver fredag kl. 12 mødes vi i Room of Rest — medbring din egen mad. Huset står for kagen den første fredag i måneden.',
    true,
    null
  ),
  (
    '00000000-0000-0000-0000-0000000000b1',
    'Parkeringsregler',
    'Brug husets to pladser bag bygningen. Naboernes indkørsler skal kunne bruges hele dagen.',
    true,
    null
  ),
  (
    '00000000-0000-0000-0000-0000000000b7',
    'Sommerfest — tak for i år',
    'Tak til alle, der var med til sommerfesten. Billederne hænger på opslagstavlen ved indgangen.',
    false,
    null
  ),
  (
    '00000000-0000-0000-0000-0000000000b8',
    'Bygningens varme',
    'Varmen slukkes hverdage kl. 17.00 — tag frakken på, når arbejdsdagen slutter.',
    true,
    now() - interval '10 days'
  );

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
