-- Bookable rooms. Opening hours are local wall-clock time in
-- Europe/Copenhagen (ADR-0021); hourly price excl. VAT in integer øre.

create table public.rooms (
  room_id uuid primary key default gen_random_uuid(),
  room_name text not null,
  room_description text,
  room_location text,
  room_capacity integer not null check (room_capacity > 0),
  room_price_ore integer not null check (room_price_ore >= 0),
  -- ponytail: single daily interval — cannot express closed weekdays or
  -- different weekend hours; Bilag 1 v1.0 only defines one range per room.
  -- Upgrade: per-weekday opening_hours table when a ticket needs it.
  room_opens_at time not null,
  room_closes_at time not null,
  room_practical_info text,
  room_is_active boolean not null default true,
  room_created_at timestamptz not null default now(),
  room_updated_at timestamptz not null default now(),
  constraint rooms_closes_after_opens_check check (room_closes_at > room_opens_at)
);

create table public.room_images (
  room_image_id uuid primary key default gen_random_uuid(),
  room_image_room_id uuid not null references public.rooms (room_id) on delete cascade,
  room_image_url text not null,
  room_image_sort_order integer not null default 0,
  room_image_created_at timestamptz not null default now()
);

create index room_images_room_idx on public.room_images (room_image_room_id, room_image_sort_order);

alter table public.rooms enable row level security;
alter table public.room_images enable row level security;
