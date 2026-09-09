-- Verification codes are single-use secrets; the app reads and consumes
-- them server-side. Default rule: admin-only until #2 specifies otherwise
-- (#19).

create policy verification_codes_admin_all on public.verification_codes
  for all to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin')
  with check ((auth.jwt() ->> 'app_role') = 'admin');
