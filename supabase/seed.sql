-- Local seed: runs on `supabase db reset` only, never against cloud projects
-- (docs/agents/supabase.md). Cloud admins come from scripts/create-admin.ts.
--
-- Demo logins (all with password "social-house-demo"):
--   admin         admin@thesocialhouse.dk      app_role = admin
--   rituals       kontakt@rituals.dk           member company, 50% discount
--   nordicevents  booking@nordicevents.dk      external company, 0% discount

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
    extensions.crypt('social-house-demo', extensions.gen_salt('bf')),
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
    extensions.crypt('social-house-demo', extensions.gen_salt('bf')),
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
    extensions.crypt('social-house-demo', extensions.gen_salt('bf')),
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
  admin_id, admin_auth_user_id, admin_username, admin_display_name
) values (
  '00000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-000000000001',
  'admin', 'The Social House'
);

insert into public.companies (
  company_id, company_auth_user_id, company_username, company_email,
  company_display_name, company_legal_name, company_membership_status,
  company_discount_percent, company_cvr_number, company_contact_name,
  company_billing_address, company_billing_postal_code, company_billing_city,
  company_billing_country, company_invoice_email, company_reference,
  company_economic_customer_number, company_master_data_completed_at
) values
  (
    '00000000-0000-0000-0000-0000000000b2',
    '00000000-0000-0000-0000-000000000002',
    'rituals', 'kontakt@rituals.dk',
    'Rituals', 'Rituals ApS', 'member',
    50, '12345678', 'Peter Pedersen',
    'Strøget 1', '1160', 'København K', 'Danmark',
    'faktura@rituals.dk', 'RIT-2024',
    '10042', now()
  ),
  (
    '00000000-0000-0000-0000-0000000000b3',
    '00000000-0000-0000-0000-000000000003',
    'nordicevents', 'booking@nordicevents.dk',
    'Nordic Events', 'Nordic Events ApS', 'external',
    0, '87654321', 'Ali Hassan',
    'Havnegade 12', '1058', 'København K', 'Danmark',
    'regnskab@nordicevents.dk', null,
    null, now()
  );

insert into public.rooms (
  room_id, room_name, room_description, room_location,
  room_capacity, room_price_ore, room_opens_at, room_closes_at,
  room_practical_info
) values
  (
    '00000000-0000-0000-0000-0000000000c1',
    'Room of Power',
    'Det store mødelokale med plads til store møder og workshops.',
    '1. sal',
    12, 80000, '08:00', '18:00',
    'Skærm, whiteboard og kaffeautomat. Husk at rykke borde og stole tilbage.'
  ),
  (
    '00000000-0000-0000-0000-0000000000c2',
    'Room of Art',
    'Lyst kreativt lokale med langbord og god naturlig lys.',
    'Stueetage',
    6, 40000, '09:00', '17:00',
    'Kaffe og te kan hentes i køkkenet.'
  );

insert into public.addons (
  addon_id, addon_name, addon_description, addon_price_ore, addon_pricing_model
) values
  (
    '00000000-0000-0000-0000-0000000000d1',
    'House Service',
    'The Social House gør lokalet klar og rydder op efter mødet. For små møder: maks. 5 deltagere, maks. 4 timer og ingen forplejning.',
    50000, 'fixed'
  ),
  (
    '00000000-0000-0000-0000-0000000000d2',
    'House Host',
    'Vært tilstede under mødet: forberedelse, servering af forplejning og praktisk hjælp. Anbefales ved over 5 deltagere, forplejning eller møder over 4 timer.',
    100000, 'fixed'
  ),
  (
    '00000000-0000-0000-0000-0000000000d3',
    'Lunch',
    'Leveret sandwichmenu med tilbehør. Beregnes pr. deltager.',
    22500, 'per_participant'
  ),
  (
    '00000000-0000-0000-0000-0000000000d4',
    'Ekstra skærm',
    'Ekstra 55" skærm i lokalet til præsentation.',
    50000, 'fixed'
  );

insert into public.room_addons (room_addon_room_id, room_addon_addon_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d2'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d3'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d4'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000d3');

commit;
