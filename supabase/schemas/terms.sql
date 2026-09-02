-- Booking terms, privacy policy, and GDPR overview, versioned (#15): admin
-- edits create a new version row so acceptances always reference an
-- immutable, dated version.

create table public.terms_versions (
  terms_version_id uuid primary key default gen_random_uuid(),
  -- Distinguishes "Booking terms", "Privacy policy", "GDPR overview".
  terms_version_name text not null,
  terms_version_version text not null,
  terms_version_content text not null,
  terms_version_published_at timestamptz,
  terms_version_created_at timestamptz not null default now(),
  unique (terms_version_name, terms_version_version)
);

create table public.terms_acceptances (
  terms_acceptance_id uuid primary key default gen_random_uuid(),
  terms_acceptance_company_id uuid not null references public.companies (company_id),
  terms_acceptance_booking_id uuid references public.bookings (booking_id),
  terms_acceptance_terms_version_id uuid not null references public.terms_versions (terms_version_id),
  terms_acceptance_accepted_at timestamptz not null default now()
);

alter table public.terms_versions enable row level security;
alter table public.terms_acceptances enable row level security;
