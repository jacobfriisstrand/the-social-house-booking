-- External companies pay full room price (#14, ADR-0008): the
-- companies_external_no_discount check allows a discount on members only,
-- whoever writes the row. The escalation guard (100_rls_companies.sql)
-- decides who may change the two columns; this decides which combinations
-- exist at all.

begin;
select plan(6);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111001', 'authenticated', 'authenticated', 'admin@tsh.test', 'x', now(), '{"app_role":"admin"}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111002', 'authenticated', 'authenticated', 'rituals@tsh.test', 'x', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111003', 'authenticated', 'authenticated', 'nordic@tsh.test', 'x', now(), '{}', '{}', now(), now());

select lives_ok(
  'insert into public.companies (company_auth_user_id, company_email, company_display_name, company_membership_status, company_discount_percent) values (''11111111-1111-1111-1111-111111111002'', ''rituals@tsh.test'', ''Rituals'', ''member'', 50)',
  'a member may carry a discount');
select throws_ok(
  'insert into public.companies (company_auth_user_id, company_email, company_display_name, company_membership_status, company_discount_percent) values (''11111111-1111-1111-1111-111111111003'', ''nordic@tsh.test'', ''Nordic Events'', ''external'', 10)',
  '23514', null,
  'an external company cannot be created with a discount');
select lives_ok(
  'insert into public.companies (company_auth_user_id, company_email, company_display_name, company_membership_status, company_discount_percent) values (''11111111-1111-1111-1111-111111111003'', ''nordic@tsh.test'', ''Nordic Events'', ''external'', 0)',
  'an external company at full price is fine');

-- The same rule under an admin session: status and discount must change
-- together when a member becomes external.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111001","role":"authenticated","app_role":"admin"}';
select throws_ok(
  'update public.companies set company_membership_status = ''external'' where company_email = ''rituals@tsh.test''',
  '23514', null,
  'admin cannot make a discounted member external without dropping the discount');
select lives_ok(
  'update public.companies set company_membership_status = ''external'', company_discount_percent = 0 where company_email = ''rituals@tsh.test''',
  'admin makes a member external at full price in one write');
select throws_ok(
  'update public.companies set company_discount_percent = 25 where company_email = ''nordic@tsh.test''',
  '23514', null,
  'admin cannot grant an external company a discount');

select * from finish();
rollback;
