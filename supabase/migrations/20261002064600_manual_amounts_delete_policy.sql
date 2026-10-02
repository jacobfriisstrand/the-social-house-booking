CREATE POLICY "manual_amounts_delete_admin" ON "public"."manual_amounts"
  FOR DELETE
  TO "authenticated"
  USING (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));
