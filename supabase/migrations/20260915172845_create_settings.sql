CREATE TABLE "public"."settings" (
  "setting_id"            smallint                 NOT NULL DEFAULT 1,
  "setting_wifi_network"  text                     NOT NULL,
  "setting_wifi_password" text                     NOT NULL,
  "setting_created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "setting_updated_at"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "settings_pkey" PRIMARY KEY (setting_id),
  CONSTRAINT "settings_setting_id_check" CHECK ((setting_id = 1))
);

ALTER TABLE "public"."settings"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_insert_admin" ON "public"."settings"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "settings_select_authenticated" ON "public"."settings"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "settings_update_admin" ON "public"."settings"
  FOR UPDATE
  TO "authenticated"
  USING (((auth.jwt() ->> 'app_role'::text) = 'admin'::text))
  WITH CHECK (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."settings" TO "anon", "authenticated", "postgres", "service_role";
