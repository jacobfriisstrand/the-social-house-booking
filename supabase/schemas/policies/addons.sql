-- Admin-curated catalogue; admin-only until a feature ticket specifies a
-- company-facing read (add-on selection in the booking flow) — default
-- rule (#19).

create policy addons_admin_all on public.addons
  for all to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin')
  with check ((auth.jwt() ->> 'app_role') = 'admin');

create policy room_addons_admin_all on public.room_addons
  for all to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin')
  with check ((auth.jwt() ->> 'app_role') = 'admin');
