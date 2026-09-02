-- Terms, privacy policy, and GDPR overview (#15): companies must read the
-- published versions to accept them; drafts stay admin-only. Acceptances
-- are immutable legal records: the company inserts its own and reads its
-- own; there are no update/delete policies.

create policy terms_versions_select_published_or_admin on public.terms_versions
  for select to authenticated
  using (
    terms_version_published_at is not null
    or (auth.jwt() ->> 'app_role') = 'admin'
  );

create policy terms_versions_insert_admin on public.terms_versions
  for insert to authenticated
  with check ((auth.jwt() ->> 'app_role') = 'admin');

create policy terms_versions_update_admin on public.terms_versions
  for update to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin')
  with check ((auth.jwt() ->> 'app_role') = 'admin');

create policy terms_versions_delete_admin on public.terms_versions
  for delete to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin');

create policy terms_acceptances_select_own_or_admin on public.terms_acceptances
  for select to authenticated
  using (
    terms_acceptance_company_id = (select c.company_id from public.companies c where c.company_auth_user_id = auth.uid())
    or (auth.jwt() ->> 'app_role') = 'admin'
  );

create policy terms_acceptances_insert_own_or_admin on public.terms_acceptances
  for insert to authenticated
  with check (
    terms_acceptance_company_id = (select c.company_id from public.companies c where c.company_auth_user_id = auth.uid())
    or (auth.jwt() ->> 'app_role') = 'admin'
  );
