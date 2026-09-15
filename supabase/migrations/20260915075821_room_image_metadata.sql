ALTER TABLE "public"."room_images"
  ADD COLUMN "room_image_file_name" text NOT NULL;

ALTER TABLE "public"."room_images"
  ADD COLUMN "room_image_file_size" integer NOT NULL;

ALTER TABLE "public"."room_images"
  ADD CONSTRAINT "room_images_room_image_file_size_check" CHECK ((room_image_file_size > 0));
