-- The public layout reads the hero slot with an anonymous session (#89);
-- writes are admin-only. Delete is admin-only too: the settings form can
-- remove the image (the public layout then falls back to the logo).

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

create policy site_images_delete_admin on public.site_images
  for delete to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin');
