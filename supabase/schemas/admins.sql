-- Admins are ordinary auth users whose JWT carries app_role = 'admin'
-- via the custom access token hook (docs/agents/auth.md).

create table public.admins (
  admin_id uuid primary key default gen_random_uuid(),
  admin_auth_user_id uuid not null unique references auth.users (id),
  admin_username text not null unique,
  admin_display_name text not null,
  admin_created_at timestamptz not null default now(),
  admin_updated_at timestamptz not null default now()
);

alter table public.admins enable row level security;
