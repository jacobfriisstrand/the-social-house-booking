-- company_contact_phone (#1): Bilag 1's mandatory mobile number for the
-- contact. Nullable text (the company fills it in on the master-data form),
-- writable by the owning company and by admin, invisible to other companies.

begin;
select plan(6);

select has_column('public', 'companies', 'company_contact_phone', 'companies has company_contact_phone');
select col_type_is('public', 'companies', 'company_contact_phone', 'text', 'company_contact_phone is text');
select col_is_null('public', 'companies', 'company_contact_phone', 'company_contact_phone is nullable until master data is completed');

-- Fixtures: two companies with their own auth users.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111002', 'authenticated', 'authenticated', 'rituals@tsh.test', 'x', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111003', 'authenticated', 'authenticated', 'nordic@tsh.test', 'x', now(), '{}', '{}', now(), now());

insert into public.companies (company_id, company_auth_user_id, company_email, company_display_name) values
  ('22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111002', 'rituals@tsh.test', 'Rituals'),
  ('22222222-2222-2222-2222-222222222002', '11111111-1111-1111-1111-111111111003', 'nordic@tsh.test', 'Nordic Events');

-- Company session (Rituals) sets its own phone.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111002","role":"authenticated"}';
select lives_ok(
  'update public.companies set company_contact_phone = ''+45 2010 2030''',
  'company sets its own contact phone');
select is(
  (select company_contact_phone from public.companies where company_id = '22222222-2222-2222-2222-222222222001'),
  '+45 2010 2030',
  'the phone is stored on the company''s own row');

-- Other company session (Nordic) sees no phone from Rituals.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111003","role":"authenticated"}';
select is(
  (select count(*) from public.companies where company_contact_phone is not null),
  0::bigint,
  'another company cannot read the phone');

select * from finish();
rollback;
