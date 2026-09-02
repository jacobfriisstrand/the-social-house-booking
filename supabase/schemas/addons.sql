-- Add-ons are never discounted (ADR-0007/ADR-0011); fixed or per-participant.
-- House Service and House Host are ordinary add-ons (ADR-0015).

create type public.addon_pricing_model as enum ('fixed', 'per_participant');

create table public.addons (
  addon_id uuid primary key default gen_random_uuid(),
  addon_name text not null,
  addon_description text,
  addon_price_ore integer not null check (addon_price_ore >= 0),
  addon_pricing_model public.addon_pricing_model not null,
  addon_is_active boolean not null default true,
  addon_created_at timestamptz not null default now(),
  addon_updated_at timestamptz not null default now()
);

-- Which add-ons each room offers.
create table public.room_addons (
  room_addon_room_id uuid not null references public.rooms (room_id) on delete cascade,
  room_addon_addon_id uuid not null references public.addons (addon_id) on delete cascade,
  primary key (room_addon_room_id, room_addon_addon_id)
);

alter table public.addons enable row level security;
alter table public.room_addons enable row level security;
