SET local check_function_bodies = off;

DROP POLICY "notices_select_authenticated" ON "public"."notices";

DROP VIEW "public"."calendar_entries";

ALTER TABLE "public"."notices"
  DROP COLUMN "notice_starts_at";

-- A temporary default lets the column land on a table that already holds
-- notices; the schema has none, so it is dropped again at once.
ALTER TABLE "public"."notices"
  ADD COLUMN "notice_title" text NOT NULL DEFAULT '';

ALTER TABLE "public"."notices"
  ALTER COLUMN "notice_title" DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.save_house_event (
  p_house_event_id uuid,
  p_title          text,
  p_description    text,
  p_start_at       timestamp with time zone,
  p_end_at         timestamp with time zone,
  p_room_ids       uuid[]
)
  RETURNS uuid
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  v_house_event_id uuid;
begin
  if coalesce(cardinality(p_room_ids), 0) = 0 then
    raise exception 'a house event blocks at least one room'
      using errcode = '22023';
  end if;

  if p_house_event_id is null then
    insert into public.house_events (
      house_event_title,
      house_event_description,
      house_event_start_at,
      house_event_end_at
    ) values (p_title, p_description, p_start_at, p_end_at)
    returning house_event_id into v_house_event_id;
  else
    delete from public.house_event_rooms her
    where her.house_event_room_event_id = p_house_event_id
      and her.house_event_room_room_id <> all (p_room_ids);

    update public.house_events he
    set house_event_title = p_title,
        house_event_description = p_description,
        house_event_start_at = p_start_at,
        house_event_end_at = p_end_at,
        house_event_updated_at = now()
    where he.house_event_id = p_house_event_id
    returning he.house_event_id into v_house_event_id;

    if v_house_event_id is null then
      raise exception 'house event not found'
        using errcode = 'P0002';
    end if;
  end if;

  insert into public.house_event_rooms (house_event_room_event_id, house_event_room_room_id)
  select v_house_event_id, room_id
  from unnest(p_room_ids) as room_id
  on conflict do nothing;

  return v_house_event_id;
end;
$function$;

CREATE VIEW "public"."calendar_entries" AS  SELECT calendar_entry_id,
    calendar_entry_kind,
    calendar_entry_start_at,
    calendar_entry_end_at,
    room_id,
    room_name,
    company_display_name,
    house_event_title,
    house_event_description
   FROM ( SELECT (b.booking_id)::text AS calendar_entry_id,
            'booking'::text AS calendar_entry_kind,
            b.booking_start_at AS calendar_entry_start_at,
            b.booking_end_at AS calendar_entry_end_at,
            r.room_id,
            r.room_name,
            c.company_display_name,
            NULL::text AS house_event_title,
            NULL::text AS house_event_description
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
            he.house_event_title,
            he.house_event_description
           FROM ((public.house_events he
             JOIN public.house_event_rooms her ON ((her.house_event_room_event_id = he.house_event_id)))
             JOIN public.rooms r ON ((r.room_id = her.house_event_room_room_id)))) entries
  WHERE (auth.uid() IS NOT NULL);

CREATE POLICY "notices_select_visible_or_admin" ON "public"."notices"
  FOR SELECT
  TO "authenticated"
  USING ((((auth.jwt() ->> 'app_role'::text) = 'admin'::text) OR (notice_is_active AND ((notice_ends_at IS NULL) OR (notice_ends_at > now())))));

REVOKE ALL ON FUNCTION "public"."save_house_event"(uuid, text, text, timestamp WITH time zone, timestamp WITH time zone, uuid[]) FROM PUBLIC;

-- Supabase's default privileges grant anon EXECUTE by name, which the
-- PUBLIC revoke does not reach.
REVOKE EXECUTE ON FUNCTION "public"."save_house_event"(uuid, text, text, timestamp WITH time zone, timestamp WITH time zone, uuid[]) FROM "anon";

GRANT EXECUTE ON FUNCTION "public"."save_house_event"(uuid, text, text, timestamp WITH time zone, timestamp WITH time zone, uuid[]) TO "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."calendar_entries" TO "anon", "authenticated", "postgres", "service_role";
