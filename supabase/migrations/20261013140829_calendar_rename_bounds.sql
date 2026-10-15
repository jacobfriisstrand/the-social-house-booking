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
      and b.booking_end_at > now()
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
      and b.booking_end_at > now()
  ) or ce.calendar_event_house_event_id in (
    select her.house_event_room_event_id
    from public.house_event_rooms her
    join public.house_events he on he.house_event_id = her.house_event_room_event_id
    where her.house_event_room_room_id = new.room_id
      and he.house_event_end_at > now()
  );
  return null;
end;
$function$;
