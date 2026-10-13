SET local check_function_bodies = off;

CREATE TABLE "public"."invoicing_events" (
  "invoicing_event_id"             uuid                            NOT NULL DEFAULT gen_random_uuid(),
  "invoicing_event_booking_id"     uuid                            NOT NULL,
  "invoicing_event_from_status"    public.booking_invoicing_status NOT NULL,
  "invoicing_event_to_status"      public.booking_invoicing_status NOT NULL,
  "invoicing_event_invoice_date"   date,
  "invoicing_event_invoice_number" text,
  "invoicing_event_changed_by"     uuid,
  "invoicing_event_changed_at"     timestamp with time zone        NOT NULL DEFAULT now(),
  CONSTRAINT "invoicing_events_pkey" PRIMARY KEY (invoicing_event_id)
);

ALTER TABLE "public"."invoicing_events"
  ENABLE ROW LEVEL SECURITY;

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
    if new.booking_invoicing_status in ('invoiced', 'not_invoicable')
      and new.booking_end_at > now()
    then
      raise exception
        'a booking can first be marked invoiced or not invoicable after its end time'
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

CREATE OR REPLACE FUNCTION public.record_invoicing_event()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  insert into public.invoicing_events (
    invoicing_event_booking_id,
    invoicing_event_from_status,
    invoicing_event_to_status,
    invoicing_event_invoice_date,
    invoicing_event_invoice_number,
    invoicing_event_changed_by
  ) values (
    new.booking_id,
    old.booking_invoicing_status,
    new.booking_invoicing_status,
    new.booking_invoice_date,
    new.booking_invoice_number,
    auth.uid()
  );
  return null;
end;
$function$;

ALTER TABLE "public"."invoicing_events"
  ADD CONSTRAINT "invoicing_events_invoicing_event_booking_id_fkey" FOREIGN KEY (invoicing_event_booking_id) REFERENCES public.bookings(booking_id) ON DELETE CASCADE;

ALTER TABLE "public"."invoicing_events"
  ADD CONSTRAINT "invoicing_events_invoicing_event_changed_by_fkey" FOREIGN KEY (invoicing_event_changed_by) REFERENCES auth.users(id);

CREATE INDEX invoicing_events_booking_idx ON public.invoicing_events USING btree (invoicing_event_booking_id, invoicing_event_changed_at);

CREATE TRIGGER bookings_invoicing_event
  AFTER UPDATE OF booking_invoicing_status ON public.bookings
  FOR EACH ROW
  WHEN ((old.booking_invoicing_status IS DISTINCT FROM new.booking_invoicing_status))
  EXECUTE FUNCTION public.record_invoicing_event();

CREATE TRIGGER bookings_invoicing_status_guard
  BEFORE UPDATE OF booking_invoicing_status ON public.bookings
  FOR EACH ROW
  WHEN ((old.booking_invoicing_status IS DISTINCT FROM new.booking_invoicing_status))
  EXECUTE FUNCTION public.enforce_invoicing_status_change();

CREATE POLICY "invoicing_events_admin_all" ON "public"."invoicing_events"
  FOR ALL
  TO "authenticated"
  USING (((auth.jwt() ->> 'app_role'::text) = 'admin'::text))
  WITH CHECK (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

GRANT EXECUTE ON FUNCTION "public"."enforce_invoicing_status_change"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."record_invoicing_event"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."invoicing_events" TO "anon", "authenticated", "postgres", "service_role";
