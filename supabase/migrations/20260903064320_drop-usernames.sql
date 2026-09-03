ALTER TABLE "public"."admins"
  DROP CONSTRAINT "admins_admin_username_key";

ALTER TABLE "public"."companies"
  DROP CONSTRAINT "companies_company_username_key";

ALTER TABLE "public"."admins"
  DROP COLUMN "admin_username";

ALTER TABLE "public"."companies"
  DROP COLUMN "company_username";
