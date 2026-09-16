-- Site-wide settings: every logged-in viewer reads the Wi-Fi credentials
-- (the shell footer shows them, DESIGN.md); only the admin claim writes.
-- There is deliberately no delete policy: the row is single, guarded by
-- settings.setting_id, and every viewer needs it.

create policy settings_select_authenticated on public.settings
  for select to authenticated
  using (true);

create policy settings_insert_admin on public.settings
  for insert to authenticated
  with check ((auth.jwt() ->> 'app_role') = 'admin');

create policy settings_update_admin on public.settings
  for update to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin')
  with check ((auth.jwt() ->> 'app_role') = 'admin');
