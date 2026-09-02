-- Company-read-own (#17): a company reads the emails logged about its
-- bookings; rows without a company (system mail) stay admin-only. Writes
-- are service-role only — sendMail() (#17) uses the admin client — so there
-- are no insert/update/delete policies.

create policy outbound_emails_select_own_or_admin on public.outbound_emails
  for select to authenticated
  using (
    outbound_email_company_id = (select c.company_id from public.companies c where c.company_auth_user_id = auth.uid())
    or (auth.jwt() ->> 'app_role') = 'admin'
  );
