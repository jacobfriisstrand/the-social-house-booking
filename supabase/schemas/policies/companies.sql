-- Permission system (#19): admin is the `app_role` JWT claim written by the
-- custom access token hook (docs/agents/auth.md) — never a subquery on the
-- admins table. A company is the auth user linked by
-- companies.company_auth_user_id (#1).
--
-- RLS is row-level and admins share the `authenticated` role with company
-- users, so column-level escalation (a company promoting itself to member
-- or granting itself a discount, #1) is guarded by a trigger, not a policy.

create policy companies_select_own_or_admin on public.companies
  for select to authenticated
  using (
    company_auth_user_id = auth.uid()
    or (auth.jwt() ->> 'app_role') = 'admin'
  );

-- Companies are created by the admin onboarding flow (#1); no self-service.
create policy companies_insert_admin on public.companies
  for insert to authenticated
  with check ((auth.jwt() ->> 'app_role') = 'admin');

create policy companies_update_own_or_admin on public.companies
  for update to authenticated
  using (
    company_auth_user_id = auth.uid()
    or (auth.jwt() ->> 'app_role') = 'admin'
  )
  with check (
    company_auth_user_id = auth.uid()
    or (auth.jwt() ->> 'app_role') = 'admin'
  );

create policy companies_delete_admin on public.companies
  for delete to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin');

-- Column-level escalation guard: only the admin claim may change membership
-- status or the agreed discount. Runs on every row update; the JWT claim is
-- read directly so the guard works for both PostgREST and server actions.
create function public.companies_guard_self_escalation() returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  if
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'app_role') is distinct from 'admin'
    and (
      new.company_membership_status is distinct from old.company_membership_status
      or new.company_discount_percent is distinct from old.company_discount_percent
    )
  then
    raise exception 'only admins can change company_membership_status or company_discount_percent'
      using errcode = '42501'; -- insufficient_privilege
  end if;
  return new;
end;
$$;

create trigger companies_guard_self_escalation
  before update on public.companies
  for each row execute function public.companies_guard_self_escalation();
