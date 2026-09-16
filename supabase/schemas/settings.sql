-- Site-wide settings, a single row: setting_id is constrained to 1. Backs
-- the Wi-Fi credentials the shell footer shows (DESIGN.md). The admin edit
-- action upserts, so the row self-materializes on cloud projects where the
-- seed never runs; until a first save the footer falls back to the copy in
-- messages/da.ts.

create table public.settings (
  setting_id smallint primary key default 1 check (setting_id = 1),
  setting_wifi_network text not null,
  setting_wifi_password text not null,
  setting_created_at timestamptz not null default now(),
  setting_updated_at timestamptz not null default now()
);

-- Deny-by-default; policy content lives in policies/settings.sql.
alter table public.settings enable row level security;
