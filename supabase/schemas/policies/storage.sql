-- Storage policies for the room-images bucket. The bucket row itself is DML
-- (hand-written migration 20260910170748_room_images_bucket.sql); policies
-- are declared here so the declarative tree matches the migrated state.
-- Photos are public presentation data; writes are admin-only (#3).

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
