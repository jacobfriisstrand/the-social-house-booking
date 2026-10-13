SET local check_function_bodies = off;

CREATE TABLE "public"."calendar_events" (
  "calendar_event_id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "calendar_event_booking_id"     uuid,
  "calendar_event_house_event_id" uuid,
  "calendar_event_graph_event_id" text,
  "calendar_event_last_synced_at" timestamp with time zone,
  "calendar_event_needs_sync"     boolean                  NOT NULL DEFAULT true,
  "calendar_event_created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "calendar_event_updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "calendar_events_booking_key" UNIQUE (calendar_event_booking_id),
  CONSTRAINT "calendar_events_house_event_key" UNIQUE (calendar_event_house_event_id),
  CONSTRAINT "calendar_events_pkey" PRIMARY KEY (calendar_event_id),
  CONSTRAINT "calendar_events_source_exclusive" CHECK ((num_nonnulls(calendar_event_booking_id, calendar_event_house_event_id) <= 1))
);

ALTER TABLE "public"."calendar_events"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.mark_booking_calendar_dirty()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if new.booking_status = 'confirmed' then
    insert into public.calendar_events (calendar_event_booking_id, calendar_event_needs_sync)
    values (new.booking_id, true)
    on conflict (calendar_event_booking_id) do update
      set calendar_event_needs_sync = true,
          calendar_event_updated_at = now();
  elsif new.booking_status in ('cancelled', 'expired') then
    update public.calendar_events ce
    set calendar_event_needs_sync = true,
        calendar_event_updated_at = now()
    where ce.calendar_event_booking_id = new.booking_id;
  end if;
  -- 'pending_verification' holds are not mirrored.
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.mark_calendar_event_orphaned()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  new.calendar_event_needs_sync := true;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.mark_house_event_calendar_dirty()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  insert into public.calendar_events (calendar_event_house_event_id, calendar_event_needs_sync)
  values (new.house_event_id, true)
  on conflict (calendar_event_house_event_id) do update
    set calendar_event_needs_sync = true,
        calendar_event_updated_at = now();
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.mark_house_event_rooms_calendar_dirty()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_house_event_id uuid;
begin
  -- On DELETE `new` is unassigned and on INSERT `old` is (bookings.sql).
  if tg_op = 'DELETE' then
    v_house_event_id := old.house_event_room_event_id;
  else
    v_house_event_id := new.house_event_room_event_id;
  end if;

  if exists (
    select 1 from public.house_events he
    where he.house_event_id = v_house_event_id
  ) then
    insert into public.calendar_events (calendar_event_house_event_id, calendar_event_needs_sync)
    values (v_house_event_id, true)
    on conflict (calendar_event_house_event_id) do update
      set calendar_event_needs_sync = true,
          calendar_event_updated_at = now();
  end if;
  return null;
end;
$function$;

ALTER TABLE "public"."calendar_events"
  ADD CONSTRAINT "calendar_events_calendar_event_booking_id_fkey" FOREIGN KEY (calendar_event_booking_id) REFERENCES public.bookings(booking_id) ON DELETE
    SET NULL (calendar_event_booking_id);

ALTER TABLE "public"."calendar_events"
  ADD CONSTRAINT "calendar_events_calendar_event_house_event_id_fkey" FOREIGN KEY (calendar_event_house_event_id) REFERENCES public.house_events(house_event_id) ON DELETE
    SET NULL (calendar_event_house_event_id);

CREATE INDEX calendar_events_dirty_idx ON public.calendar_events USING btree (calendar_event_id)
  WHERE calendar_event_needs_sync;

CREATE TRIGGER bookings_calendar_dirty
  AFTER INSERT OR UPDATE OF booking_company_id,
    booking_room_id,
    booking_status,
    booking_start_at, booking_end_at, booking_participant_count, booking_booker_name, booking_booker_email, booking_booker_phone, booking_reference ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_booking_calendar_dirty();

CREATE TRIGGER calendar_events_source_removed
  BEFORE UPDATE OF calendar_event_booking_id, calendar_event_house_event_id ON public.calendar_events
  FOR EACH ROW
  WHEN ((((old.calendar_event_booking_id IS NOT NULL) AND (new.calendar_event_booking_id IS NULL)) OR ((old.calendar_event_house_event_id IS
    NOT NULL) AND (new.calendar_event_house_event_id IS NULL))))
  EXECUTE FUNCTION public.mark_calendar_event_orphaned();

CREATE TRIGGER house_event_rooms_calendar_dirty
  AFTER INSERT OR DELETE ON public.house_event_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_house_event_rooms_calendar_dirty();

CREATE TRIGGER house_events_calendar_dirty
  AFTER INSERT OR UPDATE OF house_event_title, house_event_description, house_event_start_at, house_event_end_at ON public.house_events
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_house_event_calendar_dirty();

GRANT EXECUTE ON FUNCTION "public"."mark_booking_calendar_dirty"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."mark_calendar_event_orphaned"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."mark_house_event_calendar_dirty"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."mark_house_event_rooms_calendar_dirty"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."calendar_events" TO "anon", "authenticated", "postgres", "service_role";
