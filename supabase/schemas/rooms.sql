-- Bookable rooms. Opening hours are local wall-clock time in
-- Europe/Copenhagen (ADR-0021); hourly price excl. VAT in integer øre
-- (ADR-0019, ADR-0020).

create table public.rooms (
  room_id uuid primary key default gen_random_uuid(),
  room_name text not null,
  room_description text,
  room_location text,
  room_capacity integer not null check (room_capacity > 0),
  -- Normal hourly price excl. VAT, integer øre (ADR-0019).
  room_hourly_price_ore integer not null check (room_hourly_price_ore >= 0),
  room_practical_notes text,
  room_is_active boolean not null default true,
  room_created_at timestamptz not null default now(),
  room_updated_at timestamptz not null default now()
);

-- Room photos live in the storage bucket `room-images`; this table keeps the
-- storage path and display order. The original file name and byte size are
-- kept for display in the admin form. Cascade delete: images belong to the
-- room record (presentation data only). Sort order is unique per room so
-- concurrent writes cannot produce a nondeterministic ordering.
create table public.room_images (
  room_image_id uuid primary key default gen_random_uuid(),
  room_image_room_id uuid not null references public.rooms (room_id) on delete cascade,
  room_image_storage_path text not null,
  room_image_sort_order integer not null default 0,
  room_image_created_at timestamptz not null default now(),
  room_image_file_name text not null,
  room_image_file_size integer not null check (room_image_file_size > 0),
  constraint room_images_room_sort_order_unique unique (room_image_room_id, room_image_sort_order)
);

-- Weekly opening hours (Bilag 1 "Åbningstider og bookingperiode"): one row
-- per weekday per room. day_of_week 0 = Monday … 6 = Sunday. Times are
-- Europe/Copenhagen wall clock (ADR-0021); every booking must fit within
-- them — the fit check is TypeScript arithmetic (#4) on top of these rows.
create table public.room_opening_hours (
  room_opening_hour_id uuid primary key default gen_random_uuid(),
  room_opening_hour_room_id uuid not null references public.rooms (room_id) on delete cascade,
  room_opening_hour_day_of_week integer not null
    check (room_opening_hour_day_of_week between 0 and 6),
  room_opening_hour_opens time not null,
  room_opening_hour_closes time not null,
  room_opening_hour_is_closed boolean not null default false,
  constraint room_opening_hours_closes_after_opens_check
    check (room_opening_hour_is_closed or room_opening_hour_closes > room_opening_hour_opens),
  constraint room_opening_hours_room_day_unique unique (room_opening_hour_room_id, room_opening_hour_day_of_week)
);

create index room_opening_hours_room_idx on public.room_opening_hours (room_opening_hour_room_id, room_opening_hour_day_of_week);

-- Special closing days (lukkedag, CONTEXT.md) override the weekly row for
-- their date (holiday, closed for maintenance, extended hours). A closed day
-- carries no times.
create table public.room_special_closing_days (
  room_special_closing_day_id uuid primary key default gen_random_uuid(),
  room_special_closing_day_room_id uuid not null references public.rooms (room_id) on delete cascade,
  room_special_closing_day_date date not null,
  room_special_closing_day_opens time,
  room_special_closing_day_closes time,
  room_special_closing_day_is_closed boolean not null default false,
  constraint room_special_closing_days_closes_after_opens_check
    check (
      (room_special_closing_day_is_closed and room_special_closing_day_opens is null and room_special_closing_day_closes is null)
      or (not room_special_closing_day_is_closed
        and room_special_closing_day_opens is not null
        and room_special_closing_day_closes is not null
        and room_special_closing_day_closes > room_special_closing_day_opens)
    ),
  constraint room_special_closing_days_room_date_unique unique (room_special_closing_day_room_id, room_special_closing_day_date)
);

create index room_special_closing_days_room_date_idx
  on public.room_special_closing_days (room_special_closing_day_room_id, room_special_closing_day_date);

alter table public.rooms enable row level security;
alter table public.room_images enable row level security;
alter table public.room_opening_hours enable row level security;
alter table public.room_special_closing_days enable row level security;
