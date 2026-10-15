begin;
select plan(12);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111070', 'authenticated', 'authenticated', 'current@tsh.test', 'x', now(), '{}', '{}', now(), now());
insert into public.companies (company_id, company_auth_user_id, company_email, company_display_name, company_membership_status)
values ('22222222-2222-2222-2222-222222222070', '11111111-1111-1111-1111-111111111070', 'current@tsh.test', 'Change Test', 'member');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111070","role":"authenticated"}';

select throws_ok(
  $$select count(*) from public.company_change_requests$$,
  '42501', null, 'member cannot read pending requests');
select throws_ok(
  $$select count(*) from public.company_change_tokens$$,
  '42501', null, 'member cannot read token hashes');
select throws_ok(
  $$insert into public.company_change_requests (company_change_request_company_id, company_change_request_current_email, company_change_request_proposed_email, company_change_request_before_values, company_change_request_after_values) values ('22222222-2222-2222-2222-222222222070', 'current@tsh.test', 'new@tsh.test', '{}', '{}')$$,
  '42501', null, 'member cannot insert a request directly');

reset role;
insert into public.company_change_requests (company_change_request_id, company_change_request_company_id, company_change_request_current_email, company_change_request_proposed_email, company_change_request_before_values, company_change_request_after_values)
values ('33333333-3333-3333-3333-333333333070', '22222222-2222-2222-2222-222222222070', 'current@tsh.test', 'new@tsh.test', '{"email":"current@tsh.test"}', '{"email":"new@tsh.test"}');
insert into public.company_change_tokens (company_change_token_request_id, company_change_token_kind, company_change_token_hash, company_change_token_expires_at)
values ('33333333-3333-3333-3333-333333333070', 'current_email', 'hash-070', now() + interval '30 minutes');

select is((select company_email from public.companies where company_id = '22222222-2222-2222-2222-222222222070'), 'current@tsh.test', 'live company email is unchanged before approval');
select throws_ok($$select public.apply_company_change_request('33333333-3333-3333-3333-333333333070', 'wrong')$$, 'P0002', null, 'wrong token is rejected');
select lives_ok($$select public.apply_company_change_request('33333333-3333-3333-3333-333333333070', 'hash-070')$$, 'current email approval succeeds');
select is((select company_change_request_status from public.company_change_requests where company_change_request_id = '33333333-3333-3333-3333-333333333070'), 'awaiting_new_email', 'email change waits for new email');
select is((select company_email from public.companies where company_id = '22222222-2222-2222-2222-222222222070'), 'current@tsh.test', 'current approval does not partially change the live email');
select is((select company_change_token_consumed_at is not null from public.company_change_tokens where company_change_token_hash = 'hash-070'), true, 'current token is consumed');
select throws_ok($$select public.apply_company_change_request('33333333-3333-3333-3333-333333333070', 'hash-070')$$, 'P0002', null, 'consumed token cannot be replayed');
insert into public.company_change_requests (company_change_request_id, company_change_request_company_id, company_change_request_current_email, company_change_request_proposed_email, company_change_request_before_values, company_change_request_after_values)
values ('33333333-3333-3333-3333-333333333071', '22222222-2222-2222-2222-222222222070', 'current@tsh.test', 'expired@tsh.test', '{"email":"current@tsh.test"}', '{"email":"expired@tsh.test"}');
insert into public.company_change_tokens (company_change_token_request_id, company_change_token_kind, company_change_token_hash, company_change_token_expires_at)
values ('33333333-3333-3333-3333-333333333071', 'current_email', 'expired-hash-070', now() - interval '1 minute');
select lives_ok($$select public.apply_company_change_request('33333333-3333-3333-3333-333333333071', 'expired-hash-070')$$, 'expired token is rejected');
select is((select company_change_request_status from public.company_change_requests where company_change_request_id = '33333333-3333-3333-3333-333333333071'), 'expired', 'expired request is marked expired');

select * from finish();
rollback;
