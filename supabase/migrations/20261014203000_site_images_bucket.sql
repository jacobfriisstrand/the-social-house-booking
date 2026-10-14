-- Site image storage (#89): the hero photo of the public split-screen
-- shell. The bucket row is data (a row in storage.buckets), which
-- declarative schemas cannot express — hence a hand-written migration
-- (docs/agents/supabase.md). Policies live here too: they hang off
-- storage.objects, outside the declarative ./schemas scope — and are
-- declared in schemas/policies/storage.sql so the declarative tree
-- matches the migrated state.
--
-- The bucket is public: the layout renders the photo for anonymous
-- visitors through getPublicUrl. Admin-only writes; reads need no policy
-- for the public URL, the authenticated select covers listing.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-images', 'site-images', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy site_images_bucket_select_authenticated on storage.objects
  for select to authenticated
  using (bucket_id = 'site-images');

create policy site_images_bucket_insert_admin on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'site-images'
    and (auth.jwt() ->> 'app_role') = 'admin'
  );

create policy site_images_bucket_update_admin on storage.objects
  for update to authenticated
  using (
    bucket_id = 'site-images'
    and (auth.jwt() ->> 'app_role') = 'admin'
  )
  with check ((auth.jwt() ->> 'app_role') = 'admin');

create policy site_images_bucket_delete_admin on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'site-images'
    and (auth.jwt() ->> 'app_role') = 'admin'
  );
