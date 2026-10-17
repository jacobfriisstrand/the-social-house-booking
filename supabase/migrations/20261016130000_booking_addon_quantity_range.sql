-- #119: a per-participant add-on's quantity is the customer's choice
-- between 1 and the booking's participant count (coffee for 4 of 8
-- people) — it no longer has to equal the participant count. The fixed
-- add-on's quantity stays 1. The line total is guarded by the
-- booking_addon_total_check constraint, so unit × quantity stays true for
-- any allowed quantity.
SET local check_function_bodies = off;

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
    and (
      new.booking_addon_quantity < 1
      or new.booking_addon_quantity > v_participant_count
    )
  then
    raise exception
      'a per-participant add-on''s quantity must be between 1 and the booking''s participant count'
      using errcode = 'P0001';
  end if;

  if v_model = 'fixed' and new.booking_addon_quantity is distinct from 1 then
    raise exception 'a fixed add-on''s quantity must be 1'
      using errcode = 'P0001';
  end if;

  return new;
end;
$function$;
