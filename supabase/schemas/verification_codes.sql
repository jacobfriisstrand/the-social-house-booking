-- Six-digit verification codes for the booker's work email (ADR-0004).
-- Codes are stored hashed, single use, max attempts enforced by the app.

create table public.verification_codes (
  verification_code_id uuid primary key default gen_random_uuid(),
  verification_code_booking_id uuid not null references public.bookings (booking_id) on delete cascade,
  verification_code_hash text not null,
  verification_code_expires_at timestamptz not null,
  verification_code_attempts integer not null default 0 check (verification_code_attempts >= 0),
  verification_code_consumed_at timestamptz,
  verification_code_created_at timestamptz not null default now(),
  verification_code_updated_at timestamptz not null default now()
);

create index verification_codes_booking_idx on public.verification_codes (verification_code_booking_id);

alter table public.verification_codes enable row level security;
