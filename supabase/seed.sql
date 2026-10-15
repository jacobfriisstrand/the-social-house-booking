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
-- fees, add-on freezes, the invoiced workshop), and the generator after
-- them fills every room with deterministic weekday meetings across the
-- whole calendar year of the reset: a quiet January growing month by
-- month, a busy current month, and a thinner calendar further ahead. The
-- calendar, the paginated list and Statistik read like a working house
-- after every reset. Pending holds are not seeded (a real hold lives only
-- minutes), so QA creates its own through the booking flow.

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
-- every one of them in daily use once the booking wall below lands. The
-- room page shows the description (paragraphs split by a blank line) and
-- the practical notes as plain text with their line breaks; the
-- equipment each text offers matches the room's add-ons further down.
insert into public.rooms (
  room_id, room_name, room_description, room_location,
  room_capacity, room_hourly_price_ore, room_practical_notes
) values
  (
    '00000000-0000-0000-0000-0000000000c1',
    'Room of Power',
    E'Room of Power er husets store mødelokale på 1. sal. Der er plads til 12 personer ved et langt egetræsbord, og store vinduer mod gaden giver godt dagslys. Gardinerne kan trækkes for, når I viser noget på skærmen.\n\nLokalet passer til workshops, kundemøder, kick-offs og lange mødedage. Skriv i praktiske oplysninger, hvis I vil have bordene stillet i hestesko eller i grupper.\n\nPå væggen hænger en 75-tommer skærm med HDMI og trådløs skærmdeling, og der er whiteboard og flipover. Har I brug for mere, kan I tilvælge ekstra skærm, projektor, videomødeudstyr eller workshopkit.',
    '1. sal',
    12, 80000,
    E'Lokalet ligger på 1. sal for enden af gangen. Wi-Fi-netværk og adgangskode står nederst på siden.\n\nKaffe, te og vand bestiller I som tilvalg, så står det klar, når I kommer. Stil borde og stole tilbage og tag jeres materialer med, inden I går.'
  ),
  (
    '00000000-0000-0000-0000-0000000000c2',
    'Room of Art',
    E'Room of Art er et lyst lokale i stueetagen med et langt bord til 6 personer. Vinduerne vender ud mod gården, så der er dagslys det meste af dagen.\n\nPå væggene hænger værker fra husets skiftende udstillinger. Lokalet passer til kreative møder, idéudvikling og små teammøder.\n\nDer er en 55-tommer skærm med HDMI og en væg, I kan skrive på med whiteboardtusser. Til workshops kan I tilvælge workshopkit med flipover, post-its og tusser.',
    'Stueetage',
    6, 40000,
    E'Lokalet ligger i stueetagen til højre for indgangen og er åbent på hverdage fra 9 til 17. Wi-Fi-netværk og adgangskode står nederst på siden.\n\nKaffe, te og vand til mødet bestiller I som tilvalg. Tør skrivevæggen af og stil stolene ind til bordet, når I er færdige.'
  ),
  (
    '00000000-0000-0000-0000-0000000000c3',
    'Room of Calm',
    E'Room of Calm er et roligt hjørnelokale på 1. sal med bogreoler, bløde lænestole og et lavt bord. Lyset er dæmpet og varmt, og lokalet ligger væk fra husets fællesområder.\n\nLokalet passer til samtaler, interviews, 1:1-møder og rolige strategimøder. Med sofaen og de ekstra stole er der plads til 10 personer.\n\nDer er en 55-tommer skærm på rullestativ. Til møder med deltagere på afstand kan I tilvælge videomødeudstyr med kamera og højttaler.',
    '1. sal',
    10, 90000,
    E'Lokalet ligger på 1. sal, sidste dør til venstre. Hold lyden nede på gangen, for lokalerne omkring bruges også til samtaler. Wi-Fi-netværk og adgangskode står nederst på siden.\n\nSæt bøgerne tilbage på reolen og læg tæpperne på sofaen, inden I går.'
  ),
  (
    '00000000-0000-0000-0000-0000000000c4',
    'Room of Focus',
    E'Room of Focus er et lille, lydisoleret lokale i stueetagen med et rundt bord og 4 stole.\n\nLokalet passer til korte møder, opkald og videomøder, hvor I skal kunne høre hinanden uden larm udefra.\n\nDer er en 43-tommer skærm med HDMI og USB-C. Videomødeudstyr med kamera og højttaler kan tilvælges.',
    'Stueetage',
    4, 25000,
    E'Lokalet ligger i stueetagen ved siden af køkkenet. I travle perioder beder vi jer booke højst en time ad gangen, så flere kan bruge lokalet. Wi-Fi-netværk og adgangskode står nederst på siden.\n\nTag kopper og affald med ud, når I går.'
  ),
  (
    '00000000-0000-0000-0000-0000000000c5',
    'Room of Ideas',
    E'Room of Ideas er et åbent arbejdsrum i stueetagen med plads til 8 personer. Borde og stole står på hjul, så I selv kan bygge rummet om undervejs.\n\nLokalet passer til workshops, designsprint og brainstorm. Der er whiteboardvægge på to sider og plads til at hænge materiale op.\n\nFlipover, post-its og tusser står klar i skabet. Til lange dage kan I tilvælge workshopkit, ekstra skærm, projektor og lærred eller House Host.',
    'Stueetage',
    8, 50000,
    E'Lokalet ligger i stueetagen for enden af gangen. Ekstra flipoverpapir og tusser finder I i skabet ved døren. Wi-Fi-netværk og adgangskode står nederst på siden.\n\nTag post-its og papir ned, tør tavlerne af og stil møblerne tilbage, inden I går.'
  ),
  (
    '00000000-0000-0000-0000-0000000000c6',
    'Room of Board',
    E'Room of Board er husets bestyrelseslokale på 2. sal. Der er plads til 14 personer ved et stort mødebord med læderstole, og lokalet har vinduer i to sider.\n\nLokalet passer til bestyrelsesmøder, generalforsamlinger og møder med kunder og samarbejdspartnere.\n\nDer er en 86-tommer skærm og et fast konferencesystem med kamera, loftmikrofoner og højttalere. Til større præsentationer kan I tilvælge en ekstra skærm.',
    '2. sal',
    14, 120000,
    E'Lokalet ligger på 2. sal og er åbent på hverdage fra 9 til 17. Konferencesystemet starter, når I trykker på skærmen for enden af bordet. Wi-Fi-netværk og adgangskode står nederst på siden.\n\nVenter I eksterne gæster, så skriv deres navne i praktiske oplysninger, når I booker. Så tager vi imod dem i receptionen og viser vej.'
  ),
  (
    '00000000-0000-0000-0000-0000000000c7',
    'Room of Light',
    E'Room of Light er et lyst hjørnelokale under taget på 2. sal med plads til 6 personer. Vinduer mod syd og vest giver sol det meste af dagen og udsigt over gaderne.\n\nLokalet passer til teammøder, planlægning og mindre workshops, hvor I gerne vil have meget dagslys.\n\nDer er en 55-tommer skærm og et whiteboard. Projektor og lærred kan tilvælges.',
    '2. sal',
    6, 60000,
    E'Lokalet ligger på 2. sal, første dør til højre. Om eftermiddagen kan solen blænde, så træk markiserne ned med knappen ved døren. Wi-Fi-netværk og adgangskode står nederst på siden.\n\nLuk vinduerne og stil stolene ind til bordet, inden I går.'
  ),
  (
    '00000000-0000-0000-0000-0000000000c8',
    'Room of Rest',
    E'Room of Rest er husets lounge i stueetagen med sofaer, lænestole og et langt højbord. Der er plads til 10 personer.\n\nLokalet passer til uformelle møder, fælles frokost og pauser på lange arbejdsdage. Loungen er åben ud mod caféområdet og er ikke lydtæt, så den egner sig ikke til fortrolige samtaler.\n\nDer er en 55-tommer skærm og en højttaler til musik. I kan tilvælge forplejning, House Host og workshopkit.',
    'Stueetage',
    10, 35000,
    E'Loungen ligger i stueetagen ved caféområdet og er åben på hverdage fra 9 til 17. Wi-Fi-netværk og adgangskode står nederst på siden.\n\nRyd service og affald væk og ret puderne i sofaen, når I er færdige.'
  ),
  (
    '00000000-0000-0000-0000-0000000000c9',
    'Room of Craft',
    E'Room of Craft er et værksted i kælderen med plads til 12 personer. Lokalet har en lang arbejdsbænk, robuste borde og god plads på gulvet, og loftslamperne giver et jævnt arbejdslys.\n\nLokalet passer til prototyper, materialeworkshops, produktfotos og træning, hvor deltagerne skal bruge hænderne.\n\nDer er værktøj, skæremåtter og limpistoler i skabene. I kan tilvælge ekstra skærm, projektor og lærred, workshopkit eller House Host.',
    'Kælderen',
    12, 75000,
    E'Gå ned ad trappen bag receptionen. Brug sikkerhedsbrillerne ved døren, når I arbejder med værktøj. Wi-Fi-netværk og adgangskode står nederst på siden, men forbindelsen er svagere i kælderen.\n\nLæg værktøjet tilbage, ryd bænken og tag jeres materialer med, inden I går.'
  ),
  (
    '00000000-0000-0000-0000-0000000000ca',
    'Room of View',
    E'Room of View er det lille lokale øverst i huset på 3. sal, med plads til 5 personer. Fra vinduerne er der udsigt over tagene.\n\nLokalet passer til fokuserede møder, sparring og små ledermøder, hvor I gerne vil være lidt væk fra resten af huset.\n\nDer er en 43-tommer skærm med HDMI og USB-C. Til videomøder kan I tilvælge kamera og højttaler.',
    '3. sal',
    5, 65000,
    E'Lokalet ligger på 3. sal, og den sidste trappe er smal. Har I deltagere, der ikke kan gå på trapper, så book et lokale i stueetagen. Wi-Fi-netværk og adgangskode står nederst på siden.\n\nLuk vinduet og tag kopper med ned, når I går.'
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
    '00000000-0000-0000-0000-0000000000d5',
    'Kaffe, te og vand',
    'Frisk kaffe, te og vand på kande, sat frem inden mødet og fyldt op undervejs. Beregnes pr. deltager.',
    3500, 'per_participant',
    3
  ),
  (
    '00000000-0000-0000-0000-0000000000d6',
    'Morgenmad',
    'Rundstykker, smør, ost, marmelade, yoghurt med granola og frisk frugt. Står klar ved mødestart. Beregnes pr. deltager.',
    8500, 'per_participant',
    4
  ),
  (
    '00000000-0000-0000-0000-0000000000d3',
    'Frokost',
    'Frokostbuffet med sandwich, salat og vand. Serveres klokken 12, medmindre I aftaler andet med os. Beregnes pr. deltager.',
    22500, 'per_participant',
    5
  ),
  (
    '00000000-0000-0000-0000-0000000000d7',
    'Frugt og kage',
    'Frugt og hjemmebagt kage til eftermiddagen. Beregnes pr. deltager.',
    4500, 'per_participant',
    6
  ),
  (
    '00000000-0000-0000-0000-0000000000d4',
    'Ekstra skærm',
    'Ekstra 55-tommer skærm på rullestativ, sat op i lokalet før mødet.',
    50000, 'fixed',
    7
  ),
  (
    '00000000-0000-0000-0000-0000000000d8',
    'Projektor og lærred',
    'Projektor med HDMI- og USB-C-kabel og et lærred, sat op og testet før mødet.',
    40000, 'fixed',
    8
  ),
  (
    '00000000-0000-0000-0000-0000000000d9',
    'Videomødeudstyr',
    'Kamera med vidvinkel, højttaler og mikrofon til Teams, Zoom og Google Meet. Sat op og testet før mødet.',
    30000, 'fixed',
    9
  ),
  (
    '00000000-0000-0000-0000-0000000000da',
    'Workshopkit',
    'Flipover med ekstra blokke, post-its, tusser, tape og klistermærker til afstemning.',
    15000, 'fixed',
    10
  )
