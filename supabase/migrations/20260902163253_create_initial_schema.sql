SET local check_function_bodies = off;

CREATE TABLE "public"."addons" (
  "addon_id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "addon_name"        text                     NOT NULL,
  "addon_description" text,
  "addon_price_ore"   integer                  NOT NULL,
  "addon_is_active"   boolean                  NOT NULL DEFAULT true,
  "addon_created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "addon_updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "addons_addon_price_ore_check" CHECK ((addon_price_ore >= 0)),
  CONSTRAINT "addons_pkey" PRIMARY KEY (addon_id)
);

ALTER TABLE "public"."addons"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."admins" (
  "admin_id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "admin_auth_user_id" uuid                     NOT NULL,
  "admin_username"     text                     NOT NULL,
  "admin_display_name" text                     NOT NULL,
  "admin_created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "admin_updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "admins_admin_auth_user_id_key" UNIQUE (admin_auth_user_id),
  CONSTRAINT "admins_admin_username_key" UNIQUE (admin_username),
  CONSTRAINT "admins_pkey" PRIMARY KEY (admin_id)
);

ALTER TABLE "public"."admins"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."booking_addons" (
  "booking_addon_booking_id" uuid    NOT NULL,
  "booking_addon_addon_id"   uuid    NOT NULL,
  "booking_addon_price_ore"  integer NOT NULL,
  CONSTRAINT "booking_addons_booking_addon_price_ore_check" CHECK ((booking_addon_price_ore >= 0)),
  CONSTRAINT "booking_addons_pkey" PRIMARY KEY (booking_addon_booking_id, booking_addon_addon_id)
);

ALTER TABLE "public"."booking_addons"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."bookings" (
  "booking_id"                   uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "booking_number"               text                     NOT NULL,
  "booking_company_id"           uuid                     NOT NULL,
  "booking_room_id"              uuid                     NOT NULL,
  "booking_start_at"             timestamp with time zone NOT NULL,
  "booking_end_at"               timestamp with time zone NOT NULL,
  "booking_participant_count"    integer                  NOT NULL,
  "booking_booker_name"          text                     NOT NULL,
  "booking_booker_email"         text                     NOT NULL,
  "booking_booker_phone"         text                     NOT NULL,
  "booking_reference"            text,
  "booking_practical_notes"      text,
  "booking_internal_note"        text,
  "booking_room_price_ore"       integer                  NOT NULL,
  "booking_discount_percent"     integer                  NOT NULL DEFAULT 0,
  "booking_addon_total_ore"      integer                  NOT NULL DEFAULT 0,
  "booking_expected_total_ore"   integer                  NOT NULL DEFAULT 0,
  "booking_cancellation_terms"   text,
  "booking_cancelled_at"         timestamp with time zone,
  "booking_cancellation_fee_ore" integer,
  "booking_hold_expires_at"      timestamp with time zone,
  "booking_invoice_date"         date,
  "booking_invoice_number"       text,
  "booking_invoiced_at"          timestamp with time zone,
  "booking_invoiced_by"          uuid,
  "booking_created_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "booking_updated_at"           timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "bookings_booking_addon_total_ore_check" CHECK ((booking_addon_total_ore >= 0)),
  CONSTRAINT "bookings_booking_discount_percent_check" CHECK (((booking_discount_percent >= 0) AND (booking_discount_percent <= 100))),
  CONSTRAINT "bookings_booking_expected_total_ore_check" CHECK ((booking_expected_total_ore >= 0)),
  CONSTRAINT "bookings_booking_number_key" UNIQUE (booking_number),
  CONSTRAINT "bookings_booking_participant_count_check" CHECK ((booking_participant_count > 0)),
  CONSTRAINT "bookings_booking_room_price_ore_check" CHECK ((booking_room_price_ore >= 0)),
  CONSTRAINT "bookings_check" CHECK ((booking_end_at > booking_start_at)),
  CONSTRAINT "bookings_pkey" PRIMARY KEY (booking_id)
);

