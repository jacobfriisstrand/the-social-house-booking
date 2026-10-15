CREATE TABLE "public"."site_images" (
  "site_image_slot"       text                     NOT NULL,
  "site_image_path"       text                     NOT NULL,
  "site_image_created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "site_image_updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "site_images_pkey" PRIMARY KEY (site_image_slot)
);

ALTER TABLE "public"."site_images"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_images_insert_admin" ON "public"."site_images"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "site_images_select_public" ON "public"."site_images"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "site_images_update_admin" ON "public"."site_images"
  FOR UPDATE
  TO "authenticated"
  USING (((auth.jwt() ->> 'app_role'::text) = 'admin'::text))
  WITH CHECK (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."site_images" TO "anon", "authenticated", "postgres", "service_role";
