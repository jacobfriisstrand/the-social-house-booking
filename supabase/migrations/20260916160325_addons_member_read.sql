-- Companies read the add-on catalogue and which add-ons each room offers,
-- so the booking dialog can list them (Bilag 1 "Tilvalg", #4). Writes stay
-- admin-only (addons_admin_all, room_addons_admin_all).

create policy addons_select_authenticated on public.addons
  for select to authenticated
  using (true);

create policy room_addons_select_authenticated on public.room_addons
  for select to authenticated
  using (true);
