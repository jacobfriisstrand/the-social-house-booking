-- Room image metadata (#3): every room_images row records the original file
-- name and byte size so the admin form can show them for saved photos. The
-- columns are not null, the size must be positive, and the display order is
-- unique per room — a concurrent save cannot produce duplicate orders.

begin;
select plan(5);

-- Fixtures: one room to hang the image on.
insert into public.rooms (room_id, room_name, room_capacity, room_hourly_price_ore, room_is_active) values
  ('44444444-4444-4444-4444-444444444010', 'Metadata Room', 10, 500000, true);

select throws_ok(
  'insert into public.room_images (room_image_room_id, room_image_storage_path, room_image_file_size) values (''44444444-4444-4444-4444-444444444010'', ''rooms/44444444-4444-4444-4444-444444444010/a.jpg'', 1024)',
  '23502', null,
  'room image without a file name is rejected');

select throws_ok(
  'insert into public.room_images (room_image_room_id, room_image_storage_path, room_image_file_name, room_image_file_size) values (''44444444-4444-4444-4444-444444444010'', ''rooms/44444444-4444-4444-4444-444444444010/a.jpg'', ''a.jpg'', 0)',
  '23514', null,
  'room image with a non-positive file size is rejected');

select lives_ok(
  'insert into public.room_images (room_image_room_id, room_image_storage_path, room_image_file_name, room_image_file_size) values (''44444444-4444-4444-4444-444444444010'', ''rooms/44444444-4444-4444-4444-444444444010/a.jpg'', ''a.jpg'', 1024)',
  'room image with name and positive size is accepted');

select throws_ok(
  'insert into public.room_images (room_image_room_id, room_image_storage_path, room_image_file_name, room_image_file_size, room_image_sort_order) values (''44444444-4444-4444-4444-444444444010'', ''rooms/44444444-4444-4444-4444-444444444010/b.jpg'', ''b.jpg'', 1024, 0)',
  '23505', null,
  'a duplicate sort order within one room is rejected');

select lives_ok(
  'insert into public.room_images (room_image_room_id, room_image_storage_path, room_image_file_name, room_image_file_size, room_image_sort_order) values (''44444444-4444-4444-4444-444444444010'', ''rooms/44444444-4444-4444-4444-444444444010/b.jpg'', ''b.jpg'', 1024, 1)',
  'the next sort order in the same room is accepted');

select * from finish();
rollback;