ALTER TABLE "public"."bookings"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."companies" (
  "company_id"                       uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "company_auth_user_id"             uuid                     NOT NULL,
  "company_username"                 text                     NOT NULL,
  "company_email"                    text                     NOT NULL,
  "company_display_name"             text                     NOT NULL,
  "company_legal_name"               text,
  "company_discount_percent"         integer                  NOT NULL DEFAULT 0,
  "company_cvr_number"               text,
  "company_contact_name"             text,
  "company_billing_address"          text,
  "company_billing_postal_code"      text,
  "company_billing_city"             text,
  "company_billing_country"          text,
  "company_invoice_email"            text,
  "company_attention"                text,
  "company_department"               text,
  "company_reference"                text,
  "company_billing_notes"            text,
  "company_billing_interval"         text                     NOT NULL DEFAULT 'monthly'::text,
  "company_economic_customer_number" text,
  "company_internal_note"            text,
  "company_master_data_completed_at" timestamp with time zone,
  "company_created_at"               timestamp with time zone NOT NULL DEFAULT now(),
  "company_updated_at"               timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "companies_company_auth_user_id_key" UNIQUE (company_auth_user_id),
  CONSTRAINT "companies_company_discount_percent_check" CHECK (((company_discount_percent >= 0) AND (company_discount_percent <= 100))),
  CONSTRAINT "companies_company_email_key" UNIQUE (company_email),
  CONSTRAINT "companies_company_username_key" UNIQUE (company_username),
  CONSTRAINT "companies_pkey" PRIMARY KEY (company_id)
);

ALTER TABLE "public"."companies"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."house_event_rooms" (
  "house_event_room_event_id" uuid NOT NULL,
  "house_event_room_room_id"  uuid NOT NULL,
  CONSTRAINT "house_event_rooms_pkey" PRIMARY KEY (house_event_room_event_id, house_event_room_room_id)
);

ALTER TABLE "public"."house_event_rooms"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."house_events" (
  "house_event_id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "house_event_title"       text,
  "house_event_description" text                     NOT NULL,
  "house_event_start_at"    timestamp with time zone NOT NULL,
  "house_event_end_at"      timestamp with time zone NOT NULL,
  "house_event_created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "house_event_updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "house_events_check" CHECK ((house_event_end_at > house_event_start_at)),
  CONSTRAINT "house_events_pkey" PRIMARY KEY (house_event_id)
);

ALTER TABLE "public"."house_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."outbound_emails" (
  "outbound_email_id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "outbound_email_to"         text                     NOT NULL,
  "outbound_email_resend_id"  text,
  "outbound_email_error"      text,
  "outbound_email_booking_id" uuid,
  "outbound_email_company_id" uuid,
  "outbound_email_sent_at"    timestamp with time zone,
  "outbound_email_created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "outbound_email_updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "outbound_emails_pkey" PRIMARY KEY (outbound_email_id)
);

ALTER TABLE "public"."outbound_emails"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."room_addons" (
  "room_addon_room_id"  uuid NOT NULL,
  "room_addon_addon_id" uuid NOT NULL,
  CONSTRAINT "room_addons_pkey" PRIMARY KEY (room_addon_room_id, room_addon_addon_id)
);

ALTER TABLE "public"."room_addons"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."room_images" (
  "room_image_id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "room_image_room_id"    uuid                     NOT NULL,
  "room_image_url"        text                     NOT NULL,
  "room_image_sort_order" integer                  NOT NULL DEFAULT 0,
  "room_image_created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "room_images_pkey" PRIMARY KEY (room_image_id)
);

ALTER TABLE "public"."room_images"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."rooms" (
  "room_id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "room_name"           text                     NOT NULL,
  "room_description"    text,
  "room_location"       text,
  "room_capacity"       integer                  NOT NULL,
  "room_price_ore"      integer                  NOT NULL,
  "room_opens_at"       time without time zone   NOT NULL,
  "room_closes_at"      time without time zone   NOT NULL,
  "room_practical_info" text,
  "room_is_active"      boolean                  NOT NULL DEFAULT true,
  "room_created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "room_updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "rooms_check" CHECK ((room_closes_at > room_opens_at)),
  CONSTRAINT "rooms_pkey" PRIMARY KEY (room_id),
  CONSTRAINT "rooms_room_capacity_check" CHECK ((room_capacity > 0)),
  CONSTRAINT "rooms_room_price_ore_check" CHECK ((room_price_ore >= 0))
);

