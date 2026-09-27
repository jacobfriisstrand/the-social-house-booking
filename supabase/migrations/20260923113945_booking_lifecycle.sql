SET local check_function_bodies = off;

CREATE TABLE "public"."booking_history" (
  "booking_history_id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "booking_history_booking_id" uuid                     NOT NULL,
  "booking_history_changed_at" timestamp with time zone NOT NULL DEFAULT now(),
  "booking_history_changed_by" uuid,
  "booking_history_change"     jsonb                    NOT NULL,
  CONSTRAINT "booking_history_pkey" PRIMARY KEY (booking_history_id)
);

ALTER TABLE "public"."booking_history"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."bookings"
  ADD COLUMN "booking_cancellation_fee_waived" boolean NOT NULL DEFAULT false;

CREATE TYPE "public"."booking_cancelled_by" AS ENUM (
  'member',
  'admin'
);

ALTER TABLE "public"."bookings"
  ADD COLUMN "booking_cancelled_by" public.booking_cancelled_by;

CREATE OR REPLACE FUNCTION public.apply_company_change_request (
  p_request_id uuid,
  p_token_hash text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  request_row public.company_change_requests;
  token_row public.company_change_tokens;
  next_step text;
begin
  select * into request_row
    from public.company_change_requests
    where company_change_request_id = p_request_id
    for update;

  if request_row.company_change_request_id is null then
    raise exception 'company change request not found' using errcode = 'P0002';
  end if;

  select * into token_row
    from public.company_change_tokens
    where company_change_token_request_id = p_request_id
      and company_change_token_kind = 'current_email'
      and company_change_token_hash = p_token_hash
      and company_change_token_consumed_at is null
    for update;

  if token_row.company_change_token_id is null then
    raise exception 'company change token is invalid' using errcode = 'P0002';
  end if;

  if token_row.company_change_token_expires_at <= now() then
    update public.company_change_requests
      set company_change_request_status = 'expired',
          company_change_request_updated_at = now()
      where company_change_request_id = p_request_id;
    return jsonb_build_object('error', 'expired');
  end if;

  if request_row.company_change_request_status <> 'pending' then
    raise exception 'company change request is no longer pending' using errcode = 'P0002';
  end if;

  update public.company_change_tokens
    set company_change_token_consumed_at = now()
    where company_change_token_id = token_row.company_change_token_id;

  if request_row.company_change_request_current_email = request_row.company_change_request_proposed_email then
    next_step := 'committed';
    update public.companies
      set company_email = request_row.company_change_request_after_values ->> 'email',
          company_legal_name = nullif(request_row.company_change_request_after_values ->> 'legalName', ''),
          company_cvr_number = nullif(request_row.company_change_request_after_values ->> 'cvrNumber', ''),
          company_billing_address = nullif(request_row.company_change_request_after_values ->> 'billingAddress', ''),
          company_billing_postal_code = nullif(request_row.company_change_request_after_values ->> 'billingPostalCode', ''),
          company_billing_city = nullif(request_row.company_change_request_after_values ->> 'billingCity', ''),
          company_billing_country = nullif(request_row.company_change_request_after_values ->> 'billingCountry', ''),
          company_contact_name = nullif(request_row.company_change_request_after_values ->> 'contactName', ''),
          company_contact_phone = nullif(request_row.company_change_request_after_values ->> 'contactPhone', ''),
          company_invoice_email = nullif(request_row.company_change_request_after_values ->> 'invoiceEmail', ''),
          company_attention = nullif(request_row.company_change_request_after_values ->> 'attention', ''),
          company_department = nullif(request_row.company_change_request_after_values ->> 'department', ''),
          company_reference = nullif(request_row.company_change_request_after_values ->> 'reference', ''),
          company_billing_notes = nullif(request_row.company_change_request_after_values ->> 'billingNotes', ''),
          company_master_data_completed_at = coalesce(company_master_data_completed_at, now()),
          company_updated_at = now()
      where company_id = request_row.company_change_request_company_id;
    update public.company_change_requests
      set company_change_request_status = 'committed',
          company_change_request_updated_at = now()
      where company_change_request_id = p_request_id;
  else
    next_step := 'awaiting_new_email';
    update public.company_change_requests
      set company_change_request_status = 'awaiting_new_email',
          company_change_request_updated_at = now()
      where company_change_request_id = p_request_id;
  end if;

  return jsonb_build_object(
    'company_id', request_row.company_change_request_company_id,
    'current_email', request_row.company_change_request_current_email,
    'proposed_email', request_row.company_change_request_proposed_email,
    'next_step', next_step
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.commit_company_email_change (
  p_request_id uuid,
  p_token_hash text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  request_row public.company_change_requests;
  token_row public.company_change_tokens;
begin
  select * into request_row
    from public.company_change_requests
    where company_change_request_id = p_request_id
    for update;

  if request_row.company_change_request_id is null
     or request_row.company_change_request_status <> 'awaiting_new_email' then
    raise exception 'company email change is not awaiting verification' using errcode = 'P0002';
  end if;

  select * into token_row
    from public.company_change_tokens
    where company_change_token_request_id = p_request_id
      and company_change_token_kind = 'new_email'
      and company_change_token_hash = p_token_hash
      and company_change_token_consumed_at is null
    for update;

  if token_row.company_change_token_id is null then
    raise exception 'company email token is invalid' using errcode = 'P0002';
  end if;
  if token_row.company_change_token_expires_at <= now() then
    update public.company_change_requests
      set company_change_request_status = 'expired',
          company_change_request_updated_at = now()
      where company_change_request_id = p_request_id;
    return jsonb_build_object('error', 'expired');
  end if;

  update public.company_change_tokens
    set company_change_token_consumed_at = now()
    where company_change_token_id = token_row.company_change_token_id;

  update public.companies
    set company_email = request_row.company_change_request_after_values ->> 'email',
        company_legal_name = nullif(request_row.company_change_request_after_values ->> 'legalName', ''),
        company_cvr_number = nullif(request_row.company_change_request_after_values ->> 'cvrNumber', ''),
        company_billing_address = nullif(request_row.company_change_request_after_values ->> 'billingAddress', ''),
        company_billing_postal_code = nullif(request_row.company_change_request_after_values ->> 'billingPostalCode', ''),
        company_billing_city = nullif(request_row.company_change_request_after_values ->> 'billingCity', ''),
        company_billing_country = nullif(request_row.company_change_request_after_values ->> 'billingCountry', ''),
        company_contact_name = nullif(request_row.company_change_request_after_values ->> 'contactName', ''),
        company_contact_phone = nullif(request_row.company_change_request_after_values ->> 'contactPhone', ''),
        company_invoice_email = nullif(request_row.company_change_request_after_values ->> 'invoiceEmail', ''),
        company_attention = nullif(request_row.company_change_request_after_values ->> 'attention', ''),
        company_department = nullif(request_row.company_change_request_after_values ->> 'department', ''),
        company_reference = nullif(request_row.company_change_request_after_values ->> 'reference', ''),
        company_billing_notes = nullif(request_row.company_change_request_after_values ->> 'billingNotes', ''),
        company_master_data_completed_at = coalesce(company_master_data_completed_at, now()),
        company_updated_at = now()
    where company_id = request_row.company_change_request_company_id;

  update public.company_change_requests
    set company_change_request_status = 'committed',
        company_change_request_updated_at = now()
    where company_change_request_id = p_request_id;

  return jsonb_build_object(
    'company_id', request_row.company_change_request_company_id,
    'current_email', request_row.company_change_request_current_email,
    'proposed_email', request_row.company_change_request_proposed_email
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_company_change_request (
  p_company_id     uuid,
  p_current_email  text,
  p_proposed_email text,
  p_before_values  jsonb,
  p_after_values   jsonb
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  request_id uuid;
begin
  update public.company_change_requests
    set company_change_request_status = 'rejected',
        company_change_request_updated_at = now()
    where company_change_request_company_id = p_company_id
      and company_change_request_status in ('pending', 'awaiting_new_email');

  insert into public.company_change_requests (
    company_change_request_after_values,
    company_change_request_before_values,
    company_change_request_company_id,
    company_change_request_current_email,
    company_change_request_proposed_email
  ) values (
    p_after_values,
    p_before_values,
    p_company_id,
    p_current_email,
    p_proposed_email
  ) returning company_change_request_id into request_id;

  return request_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_booking_history()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_old jsonb;
  v_change jsonb;
begin
  v_old := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;

  select jsonb_object_agg(
           tracked,
           jsonb_build_object('from', v_old -> tracked, 'to', to_jsonb(new) -> tracked)
         )
    into v_change
  from unnest(array[
    'booking_room_id',
    'booking_status',
    'booking_start_at',
    'booking_end_at',
    'booking_participant_count',
    'booking_booker_name',
    'booking_booker_email',
    'booking_booker_phone',
    'booking_reference',
    'booking_practical_notes',
    'booking_internal_note',
    'booking_room_price_ore',
    'booking_discount_percent',
    'booking_addon_total_ore',
    'booking_expected_total_ore',
    'booking_cancellation_terms',
    'booking_hold_expires_at',
    'booking_invoicing_status',
    'booking_invoice_date',
    'booking_invoice_number',
    'booking_invoiced_at',
    'booking_invoiced_by',
    'booking_catering_accepted_at',
    'booking_cancelled_at',
    'booking_cancellation_fee_ore',
    'booking_cancelled_by',
    'booking_cancellation_fee_waived'
  ]) as tracked
  where v_old -> tracked is distinct from to_jsonb(new) -> tracked;

  if v_change is null then
    return null;
  end if;

  insert into public.booking_history (
    booking_history_booking_id,
    booking_history_changed_by,
    booking_history_change
  ) values (
    new.booking_id,
    auth.uid(),
    v_change
  );
  return null;
end;
$function$;

ALTER TABLE "public"."booking_history"
  ADD CONSTRAINT "booking_history_booking_history_booking_id_fkey" FOREIGN KEY (booking_history_booking_id) REFERENCES public.bookings(booking_id) ON DELETE CASCADE;

ALTER TABLE "public"."booking_history"
  ADD CONSTRAINT "booking_history_booking_history_changed_by_fkey" FOREIGN KEY (booking_history_changed_by) REFERENCES auth.users(id);

CREATE INDEX booking_history_booking_idx ON public.booking_history USING btree (booking_history_booking_id, booking_history_changed_at);

CREATE TRIGGER bookings_record_history
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.record_booking_history();

CREATE POLICY "booking_history_select_admin" ON "public"."booking_history"
  FOR SELECT
  TO "authenticated"
  USING (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

GRANT EXECUTE ON FUNCTION "public"."record_booking_history"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."booking_history" TO "anon", "authenticated", "postgres", "service_role";

GRANT USAGE ON TYPE "public"."booking_cancelled_by" TO "postgres";
