SET local check_function_bodies = off;

CREATE TABLE "public"."manual_amounts" (
  "manual_amount_id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "manual_amount_booking_id" uuid                     NOT NULL,
  "manual_amount_amount_ore" integer                  NOT NULL,
  "manual_amount_note"       text                     NOT NULL,
  "manual_amount_created_by" uuid,
  "manual_amount_created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "manual_amounts_manual_amount_amount_ore_check" CHECK ((manual_amount_amount_ore > 0)),
  CONSTRAINT "manual_amounts_manual_amount_note_check" CHECK ((btrim(manual_amount_note) <> ''::text)),
  CONSTRAINT "manual_amounts_pkey" PRIMARY KEY (manual_amount_id)
);

ALTER TABLE "public"."manual_amounts"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.enforce_manual_amount_after_meeting()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
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

ALTER TABLE "public"."manual_amounts"
  ADD CONSTRAINT "manual_amounts_manual_amount_booking_id_fkey" FOREIGN KEY (manual_amount_booking_id) REFERENCES public.bookings(booking_id) ON DELETE CASCADE;

ALTER TABLE "public"."manual_amounts"
  ADD CONSTRAINT "manual_amounts_manual_amount_created_by_fkey" FOREIGN KEY (manual_amount_created_by) REFERENCES auth.users(id);

CREATE INDEX manual_amounts_booking_idx ON public.manual_amounts USING btree (manual_amount_booking_id, manual_amount_created_at);

CREATE TRIGGER manual_amounts_after_meeting
  BEFORE INSERT ON public.manual_amounts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_manual_amount_after_meeting();

CREATE POLICY "manual_amounts_insert_admin" ON "public"."manual_amounts"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "manual_amounts_select_own_or_admin" ON "public"."manual_amounts"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.bookings b
  WHERE ((b.booking_id = manual_amounts.manual_amount_booking_id) AND ((b.booking_company_id = ( SELECT c.company_id
           FROM public.companies c
          WHERE (c.company_auth_user_id = auth.uid()))) OR ((auth.jwt() ->> 'app_role'::text) = 'admin'::text))))));

GRANT EXECUTE ON FUNCTION "public"."enforce_manual_amount_after_meeting"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."manual_amounts" TO "anon", "authenticated", "postgres", "service_role";