ALTER TABLE "public"."rooms"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."verification_codes" (
  "verification_code_id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "verification_code_booking_id"  uuid                     NOT NULL,
  "verification_code_hash"        text                     NOT NULL,
  "verification_code_expires_at"  timestamp with time zone NOT NULL,
  "verification_code_attempts"    integer                  NOT NULL DEFAULT 0,
  "verification_code_consumed_at" timestamp with time zone,
  "verification_code_created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "verification_code_updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "verification_codes_pkey" PRIMARY KEY (verification_code_id),
  CONSTRAINT "verification_codes_verification_code_attempts_check" CHECK ((verification_code_attempts >= 0))
);

ALTER TABLE "public"."verification_codes"
  ENABLE ROW LEVEL SECURITY;

CREATE TYPE "public"."addon_pricing_model" AS ENUM (
  'fixed',
  'per_participant'
);

ALTER TABLE "public"."addons"
  ADD COLUMN "addon_pricing_model" public.addon_pricing_model NOT NULL;

CREATE TYPE "public"."booking_invoicing_status" AS ENUM (
  'not_invoiced',
  'invoiced',
  'not_invoicable'
);

ALTER TABLE "public"."bookings"
  ADD COLUMN "booking_invoicing_status" public.booking_invoicing_status NOT NULL DEFAULT 'not_invoiced'::public.booking_invoicing_status;

CREATE TYPE "public"."booking_status" AS ENUM (
  'pending_verification',
  'confirmed',
  'cancelled',
  'expired'
);

ALTER TABLE "public"."bookings"
  ADD COLUMN "booking_status" public.booking_status NOT NULL DEFAULT 'pending_verification'::public.booking_status;

CREATE TYPE "public"."company_membership_status" AS ENUM (
  'member',
  'external'
);

ALTER TABLE "public"."companies"
  ADD COLUMN "company_membership_status" public.company_membership_status NOT NULL DEFAULT 'external'::public.company_membership_status;

CREATE TYPE "public"."outbound_email_kind" AS ENUM (
  'company-invitation',
  'verification-code',
  'password-reset',
  'booking-confirmation',
  'reminder',
  'booking-changed',
  'booking-cancelled',
  'admin-new-booking',
  'admin-booking-cancelled',
  'admin-company-completed'
);

ALTER TABLE "public"."outbound_emails"
  ADD COLUMN "outbound_email_kind" public.outbound_email_kind NOT NULL;

CREATE TYPE "public"."outbound_email_status" AS ENUM (
  'queued',
  'sent',
  'delivered',
  'bounced',
  'complained',
  'delivery_delayed',
  'failed'
);

ALTER TABLE "public"."outbound_emails"
  ADD COLUMN "outbound_email_status" public.outbound_email_status NOT NULL DEFAULT 'queued'::public.outbound_email_status;

CREATE OR REPLACE FUNCTION public.custom_access_token_hook (
  event jsonb
)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  AS $function$
declare
  app_role text;
begin
  select (u.raw_app_meta_data ->> 'app_role')
    into app_role
    from auth.users u
    where u.id = (event->>'user_id')::uuid;

  if app_role is not null then
    event := jsonb_set(
      event,
      '{claims,app_role}',
      to_jsonb(app_role)
    );
  end if;

  return event;
end;
$function$;

