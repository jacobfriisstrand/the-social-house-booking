-- RLS tests for companies/admins (#19). Each test file is a self-contained
-- transaction (docs/vendor/supabase/testing-overview.md): fixtures as
-- postgres (superuser bypasses RLS), assertions as authenticated with a
-- hand-set request.jwt.claims (what GoTrue sets in production).

begin;
select plan(17);

-- Fixtures: one admin auth user, two companies with their own auth users.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111001', 'authenticated', 'authenticated', 'admin@tsh.test', 'x', now(), '{"app_role":"admin"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111002', 'authenticated', 'authenticated', 'rituals@tsh.test', 'x', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111003', 'authenticated', 'authenticated', 'nordic@tsh.test', 'x', now(), '{}', '{}', now(), now());

insert into public.companies (company_id, company_auth_user_id, company_email, company_display_name, company_membership_status, company_discount_percent) values
  ('22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111002', 'rituals@tsh.test', 'Rituals', 'external', 50),
  ('22222222-2222-2222-2222-222222222002', '11111111-1111-1111-1111-111111111003', 'nordic@tsh.test', 'Nordic Events', 'external', 0);

insert into public.admins (admin_id, admin_auth_user_id, admin_display_name) values
  ('33333333-3333-3333-3333-333333333001', '11111111-1111-1111-1111-111111111001', 'The Social House Admin');

-- Company session (Rituals).
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111002","role":"authenticated"}';

select is((select count(*) from public.companies), 1::bigint, 'company sees only its own row');
select is((select company_display_name from public.companies), 'Rituals', 'company reads its own row');
select is((select count(*) from public.admins), 0::bigint, 'company cannot read the admins registry');
select lives_ok(
  'update public.companies set company_display_name = ''Rituals ApS''',
  'company updates its own non-privileged fields');
select throws_ok(
  'update public.companies set company_membership_status = ''member''',
  '42501', null,
  'company cannot promote itself to member');
select throws_ok(
  'update public.companies set company_discount_percent = 90',
  '42501', null,
  'company cannot grant itself a discount');
select throws_ok(
  'insert into public.companies (company_auth_user_id, company_email, company_display_name) values (''11111111-1111-1111-1111-111111111002'', ''x@x.dk'', ''X'')',
  '42501', null,
  'company cannot create companies');
delete from public.companies where true;
select is((select count(*) from public.companies), 1::bigint, 'company cannot delete (own row count unchanged)');

-- Other company session (Nordic).
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111003","role":"authenticated"}';
select is((select count(*) from public.companies), 1::bigint, 'other company sees only its own row');

-- Admin session.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111001","role":"authenticated","app_role":"admin"}';
select is((select count(*) from public.companies), 4::bigint, 'admin sees all companies (2 fixture + 2 seed)');
select is((select count(*) from public.admins), 2::bigint, 'admin reads the admins registry (fixture + seed)');
select lives_ok(
  'insert into public.companies (company_auth_user_id, company_email, company_display_name) values (''11111111-1111-1111-1111-111111111001'', ''hq@tsh.test'', ''TSH HQ'')',
  'admin creates a company');
select lives_ok(
  'delete from public.companies where company_email = ''hq@tsh.test''',
  'admin deletes a company');
select lives_ok(
  'update public.companies set company_membership_status = ''member'' where company_email = ''nordic@tsh.test''',
  'admin changes membership status');
select lives_ok(
  'update public.companies set company_discount_percent = 25 where company_email = ''nordic@tsh.test''',
  'admin changes the agreed discount');
select is((select company_discount_percent from public.companies where company_email = 'nordic@tsh.test'), 25, 'admin change persisted');

-- The guard is claim-driven: without an admin claim even a postgres-set
-- session (no JWT at all) cannot escalate; with the claim it can.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111003","role":"authenticated"}';
select throws_ok(
  'update public.companies set company_discount_percent = 99 where company_email = ''nordic@tsh.test''',
  '42501', null,
  'claim absence (not role) blocks escalation');

select * from finish();
rollback;
