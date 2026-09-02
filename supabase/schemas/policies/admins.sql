-- Admin registry: readable by admins for admin screens; writes stay
-- service-role only (maintained by the custom access token hook and
-- scripts/create-admin.ts, #25). Policies never query this table.

create policy admins_select_admin on public.admins
  for select to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin');
