-- Practical notices for the front-page notice board (Bilag 1 "Kalender og
-- opslagstavle"); member-visible by design (#12). The admin switches a
-- notice on or off and may set an end: it shows while it is on and the end
-- has not passed. No start: a notice shows from the moment it is on
-- (decided in #12).

create table public.notices (
  notice_id uuid primary key default gen_random_uuid(),
  notice_body text not null,
  notice_is_active boolean not null default true,
  notice_ends_at timestamptz,
  notice_created_at timestamptz not null default now(),
  notice_updated_at timestamptz not null default now(),
  notice_title text not null
);

alter table public.notices enable row level security;
