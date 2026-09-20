SET local check_function_bodies = off;

ALTER TABLE "public"."booking_addons"
  DROP CONSTRAINT "booking_addons_booking_addon_price_ore_check";

ALTER TABLE "public"."booking_addons"
  DROP COLUMN "booking_addon_price_ore";

ALTER TABLE "public"."addons"
  ADD COLUMN "addon_sort_order" integer;

ALTER TABLE "public"."booking_addons"
  ADD COLUMN "booking_addon_unit_price_ore" integer NOT NULL;

ALTER TABLE "public"."booking_addons"
  ADD COLUMN "booking_addon_quantity" integer NOT NULL;

ALTER TABLE "public"."booking_addons"
  ADD COLUMN "booking_addon_total_ore" integer NOT NULL;

ALTER TABLE "public"."bookings"
  ADD COLUMN "booking_catering_accepted_at" timestamp WITH time zone;

CREATE OR REPLACE FUNCTION public.enforce_addon_line_values()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
declare
  v_model public.addon_pricing_model;
  v_participant_count integer;
begin
  select a.addon_pricing_model into v_model
  from public.addons a
  where a.addon_id = new.booking_addon_addon_id;

  select b.booking_participant_count into v_participant_count
  from public.bookings b
  where b.booking_id = new.booking_addon_booking_id;

  if v_model = 'per_participant'
    and new.booking_addon_quantity is distinct from v_participant_count
  then
    raise exception
      'a per-participant add-on''s quantity must equal the booking''s participant count'
      using errcode = 'P0001';
  end if;

  if v_model = 'fixed' and new.booking_addon_quantity is distinct from 1 then
    raise exception 'a fixed add-on''s quantity must be 1'
      using errcode = 'P0001';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_booking_addon_totals()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
declare
  v_booking_id uuid;
  v_stored_total integer;
  v_line_sum integer;
begin
  if tg_op = 'DELETE' then
    v_booking_id := old.booking_addon_booking_id;
  else
    v_booking_id := new.booking_addon_booking_id;
  end if;

  select b.booking_addon_total_ore into v_stored_total
  from public.bookings b
  where b.booking_id = v_booking_id;

  select coalesce(sum(a.booking_addon_total_ore), 0) into v_line_sum
  from public.booking_addons a
  where a.booking_addon_booking_id = v_booking_id;

  if v_line_sum is distinct from v_stored_total then
    update public.bookings b
    set booking_addon_total_ore = v_line_sum,
        booking_expected_total_ore =
          b.booking_expected_total_ore + (v_line_sum - v_stored_total)
    where b.booking_id = v_booking_id;
  end if;

  return null;
end;
$function$;

ALTER TABLE "public"."booking_addons"
  ADD CONSTRAINT "booking_addon_total_check" CHECK ((booking_addon_total_ore = (booking_addon_unit_price_ore * booking_addon_quantity)));

ALTER TABLE "public"."booking_addons"
  ADD CONSTRAINT "booking_addons_booking_addon_quantity_check" CHECK ((booking_addon_quantity > 0));

ALTER TABLE "public"."booking_addons"
  ADD CONSTRAINT "booking_addons_booking_addon_total_ore_check" CHECK ((booking_addon_total_ore >= 0));

ALTER TABLE "public"."booking_addons"
  ADD CONSTRAINT "booking_addons_booking_addon_unit_price_ore_check" CHECK ((booking_addon_unit_price_ore >= 0));

CREATE TRIGGER booking_addons_line_values
  BEFORE INSERT OR UPDATE OF booking_addon_addon_id, booking_addon_quantity ON public.booking_addons
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_addon_line_values();

CREATE TRIGGER booking_addons_sync_totals
  AFTER INSERT OR DELETE OR UPDATE ON public.booking_addons
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_booking_addon_totals();

CREATE POLICY "addons_select_active_or_admin" ON "public"."addons"
  FOR SELECT
  TO "authenticated"
  USING ((addon_is_active OR ((auth.jwt() ->> 'app_role'::text) = 'admin'::text)));

CREATE POLICY "room_addons_select_any" ON "public"."room_addons"
  FOR SELECT
  TO "authenticated"
  USING (true);

GRANT EXECUTE ON FUNCTION "public"."enforce_addon_line_values"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."sync_booking_addon_totals"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
