-- Room photo storage (#3). The bucket itself is data (a row in storage.buckets),
-- which declarative schemas cannot express — hence a hand-written migration
-- (docs/agents/supabase.md). Policies live here too: they hang off
-- storage.objects, outside the declarative ./schemas scope.
--
-- The bucket is public: room photos are presentation data, read through
-- getPublicUrl by members and on the booking pages. Admin-only writes; reads
-- need no policy for the public URL, the authenticated select covers listing.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('room-images', 'room-images', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy room_images_bucket_select_authenticated on storage.objects
  for select to authenticated
  using (bucket_id = 'room-images');

create policy room_images_bucket_insert_admin on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'room-images'
    and (auth.jwt() ->> 'app_role') = 'admin'
  );

create policy room_images_bucket_update_admin on storage.objects
  for update to authenticated
  using (
    bucket_id = 'room-images'
    and (auth.jwt() ->> 'app_role') = 'admin'
  )
  with check ((auth.jwt() ->> 'app_role') = 'admin');

create policy room_images_bucket_delete_admin on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'room-images'
    and (auth.jwt() ->> 'app_role') = 'admin'
  );
