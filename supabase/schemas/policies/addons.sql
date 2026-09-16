-- Admin-curated catalogue: admin manages it; every logged-in company reads
-- it, since the booking dialog lists a room's add-ons with their prices
-- (Bilag 1 "Tilvalg", #4). Prices on a booking are snapshotted into
-- booking_addons (ADR-0005), so a later catalogue change never leaks back.

create policy addons_admin_all on public.addons
  for all to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin')
  with check ((auth.jwt() ->> 'app_role') = 'admin');

create policy addons_select_authenticated on public.addons
  for select to authenticated
  using (true);

create policy room_addons_admin_all on public.room_addons
  for all to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin')
  with check ((auth.jwt() ->> 'app_role') = 'admin');

create policy room_addons_select_authenticated on public.room_addons
  for select to authenticated
  using (true);
