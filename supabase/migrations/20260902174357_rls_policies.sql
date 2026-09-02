SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.companies_guard_self_escalation()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  if
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'app_role') is distinct from 'admin'
    and (
      new.company_membership_status is distinct from old.company_membership_status
      or new.company_discount_percent is distinct from old.company_discount_percent
    )
  then
    raise exception 'only admins can change company_membership_status or company_discount_percent'
      using errcode = '42501'; -- insufficient_privilege
  end if;
  return new;
end;
$function$;

CREATE VIEW "public"."calendar_entries" AS  SELECT calendar_entry_id,
    calendar_entry_kind,
    calendar_entry_start_at,
    calendar_entry_end_at,
    room_id,
    room_name,
    company_display_name,
    house_event_title
   FROM ( SELECT (b.booking_id)::text AS calendar_entry_id,
            'booking'::text AS calendar_entry_kind,
            b.booking_start_at AS calendar_entry_start_at,
            b.booking_end_at AS calendar_entry_end_at,
            r.room_id,
            r.room_name,
            c.company_display_name,
            NULL::text AS house_event_title
           FROM ((public.bookings b
             JOIN public.rooms r ON ((r.room_id = b.booking_room_id)))
             JOIN public.companies c ON ((c.company_id = b.booking_company_id)))
          WHERE (b.booking_status = ANY (ARRAY['pending_verification'::public.booking_status, 'confirmed'::public.booking_status]))
        UNION ALL
         SELECT (he.house_event_id)::text AS house_event_id,
            'house_event'::text AS text,
            he.house_event_start_at,
            he.house_event_end_at,
            r.room_id,
            r.room_name,
            NULL::text AS text,
            he.house_event_title
           FROM ((public.house_events he
             JOIN public.house_event_rooms her ON ((her.house_event_room_event_id = he.house_event_id)))
             JOIN public.rooms r ON ((r.room_id = her.house_event_room_room_id)))) entries
  WHERE (auth.uid() IS NOT NULL);

CREATE TRIGGER companies_guard_self_escalation
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.companies_guard_self_escalation();

CREATE POLICY "addons_admin_all" ON "public"."addons"
  FOR ALL
  TO "authenticated"
  USING (((auth.jwt() ->> 'app_role'::text) = 'admin'::text))
  WITH CHECK (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "admins_select_admin" ON "public"."admins"
  FOR SELECT
  TO "authenticated"
  USING (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "booking_addons_delete_own_or_admin" ON "public"."booking_addons"
  FOR DELETE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.bookings b
  WHERE ((b.booking_id = booking_addons.booking_addon_booking_id) AND ((b.booking_company_id = ( SELECT c.company_id
           FROM public.companies c
          WHERE (c.company_auth_user_id = auth.uid()))) OR ((auth.jwt() ->> 'app_role'::text) = 'admin'::text))))));

CREATE POLICY "booking_addons_insert_own_or_admin" ON "public"."booking_addons"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.bookings b
  WHERE ((b.booking_id = booking_addons.booking_addon_booking_id) AND ((b.booking_company_id = ( SELECT c.company_id
           FROM public.companies c
          WHERE (c.company_auth_user_id = auth.uid()))) OR ((auth.jwt() ->> 'app_role'::text) = 'admin'::text))))));

CREATE POLICY "booking_addons_select_own_or_admin" ON "public"."booking_addons"
  FOR SELECT
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.bookings b
  WHERE ((b.booking_id = booking_addons.booking_addon_booking_id) AND ((b.booking_company_id = ( SELECT c.company_id
           FROM public.companies c
          WHERE (c.company_auth_user_id = auth.uid()))) OR ((auth.jwt() ->> 'app_role'::text) = 'admin'::text))))));

CREATE POLICY "booking_addons_update_own_or_admin" ON "public"."booking_addons"
  FOR UPDATE
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.bookings b
  WHERE ((b.booking_id = booking_addons.booking_addon_booking_id) AND ((b.booking_company_id = ( SELECT c.company_id
           FROM public.companies c
          WHERE (c.company_auth_user_id = auth.uid()))) OR ((auth.jwt() ->> 'app_role'::text) = 'admin'::text))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.bookings b
  WHERE ((b.booking_id = booking_addons.booking_addon_booking_id) AND ((b.booking_company_id = ( SELECT c.company_id
           FROM public.companies c
          WHERE (c.company_auth_user_id = auth.uid()))) OR ((auth.jwt() ->> 'app_role'::text) = 'admin'::text))))));

CREATE POLICY "bookings_insert_own_or_admin" ON "public"."bookings"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((booking_company_id = ( SELECT c.company_id
   FROM public.companies c
  WHERE (c.company_auth_user_id = auth.uid()))) OR ((auth.jwt() ->> 'app_role'::text) = 'admin'::text)));

CREATE POLICY "bookings_select_own_or_admin" ON "public"."bookings"
  FOR SELECT
  TO "authenticated"
  USING (((booking_company_id = ( SELECT c.company_id
   FROM public.companies c
  WHERE (c.company_auth_user_id = auth.uid()))) OR ((auth.jwt() ->> 'app_role'::text) = 'admin'::text)));

