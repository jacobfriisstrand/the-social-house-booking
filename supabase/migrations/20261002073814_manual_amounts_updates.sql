SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.enforce_manual_amount_after_meeting()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  if exists (
    select 1
    from public.bookings b
    where b.booking_id = new.manual_amount_booking_id
      and b.booking_invoicing_status = 'invoiced'
  ) then
    raise exception 'the booking is already invoiced'
      using errcode = 'P0001';
  end if;
  if exists (
    select 1
    from public.bookings b
    where b.booking_id = new.manual_amount_booking_id
      and (b.booking_status <> 'confirmed' or b.booking_end_at > now())
  ) then
    raise exception
      'a manual amount can only be added after the booking has been held'
      using errcode = 'P0001';
  end if;
  return new;
end;
$function$;

CREATE POLICY "manual_amounts_delete_admin" ON "public"."manual_amounts"
  FOR DELETE
  TO "authenticated"
  USING (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));
