-- Member-visible notice-board/calendar projection (#12): room, date/time,
-- the company's Display name for bookings, and the House Event title. Never
-- booker name/email/phone, purpose, participants, or any notes.
--
-- Definer view (sees all rows; base tables keep their own RLS): this is the
-- only cross-company read surface. Access is gated in the definition, not
-- by grants — the declarative sync re-asserts wide default grants on every
-- object it manages, so `auth.uid() is not null` is the boundary: anon
-- sessions (no JWT) get zero rows; any authenticated user (admin or
-- company) gets the projection. Service-role sessions have no user id and
-- read the base tables directly.

create view public.calendar_entries as
select
  *
from (
  select
    b.booking_id::text as calendar_entry_id,
    'booking'::text as calendar_entry_kind,
    b.booking_start_at as calendar_entry_start_at,
    b.booking_end_at as calendar_entry_end_at,
    r.room_id,
    r.room_name,
    c.company_display_name,
    null::text as house_event_title
  from public.bookings b
  join public.rooms r on r.room_id = b.booking_room_id
  join public.companies c on c.company_id = b.booking_company_id
  where b.booking_status in ('pending_verification', 'confirmed')
  union all
  select
    he.house_event_id::text,
    'house_event'::text,
    he.house_event_start_at,
    he.house_event_end_at,
    r.room_id,
    r.room_name,
    null::text,
    he.house_event_title
  from public.house_events he
  join public.house_event_rooms her on her.house_event_room_event_id = he.house_event_id
  join public.rooms r on r.room_id = her.house_event_room_room_id
) entries
where auth.uid() is not null;
