SET local check_function_bodies = off;

CREATE EXTENSION "btree_gist" SCHEMA "extensions";

CREATE SEQUENCE "public"."booking_number_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE OR REPLACE FUNCTION public.assert_booking_room_free (
  p_room_id  uuid,
  p_start_at timestamp with time zone,
  p_end_at   timestamp with time zone
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if exists (
    select 1
    from public.house_events he
    join public.house_event_rooms her on her.house_event_room_event_id = he.house_event_id
    where her.house_event_room_room_id = p_room_id
      and tstzrange(he.house_event_start_at, public.booking_blocked_until(he.house_event_end_at), '[)')
          && tstzrange(p_start_at, public.booking_blocked_until(p_end_at), '[)')
  ) then
    raise exception 'room is blocked by a house event in that period (incl. buffer)'
      using errcode = '23P01';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.assert_event_room_free (
  p_room_id          uuid,
  p_start_at         timestamp with time zone,
  p_end_at           timestamp with time zone,
  p_exclude_event_id uuid                     DEFAULT NULL::uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if exists (
    select 1
    from public.bookings b
    where b.booking_room_id = p_room_id
      and b.booking_status in ('pending_verification', 'confirmed')
      and tstzrange(b.booking_start_at, public.booking_blocked_until(b.booking_end_at), '[)')
          && tstzrange(p_start_at, public.booking_blocked_until(p_end_at), '[)')
  ) then
    raise exception 'room is already blocked by a booking in that period (incl. buffer)'
      using errcode = '23P01';
  end if;

  if exists (
    select 1
    from public.house_events he
    join public.house_event_rooms her on her.house_event_room_event_id = he.house_event_id
    where her.house_event_room_room_id = p_room_id
      and he.house_event_id is distinct from p_exclude_event_id
      and tstzrange(he.house_event_start_at, public.booking_blocked_until(he.house_event_end_at), '[)')
          && tstzrange(p_start_at, public.booking_blocked_until(p_end_at), '[)')
  ) then
    raise exception 'room is blocked by another house event in that period (incl. buffer)'
      using errcode = '23P01';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.booking_blocked_until (
  p_end_at timestamp with time zone
)
  RETURNS timestamp WITH time zone
  LANGUAGE sql
  IMMUTABLE
  AS $function$
  select to_timestamp(extract(epoch from p_end_at) + 1800);
$function$;

CREATE OR REPLACE FUNCTION public.enforce_addon_snapshot_immutable()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
declare
  v_booking_id uuid;
begin
  -- On DELETE `new` is unassigned and on INSERT `old` is; reference only the
  -- one this operation actually carries.
  if tg_op = 'DELETE' then
    v_booking_id := old.booking_addon_booking_id;
  else
    v_booking_id := new.booking_addon_booking_id;
  end if;

  if exists (
    select 1
    from public.bookings b
    where b.booking_id = v_booking_id
      and b.booking_status = 'confirmed'
  ) then
    raise exception 'add-ons are frozen once the booking is confirmed (ADR-0005)'
      using errcode = 'P0001';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_booking_number()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  if tg_op = 'INSERT' then
    new.booking_number := public.next_booking_number();
    return new;
  end if;
  raise exception 'booking_number is assigned by the database and cannot be changed'
    using errcode = 'P0001';
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_booking_room_free()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  -- Cancelled/expired rows keep history without blocking.
  if new.booking_status in ('cancelled', 'expired') then
    return new;
  end if;
  perform public.assert_booking_room_free(
    p_room_id := new.booking_room_id,
    p_start_at := new.booking_start_at,
    p_end_at := new.booking_end_at
  );
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_house_event_room_free()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
declare
  v_start_at timestamptz;
  v_end_at timestamptz;
begin
  select he.house_event_start_at, he.house_event_end_at
    into v_start_at, v_end_at
  from public.house_events he
  where he.house_event_id = new.house_event_room_event_id;

  perform public.assert_event_room_free(
    p_room_id := new.house_event_room_room_id,
    p_start_at := v_start_at,
    p_end_at := v_end_at,
    p_exclude_event_id := new.house_event_room_event_id
  );
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_house_event_rooms_free()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  perform public.assert_event_room_free(
    p_room_id := her.house_event_room_room_id,
    p_start_at := new.house_event_start_at,
    p_end_at := new.house_event_end_at,
    p_exclude_event_id := new.house_event_id
  )
  from public.house_event_rooms her
  where her.house_event_room_event_id = new.house_event_id;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_live_hold()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  if new.booking_status = 'pending_verification'
    and new.booking_hold_expires_at is not null
    and new.booking_hold_expires_at <= now() then
    new.booking_status := 'expired';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_snapshot_immutable()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  if new.booking_room_price_ore is distinct from old.booking_room_price_ore
    or new.booking_discount_percent is distinct from old.booking_discount_percent
    or new.booking_addon_total_ore is distinct from old.booking_addon_total_ore
    or new.booking_expected_total_ore is distinct from old.booking_expected_total_ore
    or new.booking_cancellation_terms is distinct from old.booking_cancellation_terms then
    raise exception 'price snapshot is frozen once a booking is confirmed (ADR-0005)'
      using errcode = 'P0001';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.expire_stale_holds()
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_flipped integer;
begin
  update public.bookings
  set booking_status = 'expired',
      booking_updated_at = now()
  where booking_status = 'pending_verification'
    and booking_hold_expires_at is not null
    and booking_hold_expires_at <= now();

  get diagnostics v_flipped = row_count;
  return v_flipped;
end;
$function$;

CREATE OR REPLACE FUNCTION public.next_booking_number()
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  return 'B-'
    || to_char(now(), 'YYMM')
    || '-'
    || lpad(nextval('public.booking_number_seq'::regclass)::text, 4, '0');
end;
$function$;

CREATE TRIGGER booking_addons_snapshot_immutable
  BEFORE INSERT OR DELETE OR UPDATE ON public.booking_addons
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_addon_snapshot_immutable();

CREATE TRIGGER bookings_assign_number
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_booking_number();

CREATE TRIGGER bookings_live_hold
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_live_hold();

CREATE TRIGGER bookings_number_immutable
  BEFORE UPDATE OF booking_number ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_booking_number();

CREATE TRIGGER bookings_room_period_free
  BEFORE INSERT OR UPDATE OF booking_room_id, booking_start_at, booking_end_at, booking_status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_booking_room_free();

CREATE TRIGGER bookings_snapshot_immutable
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  WHEN ((old.booking_status = 'confirmed'::public.booking_status))
  EXECUTE FUNCTION public.enforce_snapshot_immutable();

CREATE TRIGGER house_event_rooms_period_free
  BEFORE INSERT OR UPDATE OF house_event_room_event_id, house_event_room_room_id ON public.house_event_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_house_event_room_free();

CREATE TRIGGER house_events_rooms_period_free
  BEFORE UPDATE OF house_event_start_at, house_event_end_at ON public.house_events
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_house_event_rooms_free();

COMMENT ON EXTENSION "btree_gist" IS 'support for indexing common datatypes in GiST';

REVOKE ALL ON FUNCTION "public"."assert_booking_room_free"(uuid, timestamp WITH time zone, timestamp WITH time zone) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."assert_booking_room_free"(uuid, timestamp WITH time zone, timestamp WITH time zone) TO "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."assert_event_room_free"(uuid, timestamp WITH time zone, timestamp WITH time zone, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."assert_event_room_free"(uuid, timestamp WITH time zone, timestamp WITH time zone, uuid) TO "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."booking_blocked_until"(timestamp WITH time zone) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."enforce_addon_snapshot_immutable"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."enforce_booking_number"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."enforce_booking_room_free"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."enforce_house_event_room_free"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."enforce_house_event_rooms_free"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."enforce_live_hold"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."enforce_snapshot_immutable"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."expire_stale_holds"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."expire_stale_holds"() TO "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."next_booking_number"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."next_booking_number"() TO "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."booking_number_seq" TO "anon", "authenticated", "postgres", "service_role";

ALTER TABLE "public"."bookings"
  ADD CONSTRAINT "bookings_no_overlap" EXCLUDE USING gist (booking_room_id WITH =, tstzrange(booking_start_at, public.booking_blocked_until(booking_end_at), '[)'::text) WITH &&)
    WHERE ((booking_status = ANY (ARRAY['pending_verification'::public.booking_status, 'confirmed'::public.booking_status])));
