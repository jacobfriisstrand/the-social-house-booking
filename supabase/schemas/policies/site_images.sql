-- The public layout reads the hero slot with an anonymous session (#89);
-- writes are admin-only. No delete policy: the slot's row is replaced by
-- upsert, never removed (same reasoning as settings).

create policy site_images_select_public on public.site_images
  for select to anon, authenticated
  using (true);

create policy site_images_insert_admin on public.site_images
  for insert to authenticated
  with check ((auth.jwt() ->> 'app_role') = 'admin');

create policy site_images_update_admin on public.site_images
  for update to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin')
  with check ((auth.jwt() ->> 'app_role') = 'admin');
