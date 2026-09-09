-- Practical notices for the front-page notice board (Bilag 1 "Kalender og
-- opslagstavle"); member-visible by design (#12).

create table public.notices (
  notice_id uuid primary key default gen_random_uuid(),
  notice_body text not null,
  notice_is_active boolean not null default true,
  notice_starts_at timestamptz,
  notice_ends_at timestamptz,
  notice_created_at timestamptz not null default now(),
  notice_updated_at timestamptz not null default now()
);

alter table public.notices enable row level security;