CREATE POLICY "bookings_update_own_or_admin" ON "public"."bookings"
  FOR UPDATE
  TO "authenticated"
  USING (((booking_company_id = ( SELECT c.company_id
   FROM public.companies c
  WHERE (c.company_auth_user_id = auth.uid()))) OR ((auth.jwt() ->> 'app_role'::text) = 'admin'::text)))
  WITH CHECK (((booking_company_id = ( SELECT c.company_id
   FROM public.companies c
  WHERE (c.company_auth_user_id = auth.uid()))) OR ((auth.jwt() ->> 'app_role'::text) = 'admin'::text)));

CREATE POLICY "companies_delete_admin" ON "public"."companies"
  FOR DELETE
  TO "authenticated"
  USING (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "companies_insert_admin" ON "public"."companies"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "companies_select_own_or_admin" ON "public"."companies"
  FOR SELECT
  TO "authenticated"
  USING (((company_auth_user_id = auth.uid()) OR ((auth.jwt() ->> 'app_role'::text) = 'admin'::text)));

CREATE POLICY "companies_update_own_or_admin" ON "public"."companies"
  FOR UPDATE
  TO "authenticated"
  USING (((company_auth_user_id = auth.uid()) OR ((auth.jwt() ->> 'app_role'::text) = 'admin'::text)))
  WITH CHECK (((company_auth_user_id = auth.uid()) OR ((auth.jwt() ->> 'app_role'::text) = 'admin'::text)));

CREATE POLICY "house_event_rooms_admin_all" ON "public"."house_event_rooms"
  FOR ALL
  TO "authenticated"
  USING (((auth.jwt() ->> 'app_role'::text) = 'admin'::text))
  WITH CHECK (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "house_events_admin_all" ON "public"."house_events"
  FOR ALL
  TO "authenticated"
  USING (((auth.jwt() ->> 'app_role'::text) = 'admin'::text))
  WITH CHECK (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "notices_delete_admin" ON "public"."notices"
  FOR DELETE
  TO "authenticated"
  USING (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "notices_insert_admin" ON "public"."notices"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "notices_select_authenticated" ON "public"."notices"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "notices_update_admin" ON "public"."notices"
  FOR UPDATE
  TO "authenticated"
  USING (((auth.jwt() ->> 'app_role'::text) = 'admin'::text))
  WITH CHECK (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "outbound_emails_select_own_or_admin" ON "public"."outbound_emails"
  FOR SELECT
  TO "authenticated"
  USING (((outbound_email_company_id = ( SELECT c.company_id
   FROM public.companies c
  WHERE (c.company_auth_user_id = auth.uid()))) OR ((auth.jwt() ->> 'app_role'::text) = 'admin'::text)));

CREATE POLICY "room_addons_admin_all" ON "public"."room_addons"
  FOR ALL
  TO "authenticated"
  USING (((auth.jwt() ->> 'app_role'::text) = 'admin'::text))
  WITH CHECK (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "room_images_delete_admin" ON "public"."room_images"
  FOR DELETE
  TO "authenticated"
  USING (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "room_images_insert_admin" ON "public"."room_images"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "room_images_select_authenticated" ON "public"."room_images"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "room_images_update_admin" ON "public"."room_images"
  FOR UPDATE
  TO "authenticated"
  USING (((auth.jwt() ->> 'app_role'::text) = 'admin'::text))
  WITH CHECK (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "rooms_delete_admin" ON "public"."rooms"
  FOR DELETE
  TO "authenticated"
  USING (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "rooms_insert_admin" ON "public"."rooms"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "rooms_select_authenticated" ON "public"."rooms"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "rooms_update_admin" ON "public"."rooms"
  FOR UPDATE
  TO "authenticated"
  USING (((auth.jwt() ->> 'app_role'::text) = 'admin'::text))
  WITH CHECK (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "terms_acceptances_insert_own_or_admin" ON "public"."terms_acceptances"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((terms_acceptance_company_id = ( SELECT c.company_id
   FROM public.companies c
  WHERE (c.company_auth_user_id = auth.uid()))) OR ((auth.jwt() ->> 'app_role'::text) = 'admin'::text)));

CREATE POLICY "terms_acceptances_select_own_or_admin" ON "public"."terms_acceptances"
  FOR SELECT
  TO "authenticated"
  USING (((terms_acceptance_company_id = ( SELECT c.company_id
   FROM public.companies c
  WHERE (c.company_auth_user_id = auth.uid()))) OR ((auth.jwt() ->> 'app_role'::text) = 'admin'::text)));

CREATE POLICY "terms_versions_delete_admin" ON "public"."terms_versions"
  FOR DELETE
  TO "authenticated"
  USING (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "terms_versions_insert_admin" ON "public"."terms_versions"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "terms_versions_select_published_or_admin" ON "public"."terms_versions"
  FOR SELECT
  TO "authenticated"
  USING (((terms_version_published_at IS NOT NULL) OR ((auth.jwt() ->> 'app_role'::text) = 'admin'::text)));

CREATE POLICY "terms_versions_update_admin" ON "public"."terms_versions"
  FOR UPDATE
  TO "authenticated"
  USING (((auth.jwt() ->> 'app_role'::text) = 'admin'::text))
  WITH CHECK (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

CREATE POLICY "verification_codes_admin_all" ON "public"."verification_codes"
  FOR ALL
  TO "authenticated"
  USING (((auth.jwt() ->> 'app_role'::text) = 'admin'::text))
  WITH CHECK (((auth.jwt() ->> 'app_role'::text) = 'admin'::text));

GRANT EXECUTE ON FUNCTION "public"."companies_guard_self_escalation"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."calendar_entries" TO "anon", "authenticated", "postgres", "service_role";
