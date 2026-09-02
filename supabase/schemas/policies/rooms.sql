-- Rooms are member-visible: companies browse rooms to search and book
-- (Bilag 1 room search, #4) and need them for their own booking overview.
-- Deactivated rooms stay readable so historical bookings resolve their room
-- name; the booking flow filters on room_is_active in app logic (#3/#31).
-- Administration (create, edit, deactivate) stays admin-only (#3).

create policy rooms_select_authenticated on public.rooms
  for select to authenticated
  using (true);

create policy rooms_insert_admin on public.rooms
  for insert to authenticated
  with check ((auth.jwt() ->> 'app_role') = 'admin');

create policy rooms_update_admin on public.rooms
  for update to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin')
  with check ((auth.jwt() ->> 'app_role') = 'admin');

create policy rooms_delete_admin on public.rooms
  for delete to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin');

-- Images belong to the room record (cascade delete, presentation data only).
create policy room_images_select_authenticated on public.room_images
  for select to authenticated
  using (true);

create policy room_images_insert_admin on public.room_images
  for insert to authenticated
  with check ((auth.jwt() ->> 'app_role') = 'admin');

create policy room_images_update_admin on public.room_images
  for update to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin')
  with check ((auth.jwt() ->> 'app_role') = 'admin');

create policy room_images_delete_admin on public.room_images
  for delete to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin');
