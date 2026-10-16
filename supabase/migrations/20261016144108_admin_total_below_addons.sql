ALTER TABLE "public"."bookings"
  DROP CONSTRAINT "bookings_booking_expected_total_ore_check";

ALTER TABLE "public"."bookings"
  DROP CONSTRAINT "bookings_check";

ALTER TABLE "public"."bookings"
  ADD CONSTRAINT "bookings_check1" CHECK ((booking_end_at > booking_start_at));

ALTER TABLE "public"."bookings"
  ADD CONSTRAINT "bookings_check" CHECK (((booking_status <> 'confirmed'::public.booking_status) OR (booking_expected_total_ore >= 0)));
