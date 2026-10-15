SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.mark_company_bookings_calendar_dirty()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  update public.calendar_events ce
  set calendar_event_needs_sync = true,
      calendar_event_updated_at = now()
  where ce.calendar_event_booking_id in (
    select b.booking_id
    from public.bookings b
    where b.booking_company_id = new.company_id
      and b.booking_status = 'confirmed'
  );
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.mark_room_bookings_calendar_dirty()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  update public.calendar_events ce
  set calendar_event_needs_sync = true,
      calendar_event_updated_at = now()
  where ce.calendar_event_booking_id in (
    select b.booking_id
    from public.bookings b
    where b.booking_room_id = new.room_id
      and b.booking_status = 'confirmed'
  ) or ce.calendar_event_house_event_id in (
    select her.house_event_room_event_id
    from public.house_event_rooms her
    where her.house_event_room_room_id = new.room_id
  );
  return null;
end;
$function$;

CREATE TRIGGER companies_calendar_dirty
  AFTER UPDATE OF company_display_name ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_company_bookings_calendar_dirty();

CREATE TRIGGER rooms_calendar_dirty
  AFTER UPDATE OF room_name ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_room_bookings_calendar_dirty();

GRANT EXECUTE ON FUNCTION "public"."mark_company_bookings_calendar_dirty"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."mark_room_bookings_calendar_dirty"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