on conflict (addon_id) do nothing;

-- What each room offers: House Service and the four catering add-ons in
-- every room, House Host where meetings run bigger, and equipment where
-- the room has a use for it (Room of Board has its own conference system).
insert into public.room_addons (room_addon_room_id, room_addon_addon_id)
select r.room_id, offer.addon_id
from (values
  ('00000000-0000-0000-0000-0000000000d1'::uuid, null::text[]),
  ('00000000-0000-0000-0000-0000000000d2', array['Room of Power', 'Room of Calm', 'Room of Ideas', 'Room of Board', 'Room of Rest', 'Room of Craft']),
  ('00000000-0000-0000-0000-0000000000d5', null),
  ('00000000-0000-0000-0000-0000000000d6', null),
  ('00000000-0000-0000-0000-0000000000d3', null),
  ('00000000-0000-0000-0000-0000000000d7', null),
  ('00000000-0000-0000-0000-0000000000d4', array['Room of Power', 'Room of Ideas', 'Room of Board', 'Room of Craft']),
  ('00000000-0000-0000-0000-0000000000d8', array['Room of Power', 'Room of Ideas', 'Room of Light', 'Room of Craft']),
  ('00000000-0000-0000-0000-0000000000d9', array['Room of Power', 'Room of Calm', 'Room of Focus', 'Room of View']),
  ('00000000-0000-0000-0000-0000000000da', array['Room of Power', 'Room of Art', 'Room of Ideas', 'Room of Rest', 'Room of Craft'])
) as offer (addon_id, room_names)
join public.rooms r
  on offer.room_names is null or r.room_name = any (offer.room_names);

