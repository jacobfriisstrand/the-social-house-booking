-- Internal The Social House events that block rooms; not part of the
-- invoicing basis. They participate in the same availability constraint as
-- bookings (delivered by #24).

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
