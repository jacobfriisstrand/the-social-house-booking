-- RLS tests for notices and terms (#19): notices are member-readable and
-- admin-curated (#12); published terms versions are member-readable, drafts
-- admin-only, and acceptances are own-insert immutable records (#15).

begin;
select plan(12);

-- Fixtures: one admin, one company, one foreign company, a published and a
-- draft terms version, one acceptance by the foreign company, one notice.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111001', 'authenticated', 'authenticated', 'admin@tsh.test', 'x', now(), '{"app_role":"admin"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111002', 'authenticated', 'authenticated', 'rituals@tsh.test', 'x', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111003', 'authenticated', 'authenticated', 'nordic@tsh.test', 'x', now(), '{}', '{}', now(), now());

insert into public.companies (company_id, company_auth_user_id, company_username, company_email, company_display_name) values
  ('22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111002', 'test-rituals', 'rituals@tsh.test', 'Rituals'),
  ('22222222-2222-2222-2222-222222222002', '11111111-1111-1111-1111-111111111003', 'test-nordic', 'nordic@tsh.test', 'Nordic Events');

insert into public.terms_versions (terms_version_id, terms_version_name, terms_version_version, terms_version_content, terms_version_published_at) values
  ('BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBB01', 'Booking terms', '1.0', '…', now()),
  ('BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBB02', 'Privacy policy', '1.0-draft', '…', null);

insert into public.terms_acceptances (terms_acceptance_id, terms_acceptance_company_id, terms_acceptance_terms_version_id) values
  ('CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCCC1', '22222222-2222-2222-2222-222222222002', 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBB01');

insert into public.notices (notice_body) values ('Køkkenet er lukket i uge 42');

-- Company session (Rituals).
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111002","role":"authenticated"}';

select is((select count(*) from public.notices), 1::bigint, 'company reads the notice board');
select throws_ok(
  'insert into public.notices (notice_body) values (''x'')',
  '42501', null,
  'company cannot post notices');
select is((select count(*) from public.terms_versions), 1::bigint, 'company reads published terms only');
select is((select terms_version_name from public.terms_versions), 'Booking terms', 'published version is readable');
select is((select count(*) from public.terms_acceptances), 0::bigint, 'foreign acceptances are invisible');
select lives_ok(
  'insert into public.terms_acceptances (terms_acceptance_company_id, terms_acceptance_terms_version_id) values (''22222222-2222-2222-2222-222222222001'', ''BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBB01'')',
  'company records its own acceptance');
update public.terms_acceptances set terms_acceptance_accepted_at = '2000-01-01' where true;
select is((select count(*) from public.terms_acceptances where terms_acceptance_accepted_at < '2010-01-01'), 0::bigint, 'acceptances are immutable (update matched nothing)');
select throws_ok(
  'insert into public.terms_acceptances (terms_acceptance_company_id, terms_acceptance_terms_version_id) values (''22222222-2222-2222-2222-222222222002'', ''BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBB01'')',
  '42501', null,
  'company cannot record an acceptance for another company');

-- Admin session.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111001","role":"authenticated","app_role":"admin"}';
select is((select count(*) from public.terms_versions), 2::bigint, 'admin reads drafts too');
select is((select count(*) from public.terms_acceptances), 2::bigint, 'admin reads all acceptances');
select lives_ok(
  'update public.terms_versions set terms_version_published_at = now() where terms_version_version = ''1.0-draft''',
  'admin publishes a terms version');
select lives_ok(
  'delete from public.notices',
  'admin curates notices');

select * from finish();
rollback;