-- ---------------------------------------------------------------------------
-- Demo bookings (#5): the hand-written fixtures pin the flows — cancellation
-- fees on the member price (ADR-0006), add-on freezes at confirmation
-- (ADR-0005), the invoiced workshop with manual amounts (#9, #16). Numbers
-- come from the bookings_assign_number trigger; add-on lines are written
-- while the booking is still pending and freeze with the confirmation,
-- mirroring the app's write order. Dates are relative to the reset, so
-- "upcoming" stays upcoming. The offsets are picked so that a reset on a
-- Wednesday or a Thursday puts every fixture on an open day of its room
-- (e7's +2 may be a Saturday, when Room of Power opens 8 to 14).
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
  -- Rituals, past: invoiced workshop with House Host and lunch for 8.
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c1', 'pending_verification', pg_temp.local_at(-21, time '10:00'), pg_temp.local_at(-21, time '12:00'), 8, 'Peter Pedersen', 'peter@rituals.dk', '+45 2010 2030', 'PO-4411', 'To deltagere er vegetarer.', null, 160000, 50, 280000, 360000, now(), now() + interval '7 days', null, null, null, false),
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
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000c2', 'cancelled', pg_temp.local_at(-6, time '14:00'), pg_temp.local_at(-6, time '16:00'), 6, 'Ali Hassan', 'ali@nordicevents.dk', '+45 3020 3040', null, null, 'Fejlbooking. Aflyst af admin lige efter oprettelse.', 80000, 0, 0, 80000, now(), null, pg_temp.local_at(-6, time '09:00'), 80000, 'admin', true),
  -- Rituals, upcoming: board meeting with House Host and Lunch for 10.
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c1', 'pending_verification', pg_temp.local_at(7, time '10:00'), pg_temp.local_at(7, time '12:00'), 10, 'Peter Pedersen', 'peter@rituals.dk', '+45 2010 2030', 'PO-4488', 'Frokost bestilles til klokken 12.', null, 160000, 50, 325000, 405000, now(), now() + interval '7 days', null, null, null, false),
  -- Rituals, upcoming: workshop inside the 24–72 hour fee window.
  ('00000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c1', 'pending_verification', pg_temp.local_at(2, time '09:00'), pg_temp.local_at(2, time '11:00'), 5, 'Peter Pedersen', 'peter@rituals.dk', '+45 2010 2030', null, null, null, 160000, 50, 50000, 130000, now(), now() + interval '7 days', null, null, null, false),
  -- Rituals, upcoming: ordinary member meeting.
  ('00000000-0000-0000-0000-0000000000e6', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c2', 'confirmed', pg_temp.local_at(8, time '13:00'), pg_temp.local_at(8, time '15:00'), 4, 'Mette Lund', 'mette@rituals.dk', '+45 2010 2031', null, null, null, 80000, 50, 0, 40000, now(), null, null, null, null, false),
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
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d2', 100000, 1, 100000),
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
    pg_temp.local_at(-98, time '13:00'),
    pg_temp.local_at(-98, time '20:00')
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
-- room for the whole calendar year of the reset. Each room's day is laid
-- out as a chain of possible meetings of one to three hours, each
-- followed by at least the 30-minute buffer (ADR-0002). Each month books
-- a fixed number of them (pg_temp.month_quota), and md5 of room|day|n
-- decides the rest: which meetings, how long they run, the company,
-- participants, add-ons, the odd cancellation. Every `db reset` grows
-- the same house: about 950 bookings over the year.

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

-- How many meetings the wall books in a month. The months before the
-- current one grow steadily towards it, with a dip in July for the summer
-- holidays. The current month counts twice: the part up to today runs
-- busy, so that on the 14th or 15th the month so far beats the whole
-- month before it on Statistik, and the rest of it is the calendar
-- ahead. Further out the calendar thins, since bookings arrive over time.
create function pg_temp.month_quota(p_day date)
returns integer
language sql
stable
as $$
  select case
    when months_back = 0 and p_day <= current_date then 110
    when months_back = 0 then 100
    when months_back = -1 then 110
    when months_back < -1 then 55
    else round(
      (82 - 4 * (months_back - 1))
        * case when extract(month from p_day) = 7 then 0.55 else 1 end
    )::int
  end
  from (
    select (
      (extract(year from current_date) - extract(year from p_day)) * 12
        + extract(month from current_date) - extract(month from p_day)
    )::int as months_back
  ) m;
$$;

-- The day The Social House invoices a meeting's month in e-conomic
-- (ADR-0001): the first weekday from the 3rd of the month after.
create function pg_temp.invoice_date(p_start_at timestamptz)
returns date
language sql
immutable
as $$
  select third + case extract(isodow from third) when 6 then 2 when 7 then 1 else 0 end
  from (
    select (date_trunc('month', p_start_at at time zone 'Europe/Copenhagen')
      + interval '1 month 2 days')::date as third
  ) t;
$$;

-- A meeting's length in minutes: mostly one to two hours, now and then
-- two and a half or three, and never longer than the room has left.
create function pg_temp.meeting_minutes(p_key text, p_room_left integer)
returns integer
language sql
immutable
as $$
  select least(
    case
      when pg_temp.h(p_key || '|len', 100) < 25 then 60
      when pg_temp.h(p_key || '|len', 100) < 50 then 90
      when pg_temp.h(p_key || '|len', 100) < 78 then 120
      when pg_temp.h(p_key || '|len', 100) < 90 then 150
      else 180
    end,
    p_room_left
  );
$$;

create temp table seed_wall on commit drop as
with recursive room_day as (
  -- Every room's open weekdays in the year and the window its meetings
  -- can use, in minutes after midnight, Copenhagen time: from opening
  -- time, but never before 09:00, to the last end that leaves the buffer
  -- before closing time and before 22:00. The day grid and the booking
  -- dialog show 09:00 to 22:00 only (GRID_START_MINUTES and
  -- GRID_END_MINUTES in lib/domain/availability.ts). The Danish public
  -- holidays of 2026 and the days between Christmas and New Year stay
  -- empty.
  select
    r.room_id,
    r.room_capacity,
    r.room_hourly_price_ore,
    d.day,
    r.room_id::text || '|' || d.day::text || '|' as day_key,
    extract(epoch from greatest(oh.room_opening_hour_opens, time '09:00'))::int / 60
      as first_start,
    extract(epoch from least(oh.room_opening_hour_closes, time '22:00'))::int / 60 - 30
      as last_end
  from generate_series(
    date_trunc('year', current_date),
    date_trunc('year', current_date) + interval '1 year - 1 day',
    interval '1 day'
  ) as g (day_at)
  cross join lateral (select g.day_at::date as day) d
  cross join public.rooms r
  join public.room_opening_hours oh
    on oh.room_opening_hour_room_id = r.room_id
   and oh.room_opening_hour_day_of_week = extract(isodow from d.day)::int - 1
   and not oh.room_opening_hour_is_closed
  where extract(isodow from d.day) <= 5
    and d.day <> all (array[
      '2026-01-01', '2026-04-02', '2026-04-03', '2026-04-06', '2026-05-14',
      '2026-05-15', '2026-05-25', '2026-06-05', '2026-12-24', '2026-12-25',
      '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31'
    ]::date[])
),
chain (room_id, day, n, start_minute, minutes) as (
  -- The day's possible meetings, one after the other: the first up to
  -- 1½ hours into the window, each next one after the buffer
  -- and up to an hour more, until less than an hour is left. Any subset of
  -- a chain keeps its meetings and their buffers apart.
  select
    rd.room_id,
    rd.day,
    0,
    s.start_minute,
    pg_temp.meeting_minutes(rd.day_key || '0', rd.last_end - s.start_minute)
  from room_day rd
  cross join lateral (
    select rd.first_start + 30 * pg_temp.h(rd.day_key || '|at', 4) as start_minute
  ) s
  where rd.last_end - s.start_minute >= 60
  union all
  select
    c.room_id,
    c.day,
    c.n + 1,
    s.start_minute,
    pg_temp.meeting_minutes(rd.day_key || (c.n + 1), rd.last_end - s.start_minute)
  from chain c
  join room_day rd on rd.room_id = c.room_id and rd.day = c.day
  cross join lateral (
    select c.start_minute + c.minutes + 30 + 30 * pg_temp.h(rd.day_key || c.n || '|gap', 3)
      as start_minute
  ) s
  where rd.last_end - s.start_minute >= 60
),
slot as (
  select
    rd.room_id,
    rd.room_capacity,
    rd.room_hourly_price_ore,
    rd.day,
    rd.day_key || c.n as key,
    c.minutes,
    time '00:00' + make_interval(mins => c.start_minute) as local_start,
    (rd.day + time '00:00' + make_interval(mins => c.start_minute))
      at time zone 'Europe/Copenhagen' as starts_at,
    (rd.day + time '00:00' + make_interval(mins => c.start_minute + c.minutes))
      at time zone 'Europe/Copenhagen' as ends_at,
    -- The quota's month; the current month splits at today.
    case
      when rd.day between date_trunc('month', current_date)::date and current_date then 'so far'
      else to_char(rd.day, 'YYYY-MM')
    end as quota_month,
    pg_temp.month_quota(rd.day) as quota
  from chain c
  join room_day rd on rd.room_id = c.room_id and rd.day = c.day
),
taken as (
  -- Each month books its quota of the meetings no fixture or house event
  -- already holds, in md5 order.
  select ranked.*
  from (
    select
      free.*,
      row_number() over (partition by free.quota_month order by md5(free.key)) as pick
    from slot free
    where not pg_temp.slot_busy(free.room_id, free.starts_at, free.ends_at)
  ) ranked
  where ranked.pick <= ranked.quota
),
booking as (
  -- Company and booker on the hash, the price snapshot from the room's
  -- hourly price and the company's discount (ADR-0005, ADR-0019).
  select
    t.*,
    c.company_id,
    c.discount,
    c.booker_name,
    c.booker_email,
    c.booker_phone,
    2 + pg_temp.h(t.key || '|p', 100) % greatest(t.room_capacity - 1, 1) as participants,
    round(t.room_hourly_price_ore * t.minutes / 60.0)::int as room_price_ore
  from taken t
  join (values
    (0,  17,  '00000000-0000-0000-0000-0000000000b2'::uuid, 50, 'Peter Pedersen', 'peter@rituals.dk',      '+45 2010 2030'),
    (17, 25,  '00000000-0000-0000-0000-0000000000b2'::uuid, 50, 'Mette Lund',     'mette@rituals.dk',      '+45 2010 2031'),
    (25, 38,  '00000000-0000-0000-0000-0000000000b4'::uuid, 25, 'Sofie Kruse',    'sofie@nordvest.dk',     '+45 3120 4050'),
    (38, 45,  '00000000-0000-0000-0000-0000000000b4'::uuid, 25, 'Anders Holm',    'anders@nordvest.dk',    '+45 3120 4051'),
    (45, 55,  '00000000-0000-0000-0000-0000000000b6'::uuid, 25, 'Line Møller',    'line@faelleshuset.dk',  '+45 6150 7060'),
    (55, 60,  '00000000-0000-0000-0000-0000000000b6'::uuid, 25, 'Kasper Dahl',    'kasper@faelleshuset.dk', '+45 6150 7061'),
    (60, 73,  '00000000-0000-0000-0000-0000000000b3'::uuid, 0,  'Ali Hassan',     'ali@nordicevents.dk',   '+45 3020 3040'),
    (73, 80,  '00000000-0000-0000-0000-0000000000b3'::uuid, 0,  'Emma Lind',      'emma@nordicevents.dk',  '+45 3020 3041'),
    (80, 93,  '00000000-0000-0000-0000-0000000000b5'::uuid, 0,  'Jonas Berg',     'jonas@studiovest.dk',   '+45 2620 2080'),
    (93, 100, '00000000-0000-0000-0000-0000000000b5'::uuid, 0,  'Maja Holt',      'maja@studiovest.dk',    '+45 2620 2081')
  ) as c (low, high, company_id, discount, booker_name, booker_email, booker_phone)
    on pg_temp.h(t.key || '|co', 100) >= c.low
   and pg_temp.h(t.key || '|co', 100) < c.high
),
cancellation as (
  -- One in ten past bookings was called off (one in seventy this month),
  -- at a registered time: a few hours before, one or two days before, or
  -- three to fourteen days before during office hours. Only a call-off
  -- that has already happened stands.
  select
    b.*,
    round(b.room_price_ore * (100 - b.discount) / 100.0)::int as member_ore,
    pg_temp.h(b.key || '|st', 1000)
      < case when b.day >= date_trunc('month', current_date)::date then 15 else 100 end
      as cancel_pick,
    case
      when pg_temp.h(b.key || '|cl', 100) < 15
        then b.starts_at - make_interval(hours => 1 + pg_temp.h(b.key || '|ch', 3))
      else (
        b.day
          - case
              when pg_temp.h(b.key || '|cl', 100) < 40 then 1 + pg_temp.h(b.key || '|cd', 2)
              else 3 + pg_temp.h(b.key || '|cd', 12)
            end
          + time '08:00'
          + make_interval(mins => 30 * pg_temp.h(b.key || '|ct', 18))
      ) at time zone 'Europe/Copenhagen'
    end as cancel_at
  from booking b
),
outcome as (
  -- ADR-0006 on the member price: more than 72 hours before is free,
  -- from 24 to 72 hours half, under 24 hours everything. An admin
  -- sometimes waives the fee on an obvious error caught at once.
  select
    c.*,
    c.cancel_pick and c.cancel_at < now() as is_cancelled,
    case
      when c.starts_at - c.cancel_at > interval '72 hours' then 0
      when c.starts_at - c.cancel_at >= interval '24 hours' then 50
      else 100
    end as fee_percent,
    pg_temp.h(c.key || '|cb', 5) = 0 as by_admin,
    c.local_start < time '09:30' and pg_temp.h(c.key || '|brk', 100) < 45 as breakfast,
    c.local_start <= time '11:30'
      and c.local_start + make_interval(mins => c.minutes) >= time '12:30'
      and pg_temp.h(c.key || '|lun', 100) < 55 as lunch
  from cancellation c
),
decided as (
  select
    o.*,
    o.is_cancelled and o.by_admin and o.fee_percent > 0
      and pg_temp.h(o.key || '|cw', 3) = 0 as fee_waived,
    -- House Host for the bigger meetings, House Service for the small ones
    -- without a meal (Bilag 1); both are add-ons like any other.
    o.participants > 5 or o.breakfast or o.lunch or o.minutes > 240 as needs_host
  from outcome o
)
select
  md5('tsh-seed|' || f.key)::uuid as booking_id,
  f.room_id,
  f.company_id,
  f.discount,
  f.booker_name,
  f.booker_email,
  f.booker_phone,
  f.participants,
  f.starts_at,
  f.ends_at,
  f.room_price_ore,
  f.member_ore,
  case
    when f.discount > 0 and pg_temp.h(f.key || '|po', 3) = 0
      then 'PO-' || (4000 + pg_temp.h(f.key || '|po', 600))::text
  end as reference,
  (array[
    'Vegetarisk til alle, tak.',
    'To deltagere er glutenfri.',
    'En deltager har nøddeallergi.',
    'Borde i hestesko, tak.',
    'Vi kommer et kvarter før og stiller op.',
    'Vi venter to eksterne gæster.'
  ])[1 + pg_temp.h(f.key || '|pn', 60)] as practical_notes,
  case
    when f.fee_waived then f.cancel_at - interval '20 minutes'
    else least(
      f.starts_at - make_interval(days => 15 + pg_temp.h(f.key || '|cr', 30)),
      now() - make_interval(hours => 1 + pg_temp.h(f.key || '|cr', 200))
    )
  end as created_at,
  case when f.is_cancelled then 'cancelled' else 'confirmed' end::public.booking_status as status,
  case when f.is_cancelled then f.cancel_at end as cancelled_at,
  case when f.is_cancelled then round(f.member_ore * f.fee_percent / 100.0)::int end as fee_ore,
  case
    when f.is_cancelled and f.by_admin then 'admin'
    when f.is_cancelled then 'member'
  end::public.booking_cancelled_by as cancelled_by,
  f.fee_waived,
  -- Months whose invoice day has passed are invoiced: a cancellation
  -- only when a fee is payable, a held meeting mostly, with a few not
  -- invoicable and a few of last month's still waiting. The rest waits.
  case
    when f.is_cancelled then
      case
        when f.fee_percent > 0 and not f.fee_waived
          and pg_temp.invoice_date(f.starts_at) <= current_date then 'invoiced'
        else 'not_invoiced'
      end
    when f.ends_at >= now() or pg_temp.invoice_date(f.starts_at) > current_date
      then 'not_invoiced'
    when pg_temp.h(f.key || '|iv', 100) < 2 then 'not_invoicable'
    when pg_temp.h(f.key || '|iv', 100) < 10
      and f.day >= (date_trunc('month', current_date) - interval '1 month')::date
      then 'not_invoiced'
    else 'invoiced'
  end::public.booking_invoicing_status as invoicing_status,
  -- The add-ons asked for; the room's own list filters them below.
  array_remove(array[
    case when not f.needs_host and pg_temp.h(f.key || '|svc', 100) < 30 then '00000000-0000-0000-0000-0000000000d1' end,
    case when f.needs_host and pg_temp.h(f.key || '|hst', 100) < 35 then '00000000-0000-0000-0000-0000000000d2' end,
    case when pg_temp.h(f.key || '|cof', 100) < 60 then '00000000-0000-0000-0000-0000000000d5' end,
    case when f.breakfast then '00000000-0000-0000-0000-0000000000d6' end,
    case when f.lunch then '00000000-0000-0000-0000-0000000000d3' end,
    case when f.local_start >= time '13:00' and pg_temp.h(f.key || '|fru', 100) < 35 then '00000000-0000-0000-0000-0000000000d7' end,
    case when pg_temp.h(f.key || '|scr', 100) < 8 then '00000000-0000-0000-0000-0000000000d4' end,
    case when pg_temp.h(f.key || '|prj', 100) < 6 then '00000000-0000-0000-0000-0000000000d8' end,
    case when pg_temp.h(f.key || '|vid', 100) < 12 then '00000000-0000-0000-0000-0000000000d9' end,
    case when f.minutes >= 120 and pg_temp.h(f.key || '|wsk', 100) < 20 then '00000000-0000-0000-0000-0000000000da' end
  ]::uuid[], null) as addon_ids
from decided f;

-- The app's write order (lib/bookings/new-booking.ts): the booking lands
-- as a hold priced at the member price plus nothing, its add-on lines
-- follow, booking_addons_sync_totals moves the add-on and expected totals
-- by their sum, and only then is the booking confirmed (or called off).
insert into public.bookings (
  booking_id, booking_company_id, booking_room_id, booking_status,
  booking_start_at, booking_end_at, booking_participant_count,
  booking_booker_name, booking_booker_email, booking_booker_phone,
  booking_reference, booking_practical_notes,
  booking_room_price_ore, booking_discount_percent,
  booking_addon_total_ore, booking_expected_total_ore,
  booking_catering_accepted_at, booking_hold_expires_at,
  booking_invoicing_status, booking_created_at
)
select
  w.booking_id, w.company_id, w.room_id, 'pending_verification',
  w.starts_at, w.ends_at, w.participants,
  w.booker_name, w.booker_email, w.booker_phone,
  w.reference, w.practical_notes,
  w.room_price_ore, w.discount,
  0, w.member_ore,
  w.created_at, now() + interval '10 minutes',
  w.invoicing_status, w.created_at
from seed_wall w;

-- A per-participant line counts the booking's participants, a fixed one
-- is a single unit, both at today's catalogue price (ADR-0011).
insert into public.booking_addons (
  booking_addon_booking_id, booking_addon_addon_id,
  booking_addon_unit_price_ore, booking_addon_quantity, booking_addon_total_ore
)
select
  w.booking_id,
  a.addon_id,
  a.addon_price_ore,
  q.quantity,
  a.addon_price_ore * q.quantity
from seed_wall w
cross join unnest(w.addon_ids) as picked (addon_id)
join public.room_addons ra
  on ra.room_addon_room_id = w.room_id
 and ra.room_addon_addon_id = picked.addon_id
join public.addons a on a.addon_id = picked.addon_id
cross join lateral (
  select case a.addon_pricing_model when 'per_participant' then w.participants else 1 end as quantity
) q;

update public.bookings b
set booking_status = w.status,
    booking_hold_expires_at = null,
    booking_cancelled_at = w.cancelled_at,
    booking_cancellation_fee_ore = w.fee_ore,
    booking_cancelled_by = w.cancelled_by,
    booking_cancellation_fee_waived = w.fee_waived
from seed_wall w
where w.booking_id = b.booking_id;

-- Invoices: one per company and month, dated on the month's invoice day
-- and numbered in date order the way e-conomic counts them. The wall
-- rows landed as 'invoiced' without date or number. The past Rituals
-- workshop (e1) joins its company's invoice for that month and changes
-- status here, so its invoicing_events row carries the number (#9).
update public.bookings b
set booking_invoicing_status = 'invoiced',
    booking_invoice_date = i.invoice_date,
    booking_invoice_number = (1000 + i.invoice_rank)::text,
    booking_invoiced_at = (i.invoice_date + time '10:00') at time zone 'Europe/Copenhagen',
    booking_invoiced_by = '00000000-0000-0000-0000-000000000001'
from (
  select
    booking_id,
    invoice_date,
    dense_rank() over (order by invoice_date, booking_company_id) as invoice_rank
  from (
    select booking_id, booking_company_id, pg_temp.invoice_date(booking_start_at) as invoice_date
    from public.bookings
    where booking_invoicing_status = 'invoiced'
       or booking_id = '00000000-0000-0000-0000-0000000000e1'
  ) invoiced
) i
where i.booking_id = b.booking_id;

-- A few of the ended, still-open meetings carry manual amounts (#16): the
-- admin added them after the meeting, and the audit names the house admin
-- by its auth user (manual_amount_created_by references auth.users).
insert into public.manual_amounts (
  manual_amount_booking_id, manual_amount_amount_ore, manual_amount_note,
  manual_amount_created_by, manual_amount_created_at
)
select
  b.booking_id,
  case b.rn % 3 when 0 then 45000 when 1 then 25000 else 75000 end,
  case b.rn % 3
    when 0 then 'Ekstra kaffe, te og morgenbrød til deltagerne.'
    when 1 then 'Forlænget møde med en halv time.'
    else 'Ekstra skærm og elektrisk forlængelse lejet.'
  end,
  '00000000-0000-0000-0000-000000000001',
  b.booking_end_at + interval '3 hours'
from (
  select
    booking_id,
    booking_end_at,
    row_number() over (order by md5(booking_id::text)) as rn
  from public.bookings
  where booking_status = 'confirmed'
    and booking_invoicing_status = 'not_invoiced'
    and booking_end_at < now() - interval '3 hours'
    -- The wall's ids hash out wide; the hand fixtures all start 00000000.
    and booking_id::text not like '00000000-%'
  order by md5(booking_id::text)
  limit 5
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
-- Demo texts written from Bilag 1, the ADRs and
-- docs/compliance/gdpr-data-inventory.md: The Social House delivers the
-- real texts, and an admin publishes them under Betingelser in each
-- cloud project. The texts are written as plain text and wrapped by
-- terms_html_from_plain_text into the editor's HTML (#102): each line
-- keeps its line, headings stay lines and list items keep their bullets.
insert into public.terms_versions (
  terms_version_name, terms_version_version, terms_version_content, terms_version_published_at
) values
  ('Booking terms', '1', public.terms_html_from_plain_text($terms$Disse betingelser gælder for alle bookinger af mødelokaler i The Social House. Når bookeren trykker på "Book nu", accepterer bookeren betingelserne på virksomhedens vegne.

1. Hvem kan booke
Lokalerne kan bookes af virksomheder med en konto hos The Social House. Medlemsvirksomheder booker selv i platformen. Eksterne virksomheder booker gennem os, og vi opretter bookingen for dem.

Hver virksomhed har én fælles konto. Virksomheden har ansvaret for alle bookinger, der laves med kontoen.

2. Bookeren
Hver booking har en ansvarlig booker. Bookeren oplyser sit fulde navn, sin arbejdsmail og sit mobilnummer.

Når I booker, sender vi en kode på seks cifre til bookerens arbejdsmail. Bookingen er først endelig, når koden er tastet ind. Imens holder vi lokalet til jer i nogle minutter.

3. Sådan booker I
• I kan booke samme dag, hvis lokalet er ledigt, og op til 12 måneder frem.
• I booker i intervaller på 30 minutter, fra 30 minutter og op til hele lokalets åbningstid.
• Bookingen skal ligge inden for lokalets åbningstider.
• Antallet af deltagere må ikke være større end lokalets kapacitet.

Bookeren får en bekræftelse på mail, når bookingen er på plads. 24 timer før mødet sender vi en påmindelse.

4. Priser og medlemsrabat
Alle priser er i danske kroner ekskl. moms. Moms lægges til på fakturaen.

Hvert lokale har en timepris. Medlemsvirksomheder får den rabat, der står i deres medlemsaftale. Rabatten gælder kun lokaleleje. Der er ingen rabat på tilvalg, forplejning eller service. Eksterne virksomheder betaler den fulde lokalepris.

Eksempel: Room of Power koster 800 kr. i timen. I booker tre timer og har 50 % rabat. Den normale lokalepris er 2.400 kr., og jeres lokalepris er 1.200 kr. ekskl. moms. Tilvalg kommer oven i.

5. Prisen ligger fast
Når bookingen er bekræftet, gemmer vi lokaleprisen, jeres rabat, priserne på tilvalg, det samlede forventede beløb og afbookingsreglerne. Ændrer vi senere vores priser, gælder de nye priser kun for nye bookinger.

6. Tilvalg og forplejning
Et tilvalg har enten en fast pris eller en pris pr. deltager. En pris pr. deltager ganges med det antal deltagere, I har oplyst.

House Service koster 500 kr. ekskl. moms. Vi gør lokalet klar, serverer den kaffe, te og vand, I har bestilt, og rydder op efter mødet. House Service er til møder med højst 5 deltagere, højst 4 timer og uden frokost eller anden større forplejning.

House Host koster 1.000 kr. ekskl. moms pr. mødedag. En vært fra huset står for opsætning og servering og hjælper jer, når der er brug for det. Værten er ikke i lokalet hele dagen. Vi anbefaler House Host ved mere end 5 deltagere, ved frokost eller anden forplejning, ved møder over 4 timer og ved særlig opsætning. Ved mere end 15 deltagere eller særlige behov aftaler vi pris og bemanding med jer.

Kaffe, te, vand, frokost og anden forplejning bestiller I gennem The Social House. I må ikke tage egen mad og drikke, ekstern catering eller eget serveringspersonale med, medmindre I har aftalt det med os på forhånd.

7. Buffer og aflevering af lokalet
Efter hver booking reserverer vi automatisk 30 minutter. Bufferen koster ikke noget og er ikke en del af jeres mødetid. Mødet slutter på det sluttidspunkt, I har booket.

Har I ikke valgt House Service eller House Host, beder vi jer bruge bufferen til at:
• stille borde og stole tilbage
• tage jeres materialer med
• fjerne service og affald
• lufte ud
• efterlade lokalet klar til det næste møde.

Almindelig rengøring og støvsugning sørger huset for. Afleverer I ikke lokalet som aftalt, kan vi fakturere dokumenteret ekstra tid og eventuelle eksterne udgifter. Beløbet står med en kort forklaring på jeres booking.

8. Afbooking
I afbooker under Bookinger, når I er logget ind. Linket i bekræftelsen og påmindelsen åbner bookingen. Før I bekræfter afbookingen, viser vi det gebyr, I skal betale.

Gebyret beregnes af jeres lokalepris efter medlemsrabat:
• Mere end 72 timer før mødet: intet gebyr.
• Fra og med 24 timer til og med 72 timer før: 50 %.
• Mindre end 24 timer før: 100 %.

Det tidspunkt, hvor platformen registrerer afbookingen, afgør gebyret. Lokalet og bufferen bliver ledige med det samme, og I får en bekræftelse på mail. Forplejning eller service, som allerede er bestilt, afregner vi for sig.

Eksempel: Jeres lokalepris er 1.200 kr. ekskl. moms, og I afbooker 48 timer før mødet. Gebyret er 600 kr. ekskl. moms. Booker en anden virksomhed lokalet bagefter, ændrer det ikke jeres gebyr.

9. Ændringer og fejl
I kan ikke selv flytte en booking. Afbook den og book igen. Så gælder de almindelige regler for afbooking.

Har I booket forkert, så kontakt os hurtigst muligt. Opdager I fejlen og retter den lige efter bookingen, kan vi frafalde gebyret. Alle ændringer bliver gemt i bookingens historik.

10. Fakturering
I betaler ikke i platformen. Vi fakturerer bagud, normalt én gang om måneden, for de møder, der er holdt, og de afbookingsgebyrer, der er beregnet. Fakturaen kommer fra vores regnskabssystem, e-conomic, og bliver sendt til den fakturamail, I har oplyst. Moms lægges til på fakturaen.

Fakturaen bliver udstedt til virksomhedens juridiske navn og CVR-nummer. Har I skrevet et PO-nummer eller en reference på bookingen, står det på fakturaen. Under Bookinger kan I altid se grundlaget for jeres næste faktura.

11. Hvad andre kan se
Andre virksomheder i huset kan se lokale, dato, tidspunkt og jeres visningsnavn. De kan ikke se bookerens navn, mail eller telefon, mødets formål, deltagere, forplejning eller noter.

12. House Events
The Social House holder egne arrangementer, som kan lukke enkelte lokaler. Et arrangement kan ikke lægges oven i en booking, der allerede er bekræftet.

13. Kontakt
Har I spørgsmål til en booking eller en faktura, så skriv til booking@thesocialhouse.dk.$terms$), now()),
  ('Privacy policy', '1', public.terms_html_from_plain_text($terms$Her kan I læse, hvilke personoplysninger The Social House behandler, når I bruger bookingplatformen, og hvilke rettigheder I har.

1. Dataansvarlig
The Social House er dataansvarlig for de oplysninger, vi behandler i bookingplatformen. Har I spørgsmål, så skriv til booking@thesocialhouse.dk.

2. Hvilke oplysninger vi behandler
Om virksomheden:
• visningsnavn, juridisk navn og CVR-nummer
• adresse, fakturamail og en eventuel reference eller et PO-nummer
• kontaktpersonens navn og mobilnummer
• loginmail og adgangskode. Adgangskoden gemmer vi kun i en form, som ingen kan læse.

Om bookeren og bookingen:
• bookerens fulde navn, arbejdsmail og mobilnummer
• lokale, tidspunkt, antal deltagere, tilvalg og priser
• praktiske oplysninger, som I selv skriver, fx allergier eller behov for adgang uden trapper
• afbookinger og afbookingsgebyrer
• hvilken version af betingelserne bookeren har accepteret, og hvornår.

Vi gemmer også en log over de mails, vi sender: modtager, type af mail og om den blev leveret. Selve indholdet gemmer vi ikke.

3. Hvorfor vi behandler oplysningerne
Vi bruger oplysningerne til at:
• oprette og administrere virksomhedens konto
• bekræfte bookerens arbejdsmail med en kode
• sende bekræftelser, påmindelser og besked om afbookinger
• gøre lokalet og den bestilte forplejning klar
• fakturere bookinger og afbookingsgebyrer
• finde og rette fejl i platformen.

Vi behandler oplysningerne, fordi vi har en aftale med jeres virksomhed, og fordi vi har en legitim interesse i at kunne kontakte den person, der har booket. Faktureringsgrundlaget gemmer vi, fordi bogføringsloven kræver det.

4. Allergier og andre følsomme oplysninger
Praktiske oplysninger kan handle om helbred, fx allergier. Skriv kun det, vi skal vide for at holde mødet. Vi bruger oplysningerne til at forberede mødet, og vi sender dem aldrig med i en mail.

5. Hvem kan se oplysningerne
Medarbejdere i The Social House, der står for bookinger og fakturering, kan se alle oplysninger.

Alle, der kender virksomhedens login, kan se virksomhedens bookinger, også bookerens navn, mail, telefon og praktiske oplysninger.

Andre virksomheder i huset kan kun se lokale, tidspunkt og jeres visningsnavn.

6. Databehandlere
Vi bruger disse leverandører til at drive platformen. De må kun bruge oplysningerne efter vores instruks.
• Supabase: database, login og billeder af lokalerne
• Resend: afsendelse af mails
• Netlify: drift af hjemmesiden
• Sentry: overvågning af fejl. Sentry får ikke navne, mails, telefonnumre eller praktiske oplysninger.

Fakturaer laver vi i vores regnskabssystem, e-conomic. Dertil overfører vi selv de oplysninger, der skal stå på fakturaen.

7. Hvor længe vi gemmer oplysningerne
Bookinger og faktureringsgrundlag gemmer vi så længe, bogføringsloven kræver det. Det er 5 år fra udgangen af det regnskabsår, de hører til.

Platformen sletter ikke oplysninger af sig selv. Beder I os om det, sletter eller anonymiserer vi de oplysninger, vi ikke skal gemme.

8. Cookies
Platformen bruger kun de cookies, der holder jer logget ind, og én cookie, der husker, om sidemenuen er åben. Vi bruger ingen cookies til statistik eller markedsføring.

9. Jeres rettigheder
I har ret til at:
• se de oplysninger, vi har om jer
• få rettet forkerte oplysninger
• få slettet oplysninger, som vi ikke skal gemme
• få begrænset brugen af jeres oplysninger eller gøre indsigelse mod den
• få jeres oplysninger udleveret i et almindeligt filformat.

Skriv til booking@thesocialhouse.dk. Vi svarer inden for en måned.

I kan klage til Datatilsynet på www.datatilsynet.dk.

10. Ændringer
Når vi ændrer politikken, offentliggør vi en ny version. Ved hver booking gemmer vi, hvilken version bookeren har set.$terms$), now()),
  ('GDPR overview', '1', public.terms_html_from_plain_text($terms$Her kan I se, hvilke oplysninger bookingplatformen gemmer, hvem der kan se dem, hvilke leverandører vi bruger, og hvordan I får oplysninger udleveret, rettet eller slettet. Læs også vores privatlivspolitik.

1. Oplysninger om virksomheden
Visningsnavn, juridisk navn, CVR-nummer, adresse, fakturamail, kontaktpersonens navn og mobilnummer, reference og bemærkninger til fakturering. Vi gemmer også medlemsstatus, rabat og jeres kundenummer i e-conomic.

Virksomheden selv og The Social House kan se oplysningerne.

2. Login
Loginmail, adgangskode og tidspunkter for login. Adgangskoden er gemt i en form, som ingen kan læse. Vores leverandør af login gemmer også IP-adresse og browser i en sikkerhedslog.

Ingen kan se loginoplysningerne i platformen.

3. Bookinger
Bookerens navn, arbejdsmail og mobilnummer, lokale, tidspunkt, antal deltagere, reference, praktiske oplysninger, tilvalg, priser, afbookinger og status for fakturering. Hver ændring af en booking bliver gemt i en historik med den gamle og den nye værdi.

Virksomheden kan se sine egne bookinger, og The Social House kan se alle. Historikken kan kun The Social House se.

4. Andre oplysninger
• Koder til bekræftelse af mail gemmes i en form, som ingen kan læse, og udløber efter 10 minutter.
• Accept af betingelser: hvilken version, hvornår og ved hvilken booking.
• Log over mails: modtager, type af mail og om den blev leveret. Indholdet gemmes ikke.

5. Leverandører og hvor data ligger
• Supabase gemmer database, login og billeder af lokalerne på servere i EU.
• Resend sender alle mails fra platformen.
• Netlify kører hjemmesiden og ser de besøgendes IP-adresser.
• Sentry modtager fejlrapporter uden navne, mails, telefonnumre og noter.

e-conomic er ikke forbundet med platformen. Vi skriver selv oplysningerne til fakturaen ind dér.

6. Udlevering af data
Under Bookinger kan I se alle jeres bookinger, og under Indstillinger kan I se virksomhedens oplysninger. Vil I have en kopi af alle jeres data, så skriv til os. Så sender vi dem som filer, I kan åbne i fx Excel.

7. Rettelser
Virksomhedens oplysninger retter I selv under Indstillinger. Ændringen gælder, når den nuværende loginmail har godkendt den via et link. Skal oplysninger om en booker rettes, så skriv til os.

8. Sletning
Bookinger er en del af vores regnskab, så dem sletter vi ikke, så længe vi skal gemme dem. Beder en booker om at blive slettet, fjerner vi navn, mail, telefon og praktiske oplysninger fra bookingerne og beholder beløbene.

Lukker jeres virksomhed sin konto, lukker vi jeres login og fjerner kontaktoplysningerne. Bookinger og faktureringsgrundlag gemmer vi, så længe bogføringsloven kræver det.

9. Kontakt
Skriv til booking@thesocialhouse.dk, hvis I vil se, rette eller slette jeres oplysninger.$terms$), now());

commit;
