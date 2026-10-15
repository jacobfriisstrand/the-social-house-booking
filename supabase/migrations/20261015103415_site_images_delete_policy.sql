CREATE POLICY "site_images_delete_admin" ON "public"."site_images"
  FOR DELETE
  TO "authenticated"
  USING (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));
