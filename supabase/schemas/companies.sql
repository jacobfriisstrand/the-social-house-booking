-- One account per company; the auth user's email is companies.company_email
-- and is the login credential (docs/agents/auth.md). Columns prefixed per
-- ADR-0018, money as integer øre (ADR-0019), prices excl. VAT (ADR-0020),
-- timestamptz UTC (ADR-0021).

create type public.company_membership_status as enum ('member', 'external');

create table public.companies (
  company_id uuid primary key default gen_random_uuid(),
  company_auth_user_id uuid not null unique references auth.users (id),
  company_email text not null unique,
  company_display_name text not null,
  company_legal_name text,
  company_membership_status public.company_membership_status not null default 'external',
  company_discount_percent integer not null default 0
    check (company_discount_percent between 0 and 100),
  company_cvr_number text,
  company_contact_name text,
  company_billing_address text,
  company_billing_postal_code text,
  company_billing_city text,
  company_billing_country text,
  company_invoice_email text,
  company_attention text,
  company_department text,
  company_reference text,
  company_billing_notes text,
  -- ponytail: text because v1.0 (Bilag 1) knows only 'monthly'; becomes an
  -- enum the day a second interval appears.
  company_billing_interval text not null default 'monthly',
  company_economic_customer_number text,
  company_internal_note text,
  company_master_data_completed_at timestamptz,
  company_created_at timestamptz not null default now(),
  company_updated_at timestamptz not null default now(),
  -- Bilag 1 requires the contact's mobile number (#1). Appended last, per
  -- docs/agents/supabase.md, to keep the migration diff clean.
  company_contact_phone text
);

-- Deny-by-default; policy content belongs to #19.
alter table public.companies enable row level security;
-- External companies pay full room price (Bilag 1 "External customers",
-- ADR-0008, #14): a discount is only ever agreed with a member. Enforced
-- here so every write path obeys, like the escalation guard in policies/.
alter table public.companies add constraint companies_external_no_discount
  check (company_membership_status = 'member' or company_discount_percent = 0);

-- ---------------------------------------------------------------------------
-- Outlook mirror (#13, ADR-0003): the calendar entry's subject carries the
-- company's display name (lib/domain/outlook-event.ts), so a rename re-marks
-- the upcoming rows of the company's confirmed bookings (calendar_events.sql).
-- SECURITY DEFINER like the other mirror triggers. ponytail: bookings that
-- have already ended keep the name they were created with; upgrade: drop the
-- > now() bound if staff ever need history corrected.
create or replace function public.mark_company_bookings_calendar_dirty()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.calendar_events ce
  set calendar_event_needs_sync = true,
      calendar_event_updated_at = now()
  where ce.calendar_event_booking_id in (
    select b.booking_id
    from public.bookings b
    where b.booking_company_id = new.company_id
      and b.booking_status = 'confirmed'
      and b.booking_end_at > now()
  );
  return null;
end;
$$;

create trigger companies_calendar_dirty
  after update of company_display_name
  on public.companies
  for each row
  execute function public.mark_company_bookings_calendar_dirty();
