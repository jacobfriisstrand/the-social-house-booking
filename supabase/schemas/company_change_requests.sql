-- Company settings changes are approved by the current primary email. Values
-- are kept as immutable JSON snapshots so the review page can show a complete
-- diff and approval applies the complete batch atomically.

create type public.company_change_request_status as enum (
  'pending',
  'awaiting_new_email',
  'committed',
  'rejected',
  'expired'
);

create type public.company_change_token_kind as enum (
  'current_email',
  'new_email'
);

create table public.company_change_requests (
  company_change_request_id uuid primary key default gen_random_uuid(),
  company_change_request_company_id uuid not null references public.companies (company_id),
  company_change_request_current_email text not null,
  company_change_request_proposed_email text not null,
  company_change_request_before_values jsonb not null,
  company_change_request_after_values jsonb not null,
  company_change_request_status public.company_change_request_status not null default 'pending',
  company_change_request_created_at timestamptz not null default now(),
  company_change_request_updated_at timestamptz not null default now()
);

create index company_change_request_company_idx
  on public.company_change_requests (company_change_request_company_id);

alter table public.company_change_requests enable row level security;

create table public.company_change_tokens (
  company_change_token_id uuid primary key default gen_random_uuid(),
  company_change_token_request_id uuid not null references public.company_change_requests (company_change_request_id) on delete cascade,
  company_change_token_kind public.company_change_token_kind not null,
  company_change_token_hash text not null unique,
  company_change_token_expires_at timestamptz not null,
  company_change_token_consumed_at timestamptz,
  company_change_token_created_at timestamptz not null default now()
);

create unique index company_change_token_kind_idx
  on public.company_change_tokens (company_change_token_request_id, company_change_token_kind);

alter table public.company_change_tokens enable row level security;
