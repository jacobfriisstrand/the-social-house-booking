-- #14: external companies pay full room price, so a discount is only valid
-- on a member. Declared in supabase/schemas/companies.sql; hand-written
-- because the declarative sync refuses this schema tree on CLI 2.115.
ALTER TABLE "public"."companies"
  ADD CONSTRAINT "companies_external_no_discount"
  CHECK (company_membership_status = 'member' OR company_discount_percent = 0);
