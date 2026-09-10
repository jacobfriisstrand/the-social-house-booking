-- #1: Bilag 1 requires the contact's mobile number. Declared last in
-- supabase/schemas/companies.sql; hand-written because the declarative
-- sync refuses this schema tree on CLI 2.115 (legacy pg-delta export).
ALTER TABLE "public"."companies"
  ADD COLUMN "company_contact_phone" text;
