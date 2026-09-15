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

-- Opening hours and special closing days ride with the room: companies need
-- them to see when a room can be booked; admin edits them (#3).
create policy room_opening_hours_select_authenticated on public.room_opening_hours
  for select to authenticated
  using (true);

create policy room_opening_hours_insert_admin on public.room_opening_hours
  for insert to authenticated
  with check ((auth.jwt() ->> 'app_role') = 'admin');

create policy room_opening_hours_update_admin on public.room_opening_hours
  for update to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin')
  with check ((auth.jwt() ->> 'app_role') = 'admin');

create policy room_opening_hours_delete_admin on public.room_opening_hours
  for delete to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin');

create policy room_special_closing_days_select_authenticated on public.room_special_closing_days
  for select to authenticated
  using (true);

create policy room_special_closing_days_insert_admin on public.room_special_closing_days
  for insert to authenticated
  with check ((auth.jwt() ->> 'app_role') = 'admin');

create policy room_special_closing_days_update_admin on public.room_special_closing_days
  for update to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin')
  with check ((auth.jwt() ->> 'app_role') = 'admin');

create policy room_special_closing_days_delete_admin on public.room_special_closing_days
  for delete to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin');
