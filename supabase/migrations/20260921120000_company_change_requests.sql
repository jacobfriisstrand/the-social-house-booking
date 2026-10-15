create type public.company_change_request_status as enum ('pending', 'awaiting_new_email', 'committed', 'rejected', 'expired');
create type public.company_change_token_kind as enum ('current_email', 'new_email');
alter type public.outbound_email_kind add value 'company-change-review';
alter type public.outbound_email_kind add value 'company-change-new-email';
alter type public.outbound_email_kind add value 'company-change-completed';

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
create index company_change_request_company_idx on public.company_change_requests (company_change_request_company_id);
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
create unique index company_change_token_kind_idx on public.company_change_tokens (company_change_token_request_id, company_change_token_kind);
alter table public.company_change_tokens enable row level security;
revoke all on table public.company_change_requests from anon, authenticated;
revoke all on table public.company_change_tokens from anon, authenticated;

-- Functions are kept in the migration as well as the declarative source so a
-- reset can apply the checked-in schema without requiring the CLI locally.

create or replace function public.apply_company_change_request(p_request_id uuid, p_token_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  request_row public.company_change_requests;
  token_row public.company_change_tokens;
  next_step text;
begin
  select * into request_row from public.company_change_requests
    where company_change_request_id = p_request_id for update;
  if request_row.company_change_request_id is null then
    raise exception 'company change request not found' using errcode = 'P0002';
  end if;
  select * into token_row from public.company_change_tokens
    where company_change_token_request_id = p_request_id
      and company_change_token_kind = 'current_email'
      and company_change_token_hash = p_token_hash
      and company_change_token_consumed_at is null for update;
  if token_row.company_change_token_id is null then
    raise exception 'company change token is invalid' using errcode = 'P0002';
  end if;
  if token_row.company_change_token_expires_at <= now() then
    update public.company_change_requests set company_change_request_status = 'expired', company_change_request_updated_at = now()
      where company_change_request_id = p_request_id;
    return jsonb_build_object('error', 'expired');
  end if;
  if request_row.company_change_request_status <> 'pending' then
    raise exception 'company change request is no longer pending' using errcode = 'P0002';
  end if;
  update public.company_change_tokens set company_change_token_consumed_at = now()
    where company_change_token_id = token_row.company_change_token_id;
  if request_row.company_change_request_current_email = request_row.company_change_request_proposed_email then
    next_step := 'committed';
    update public.companies set
      company_email = request_row.company_change_request_after_values ->> 'email',
      company_legal_name = nullif(request_row.company_change_request_after_values ->> 'legalName', ''),
      company_cvr_number = nullif(request_row.company_change_request_after_values ->> 'cvrNumber', ''),
      company_billing_address = nullif(request_row.company_change_request_after_values ->> 'billingAddress', ''),
      company_billing_postal_code = nullif(request_row.company_change_request_after_values ->> 'billingPostalCode', ''),
      company_billing_city = nullif(request_row.company_change_request_after_values ->> 'billingCity', ''),
      company_billing_country = nullif(request_row.company_change_request_after_values ->> 'billingCountry', ''),
      company_contact_name = nullif(request_row.company_change_request_after_values ->> 'contactName', ''),
      company_contact_phone = nullif(request_row.company_change_request_after_values ->> 'contactPhone', ''),
      company_invoice_email = nullif(request_row.company_change_request_after_values ->> 'invoiceEmail', ''),
      company_attention = nullif(request_row.company_change_request_after_values ->> 'attention', ''),
      company_department = nullif(request_row.company_change_request_after_values ->> 'department', ''),
      company_reference = nullif(request_row.company_change_request_after_values ->> 'reference', ''),
      company_billing_notes = nullif(request_row.company_change_request_after_values ->> 'billingNotes', ''),
      company_master_data_completed_at = coalesce(company_master_data_completed_at, now()),
      company_updated_at = now()
      where company_id = request_row.company_change_request_company_id;
    update public.company_change_requests set company_change_request_status = 'committed', company_change_request_updated_at = now()
      where company_change_request_id = p_request_id;
  else
    next_step := 'awaiting_new_email';
    update public.company_change_requests set company_change_request_status = 'awaiting_new_email', company_change_request_updated_at = now()
      where company_change_request_id = p_request_id;
  end if;
  return jsonb_build_object('company_id', request_row.company_change_request_company_id, 'current_email', request_row.company_change_request_current_email, 'proposed_email', request_row.company_change_request_proposed_email, 'next_step', next_step);
end;
$$;

create or replace function public.commit_company_email_change(p_request_id uuid, p_token_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  request_row public.company_change_requests;
  token_row public.company_change_tokens;
begin
  select * into request_row from public.company_change_requests
    where company_change_request_id = p_request_id for update;
  if request_row.company_change_request_id is null or request_row.company_change_request_status <> 'awaiting_new_email' then
    raise exception 'company email change is not awaiting verification' using errcode = 'P0002';
  end if;
  select * into token_row from public.company_change_tokens
    where company_change_token_request_id = p_request_id
      and company_change_token_kind = 'new_email'
      and company_change_token_hash = p_token_hash
      and company_change_token_consumed_at is null for update;
  if token_row.company_change_token_id is null or token_row.company_change_token_expires_at <= now() then
    if token_row.company_change_token_id is not null then
      update public.company_change_requests set company_change_request_status = 'expired', company_change_request_updated_at = now()
        where company_change_request_id = p_request_id;
      return jsonb_build_object('error', 'expired');
    end if;
    raise exception 'company email token is invalid or expired' using errcode = 'P0002';
  end if;
  update public.company_change_tokens set company_change_token_consumed_at = now()
    where company_change_token_id = token_row.company_change_token_id;
  update public.companies set
    company_email = request_row.company_change_request_after_values ->> 'email',
    company_legal_name = nullif(request_row.company_change_request_after_values ->> 'legalName', ''),
    company_cvr_number = nullif(request_row.company_change_request_after_values ->> 'cvrNumber', ''),
    company_billing_address = nullif(request_row.company_change_request_after_values ->> 'billingAddress', ''),
    company_billing_postal_code = nullif(request_row.company_change_request_after_values ->> 'billingPostalCode', ''),
    company_billing_city = nullif(request_row.company_change_request_after_values ->> 'billingCity', ''),
    company_billing_country = nullif(request_row.company_change_request_after_values ->> 'billingCountry', ''),
    company_contact_name = nullif(request_row.company_change_request_after_values ->> 'contactName', ''),
    company_contact_phone = nullif(request_row.company_change_request_after_values ->> 'contactPhone', ''),
    company_invoice_email = nullif(request_row.company_change_request_after_values ->> 'invoiceEmail', ''),
    company_attention = nullif(request_row.company_change_request_after_values ->> 'attention', ''),
    company_department = nullif(request_row.company_change_request_after_values ->> 'department', ''),
    company_reference = nullif(request_row.company_change_request_after_values ->> 'reference', ''),
    company_billing_notes = nullif(request_row.company_change_request_after_values ->> 'billingNotes', ''),
    company_master_data_completed_at = coalesce(company_master_data_completed_at, now()),
    company_updated_at = now()
    where company_id = request_row.company_change_request_company_id;
  update public.company_change_requests set company_change_request_status = 'committed', company_change_request_updated_at = now()
    where company_change_request_id = p_request_id;
  return jsonb_build_object('company_id', request_row.company_change_request_company_id, 'current_email', request_row.company_change_request_current_email, 'proposed_email', request_row.company_change_request_proposed_email);
end;
$$;

revoke execute on function public.apply_company_change_request(uuid, text) from public, anon, authenticated;
revoke execute on function public.commit_company_email_change(uuid, text) from public, anon, authenticated;
grant execute on function public.apply_company_change_request(uuid, text) to service_role;
grant execute on function public.commit_company_email_change(uuid, text) to service_role;

create or replace function public.create_company_change_request(p_company_id uuid, p_current_email text, p_proposed_email text, p_before_values jsonb, p_after_values jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare request_id uuid;
begin
  update public.company_change_requests set company_change_request_status = 'rejected', company_change_request_updated_at = now()
    where company_change_request_company_id = p_company_id and company_change_request_status in ('pending', 'awaiting_new_email');
  insert into public.company_change_requests (company_change_request_after_values, company_change_request_before_values, company_change_request_company_id, company_change_request_current_email, company_change_request_proposed_email)
    values (p_after_values, p_before_values, p_company_id, p_current_email, p_proposed_email)
    returning company_change_request_id into request_id;
  return request_id;
end;
$$;
revoke execute on function public.create_company_change_request(uuid, text, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_company_change_request(uuid, text, text, jsonb, jsonb) to service_role;

create or replace function public.revoke_company_sessions(p_auth_user_id uuid)
returns void language sql security definer set search_path = '' as $$
  delete from auth.sessions where user_id = p_auth_user_id;
$$;
revoke execute on function public.revoke_company_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_company_sessions(uuid) to service_role;
