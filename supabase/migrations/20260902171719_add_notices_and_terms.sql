SET local check_function_bodies = off;

REVOKE ALL ON FUNCTION "public"."custom_access_token_hook"(jsonb) FROM "anon";

REVOKE ALL ON FUNCTION "public"."custom_access_token_hook"(jsonb) FROM "authenticated";

ALTER TABLE "public"."rooms"
  DROP CONSTRAINT "rooms_check";

CREATE TABLE "public"."notices" (
  "notice_id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "notice_body"       text                     NOT NULL,
  "notice_is_active"  boolean                  NOT NULL DEFAULT true,
  "notice_starts_at"  timestamp with time zone,
  "notice_ends_at"    timestamp with time zone,
  "notice_created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "notice_updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "notices_pkey" PRIMARY KEY (notice_id)
);

ALTER TABLE "public"."notices"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."terms_acceptances" (
  "terms_acceptance_id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "terms_acceptance_company_id"       uuid                     NOT NULL,
  "terms_acceptance_booking_id"       uuid,
  "terms_acceptance_terms_version_id" uuid                     NOT NULL,
  "terms_acceptance_accepted_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "terms_acceptances_pkey" PRIMARY KEY (terms_acceptance_id)
);

ALTER TABLE "public"."terms_acceptances"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."terms_versions" (
  "terms_version_id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "terms_version_name"         text                     NOT NULL,
  "terms_version_version"      text                     NOT NULL,
  "terms_version_content"      text                     NOT NULL,
  "terms_version_published_at" timestamp with time zone,
  "terms_version_created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "terms_versions_pkey" PRIMARY KEY (terms_version_id),
  CONSTRAINT "terms_versions_terms_version_name_terms_version_version_key" UNIQUE (terms_version_name, terms_version_version)
);

ALTER TABLE "public"."terms_versions"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."rooms"
  ADD CONSTRAINT "rooms_closes_after_opens_check" CHECK ((room_closes_at > room_opens_at));

ALTER TABLE "public"."terms_acceptances"
  ADD CONSTRAINT "terms_acceptances_terms_acceptance_booking_id_fkey" FOREIGN KEY (terms_acceptance_booking_id) REFERENCES public.bookings(booking_id);

ALTER TABLE "public"."terms_acceptances"
  ADD CONSTRAINT "terms_acceptances_terms_acceptance_company_id_fkey" FOREIGN KEY (terms_acceptance_company_id) REFERENCES public.companies(company_id);

ALTER TABLE "public"."terms_acceptances"
  ADD CONSTRAINT "terms_acceptances_terms_acceptance_terms_version_id_fkey" FOREIGN KEY (terms_acceptance_terms_version_id) REFERENCES public.terms_versions(terms_version_id);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notices" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."terms_acceptances" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."terms_versions" TO "anon", "authenticated", "postgres", "service_role";