ALTER TABLE "public"."admins"
  ADD CONSTRAINT "admins_admin_auth_user_id_fkey" FOREIGN KEY (admin_auth_user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."booking_addons"
  ADD CONSTRAINT "booking_addons_booking_addon_addon_id_fkey" FOREIGN KEY (booking_addon_addon_id) REFERENCES public.addons(addon_id);

ALTER TABLE "public"."bookings"
  ADD CONSTRAINT "bookings_booking_invoiced_by_fkey" FOREIGN KEY (booking_invoiced_by) REFERENCES auth.users(id);

ALTER TABLE "public"."booking_addons"
  ADD CONSTRAINT "booking_addons_booking_addon_booking_id_fkey" FOREIGN KEY (booking_addon_booking_id) REFERENCES public.bookings(booking_id) ON DELETE CASCADE;

ALTER TABLE "public"."companies"
  ADD CONSTRAINT "companies_company_auth_user_id_fkey" FOREIGN KEY (company_auth_user_id) REFERENCES auth.users(id);

ALTER TABLE "public"."bookings"
  ADD CONSTRAINT "bookings_booking_company_id_fkey" FOREIGN KEY (booking_company_id) REFERENCES public.companies(company_id);

ALTER TABLE "public"."house_event_rooms"
  ADD CONSTRAINT "house_event_rooms_house_event_room_event_id_fkey" FOREIGN KEY (house_event_room_event_id) REFERENCES public.house_events(house_event_id) ON DELETE CASCADE;

ALTER TABLE "public"."outbound_emails"
  ADD CONSTRAINT "outbound_emails_outbound_email_booking_id_fkey" FOREIGN KEY (outbound_email_booking_id) REFERENCES public.bookings(booking_id);

ALTER TABLE "public"."outbound_emails"
  ADD CONSTRAINT "outbound_emails_outbound_email_company_id_fkey" FOREIGN KEY (outbound_email_company_id) REFERENCES public.companies(company_id);

ALTER TABLE "public"."room_addons"
  ADD CONSTRAINT "room_addons_room_addon_addon_id_fkey" FOREIGN KEY (room_addon_addon_id) REFERENCES public.addons(addon_id) ON DELETE CASCADE;

ALTER TABLE "public"."bookings"
  ADD CONSTRAINT "bookings_booking_room_id_fkey" FOREIGN KEY (booking_room_id) REFERENCES public.rooms(room_id);

ALTER TABLE "public"."house_event_rooms"
  ADD CONSTRAINT "house_event_rooms_house_event_room_room_id_fkey" FOREIGN KEY (house_event_room_room_id) REFERENCES public.rooms(room_id) ON DELETE CASCADE;

ALTER TABLE "public"."room_addons"
  ADD CONSTRAINT "room_addons_room_addon_room_id_fkey" FOREIGN KEY (room_addon_room_id) REFERENCES public.rooms(room_id) ON DELETE CASCADE;

ALTER TABLE "public"."room_images"
  ADD CONSTRAINT "room_images_room_image_room_id_fkey" FOREIGN KEY (room_image_room_id) REFERENCES public.rooms(room_id) ON DELETE CASCADE;

ALTER TABLE "public"."verification_codes"
  ADD CONSTRAINT "verification_codes_verification_code_booking_id_fkey" FOREIGN KEY (verification_code_booking_id) REFERENCES public.bookings(booking_id) ON DELETE CASCADE;

CREATE INDEX bookings_company_idx ON public.bookings USING btree (booking_company_id);

CREATE INDEX bookings_room_start_idx ON public.bookings USING btree (booking_room_id, booking_start_at);

CREATE INDEX house_event_rooms_room_idx ON public.house_event_rooms USING btree (house_event_room_room_id, house_event_room_event_id);

CREATE INDEX outbound_email_booking_idx ON public.outbound_emails USING btree (outbound_email_booking_id);

CREATE UNIQUE INDEX outbound_email_once_idx ON public.outbound_emails USING btree (outbound_email_booking_id, outbound_email_kind)
  WHERE (outbound_email_kind = ANY (ARRAY['reminder'::public.outbound_email_kind, 'booking-confirmation'::public.outbound_email_kind]));

CREATE INDEX outbound_email_resend_idx ON public.outbound_emails USING btree (outbound_email_resend_id);

CREATE INDEX room_images_room_idx ON public.room_images USING btree (room_image_room_id, room_image_sort_order);

CREATE INDEX verification_codes_booking_idx ON public.verification_codes USING btree (verification_code_booking_id);

REVOKE ALL ON FUNCTION "public"."custom_access_token_hook"(jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."custom_access_token_hook"(jsonb) TO "postgres", "service_role", "supabase_auth_admin";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."addons" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."admins" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."booking_addons" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."bookings" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."companies" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."house_event_rooms" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."house_events" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."outbound_emails" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."room_addons" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."room_images" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."rooms" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."verification_codes" TO "anon", "authenticated", "postgres", "service_role";

GRANT USAGE ON TYPE "public"."addon_pricing_model" TO "postgres";

GRANT USAGE ON TYPE "public"."booking_invoicing_status" TO "postgres";

GRANT USAGE ON TYPE "public"."booking_status" TO "postgres";

GRANT USAGE ON TYPE "public"."company_membership_status" TO "postgres";

GRANT USAGE ON TYPE "public"."outbound_email_kind" TO "postgres";

GRANT USAGE ON TYPE "public"."outbound_email_status" TO "postgres";
