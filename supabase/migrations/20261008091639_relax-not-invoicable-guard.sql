SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.enforce_invoicing_status_change()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  -- The guard binds user sessions, not maintenance paths: a trigger has no
  -- `to authenticated` clause, so the roles seed, migrations and the
  -- service key run as (postgres, service_role) are exempted here, the way
  -- RLS exempts them by scoping its policies to authenticated.
  if current_user = 'authenticated' then
    if (auth.jwt() ->> 'app_role') is distinct from 'admin' then
      raise exception 'only an admin can change the invoicing status'
        using errcode = '42501';
    end if;
    if new.booking_invoicing_status = 'invoiced'
      and new.booking_end_at > now()
    then
      raise exception
        'a booking can first be marked invoiced after its end time'
        using errcode = 'P0001';
    end if;
  end if;
  -- The who/when of the invoice are maintained here, not by the writer:
  -- an action only supplies date and number, and every path that marks a
  -- booking invoiced records the same audit. A writer that already carried
  -- the values (seed fixtures) keeps them. Leaving 'invoiced' clears both,
  -- so the columns always read the current state while the trail keeps
  -- every past one.
  if new.booking_invoicing_status = 'invoiced' then
    if new.booking_invoiced_at is null then
      new.booking_invoiced_at := now();
      new.booking_invoiced_by := auth.uid();
    end if;
  else
    new.booking_invoice_date := null;
    new.booking_invoice_number := null;
    new.booking_invoiced_at := null;
    new.booking_invoiced_by := null;
  end if;
  return new;
end;
$function$;
