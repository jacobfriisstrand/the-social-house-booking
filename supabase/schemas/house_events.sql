-- Internal The Social House events that block rooms; not part of the
-- invoicing basis. They participate in the same availability constraint as
-- bookings (incl. the 30-minute buffer, ADR-0002) through the triggers at
-- the bottom of this file; the shared check is
-- public.assert_room_period_free in bookings.sql (#24).

create table public.house_events (
  house_event_id uuid primary key default gen_random_uuid(),
  house_event_title text,
  house_event_description text not null,
  house_event_start_at timestamptz not null,
  house_event_end_at timestamptz not null,
  house_event_created_at timestamptz not null default now(),
  house_event_updated_at timestamptz not null default now(),
  check (house_event_end_at > house_event_start_at)
);

create table public.house_event_rooms (
  house_event_room_event_id uuid not null references public.house_events (house_event_id) on delete cascade,
  house_event_room_room_id uuid not null references public.rooms (room_id) on delete cascade,
  primary key (house_event_room_event_id, house_event_room_room_id)
);

create index house_event_rooms_room_idx on public.house_event_rooms (house_event_room_room_id, house_event_room_event_id);

alter table public.house_events enable row level security;
alter table public.house_event_rooms enable row level security;

-- ---------------------------------------------------------------------------
-- Room-blocking participation (#24). An exclusion constraint cannot span
-- tables, so triggers route every event write through
-- assert_event_room_free (bookings.sql), which sees live bookings and other
-- events; bookings-versus-bookings stays with the exclusion constraint.

create or replace function public.enforce_house_event_room_free()
returns trigger
language plpgsql
as $$
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
$$;

create trigger house_event_rooms_period_free
  before insert or update of house_event_room_event_id, house_event_room_room_id
  on public.house_event_rooms
  for each row
  execute function public.enforce_house_event_room_free();

create or replace function public.enforce_house_event_rooms_free()
returns trigger
language plpgsql
as $$
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
$$;

create trigger house_events_rooms_period_free
  before update of house_event_start_at, house_event_end_at
  on public.house_events
  for each row
  execute function public.enforce_house_event_rooms_free();
