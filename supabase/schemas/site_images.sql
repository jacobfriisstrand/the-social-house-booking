-- Public presentation images (#89): the admin-chosen hero photo for the
-- split-screen shell, keyed by slot so a future slot is a row, not a
-- migration. The path points into the site-images bucket (public; bucket
-- row in migration 20261014203000_site_images_bucket.sql). Anonymous
-- visitors read the slot's path — the public layout renders with no
-- session — and only the admin claim writes; delete is admin-only too
-- (Fjern billede under Indstillinger falls the layout back to the logo).

create table public.site_images (
  site_image_slot text primary key,
  site_image_path text not null,
  site_image_created_at timestamptz not null default now(),
  site_image_updated_at timestamptz not null default now()
);

-- Deny-by-default; policy content lives in policies/site_images.sql.
alter table public.site_images enable row level security;
