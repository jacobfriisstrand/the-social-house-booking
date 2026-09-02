-- One account per company; the auth user's email is companies.company_email
-- (docs/agents/auth.md). Columns prefixed per ADR-0018, money as integer øre
-- (ADR-0019), prices excl. VAT (ADR-0020), timestamptz UTC (ADR-0021).

create type public.company_membership_status as enum ('member', 'external');

create table public.companies (
  company_id uuid primary key default gen_random_uuid(),
  company_auth_user_id uuid not null unique references auth.users (id),
  company_username text not null unique,
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
  company_billing_interval text not null default 'monthly',
  company_economic_customer_number text,
  company_internal_note text,
  company_master_data_completed_at timestamptz,
  company_created_at timestamptz not null default now(),
  company_updated_at timestamptz not null default now()
);

-- Deny-by-default; policy content belongs to #19.
alter table public.companies enable row level security;
