-- Admin-curated catalogue; admins manage it, companies read the active
-- part in the booking flow (#7) — a room's offered add-ons with names,
-- prices and descriptions. Inactive add-ons are invisible to companies
-- (deactivating one removes it from the flow without touching bookings).

create policy addons_admin_all on public.addons
  for all to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin')
  with check ((auth.jwt() ->> 'app_role') = 'admin');

create policy addons_select_active_or_admin on public.addons
  for select to authenticated
  using (
    addon_is_active
    or (auth.jwt() ->> 'app_role') = 'admin'
  );

-- The room ↔ add-on links carry ids only (rooms are already readable);
-- the flow joins them against the active add-ons above, so an inactive
-- add-on disappears from the flow even where a link remains.
create policy room_addons_admin_all on public.room_addons
  for all to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin')
  with check ((auth.jwt() ->> 'app_role') = 'admin');

create policy room_addons_select_any on public.room_addons
  for select to authenticated
  using (true);
