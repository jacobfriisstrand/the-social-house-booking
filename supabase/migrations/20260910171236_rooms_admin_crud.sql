SET local check_function_bodies = off;

REVOKE ALL ON FUNCTION "public"."assert_booking_room_free"(uuid, timestamp WITH time zone, timestamp WITH time zone) FROM "anon";

REVOKE ALL ON FUNCTION "public"."assert_event_room_free"(uuid, timestamp WITH time zone, timestamp WITH time zone, uuid) FROM "anon";

REVOKE ALL ON FUNCTION "public"."expire_stale_holds"() FROM "anon";

REVOKE ALL ON FUNCTION "public"."expire_stale_holds"() FROM "authenticated";

REVOKE ALL ON FUNCTION "public"."next_booking_number"() FROM "anon";

ALTER TABLE "public"."rooms"
  DROP CONSTRAINT "rooms_closes_after_opens_check";

-- Renames (issue #3 data model): price becomes the hourly price, practical
-- info becomes practical notes, image URL becomes a storage path. Renames
-- carry existing values over; drop+add would fail on non-empty tables.
ALTER TABLE "public"."rooms"
  RENAME COLUMN "room_price_ore" TO "room_hourly_price_ore";

ALTER TABLE "public"."rooms"
  RENAME CONSTRAINT "rooms_room_price_ore_check" TO "rooms_room_hourly_price_ore_check";

ALTER TABLE "public"."rooms"
  RENAME COLUMN "room_practical_info" TO "room_practical_notes";

ALTER TABLE "public"."room_images"
  RENAME COLUMN "room_image_url" TO "room_image_storage_path";

-- Old room_image_url rows carry full public URLs; keep only the bucket path
-- (everything after /room-images/), which is what getPublicUrl expects.
UPDATE "public"."room_images"
SET "room_image_storage_path" = substring(
  "room_image_storage_path"
  from
    position('/room-images/' in "room_image_storage_path") + char_length('/room-images/')
)
WHERE position('/room-images/' in "room_image_storage_path") > 0;

CREATE TABLE "public"."room_opening_hours" (
  "room_opening_hour_id"          uuid                   NOT NULL DEFAULT gen_random_uuid(),
  "room_opening_hour_room_id"     uuid                   NOT NULL,
  "room_opening_hour_day_of_week" integer                NOT NULL,
  "room_opening_hour_opens"       time without time zone NOT NULL,
  "room_opening_hour_closes"      time without time zone NOT NULL,
  "room_opening_hour_is_closed"   boolean                NOT NULL DEFAULT false,
  CONSTRAINT "room_opening_hours_closes_after_opens_check" CHECK ((room_opening_hour_is_closed OR (room_opening_hour_closes > room_opening_hour_opens))),
  CONSTRAINT "room_opening_hours_pkey" PRIMARY KEY (room_opening_hour_id),
  CONSTRAINT "room_opening_hours_room_day_unique" UNIQUE (room_opening_hour_room_id, room_opening_hour_day_of_week),
  CONSTRAINT "room_opening_hours_room_opening_hour_day_of_week_check" CHECK (((room_opening_hour_day_of_week >= 0) AND (room_opening_hour_day_of_week <= 6)))
);

ALTER TABLE "public"."room_opening_hours"
  ENABLE ROW LEVEL SECURITY;

-- Backfill (hand-written DML): the old model had one daily opens/closes pair
-- per room; carry it over as seven identical weekly rows so no room loses
-- its hours in the switch.
INSERT INTO "public"."room_opening_hours"
  ("room_opening_hour_room_id", "room_opening_hour_day_of_week", "room_opening_hour_opens", "room_opening_hour_closes", "room_opening_hour_is_closed")
SELECT room_id, weekday, room_opens_at, room_closes_at, false
FROM "public"."rooms"
CROSS JOIN generate_series(0, 6) AS weekday;

ALTER TABLE "public"."rooms"
  DROP COLUMN "room_closes_at";

ALTER TABLE "public"."rooms"
  DROP COLUMN "room_opens_at";

-- Special closing days (lukkedag, CONTEXT.md): one date where the room
-- deviates from its weekly hours — closed all day, or open with other hours.
CREATE TABLE "public"."room_special_closing_days" (
  "room_special_closing_day_id"        uuid                   NOT NULL DEFAULT gen_random_uuid(),
  "room_special_closing_day_room_id"   uuid                   NOT NULL,
  "room_special_closing_day_date"      date                   NOT NULL,
  "room_special_closing_day_opens"     time without time zone,
  "room_special_closing_day_closes"    time without time zone,
  "room_special_closing_day_is_closed" boolean                NOT NULL DEFAULT false,
  CONSTRAINT "room_special_closing_days_closes_after_opens_check"
    CHECK
    (((room_special_closing_day_is_closed AND (room_special_closing_day_opens IS NULL) AND (room_special_closing_day_closes IS NULL)) OR ((NOT room_special_closing_day_is_closed) AND
    (room_special_closing_day_opens IS NOT NULL) AND (room_special_closing_day_closes IS NOT NULL) AND (room_special_closing_day_closes > room_special_closing_day_opens)))),
  CONSTRAINT "room_special_closing_days_pkey" PRIMARY KEY (room_special_closing_day_id),
  CONSTRAINT "room_special_closing_days_room_date_unique" UNIQUE (room_special_closing_day_room_id, room_special_closing_day_date)
);

ALTER TABLE "public"."room_special_closing_days"
  ENABLE ROW LEVEL SECURITY;

-- One display order per room: concurrent saves cannot silently produce
-- duplicate sort orders. The plain (room_id, sort_order) index is replaced
-- by the unique constraint's own index.
DROP INDEX IF EXISTS "public"."room_images_room_idx";

ALTER TABLE "public"."room_images"
  ADD CONSTRAINT "room_images_room_sort_order_unique" UNIQUE (room_image_room_id, room_image_sort_order);

ALTER TABLE "public"."room_special_closing_days"
  ADD CONSTRAINT "room_special_closing_days_room_special_closing_day_room_id_fkey" FOREIGN KEY (room_special_closing_day_room_id) REFERENCES public.rooms(room_id) ON DELETE CASCADE;

ALTER TABLE "public"."room_opening_hours"
  ADD CONSTRAINT "room_opening_hours_room_opening_hour_room_id_fkey" FOREIGN KEY (room_opening_hour_room_id) REFERENCES public.rooms(room_id) ON DELETE CASCADE;

CREATE INDEX room_special_closing_days_room_date_idx ON public.room_special_closing_days USING btree (room_special_closing_day_room_id, room_special_closing_day_date);

CREATE INDEX room_opening_hours_room_idx ON public.room_opening_hours USING btree (room_opening_hour_room_id, room_opening_hour_day_of_week);

CREATE POLICY "room_special_closing_days_delete_admin" ON "public"."room_special_closing_days"
  FOR DELETE
  TO "authenticated"
  USING (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "room_special_closing_days_insert_admin" ON "public"."room_special_closing_days"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "room_special_closing_days_select_authenticated" ON "public"."room_special_closing_days"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "room_special_closing_days_update_admin" ON "public"."room_special_closing_days"
  FOR UPDATE
  TO "authenticated"
  USING (((auth.jwt() ->> 'app_role'::text) = 'admin'::text))
  WITH CHECK (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "room_opening_hours_delete_admin" ON "public"."room_opening_hours"
  FOR DELETE
  TO "authenticated"
  USING (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "room_opening_hours_insert_admin" ON "public"."room_opening_hours"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "room_opening_hours_select_authenticated" ON "public"."room_opening_hours"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "room_opening_hours_update_admin" ON "public"."room_opening_hours"
  FOR UPDATE
  TO "authenticated"
  USING (((auth.jwt() ->> 'app_role'::text) = 'admin'::text))
  WITH CHECK (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."room_special_closing_days" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."room_opening_hours" TO "anon", "authenticated", "postgres", "service_role";
