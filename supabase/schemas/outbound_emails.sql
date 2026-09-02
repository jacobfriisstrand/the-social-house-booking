-- Send log for every outbound email, whether sent by the app (sendMail()),
-- the Send Email Hook, or the webhook-updated delivery status
-- (docs/agents/email.md).

create type public.outbound_email_kind as enum (
  'company-invitation',
  'verification-code',
  'password-reset',
  'booking-confirmation',
  'reminder',
  'booking-changed',
  'booking-cancelled',
  'admin-new-booking',
  'admin-booking-cancelled',
  'admin-company-completed'
);

create type public.outbound_email_status as enum (
  'queued',
  'sent',
  'delivered',
  'bounced',
  'complained',
  'delivery_delayed',
  'failed'
);

create table public.outbound_emails (
  outbound_email_id uuid primary key default gen_random_uuid(),
  outbound_email_kind public.outbound_email_kind not null,
  outbound_email_to text not null,
  outbound_email_resend_id text,
  outbound_email_status public.outbound_email_status not null default 'queued',
  outbound_email_error text,
  outbound_email_booking_id uuid references public.bookings (booking_id),
  outbound_email_company_id uuid references public.companies (company_id),
  outbound_email_sent_at timestamptz,
  outbound_email_created_at timestamptz not null default now(),
  outbound_email_updated_at timestamptz not null default now()
);

-- Reminder and booking-confirmation must be sent once per booking; retries
-- after a Resend error stay safe because of this index.
create unique index outbound_email_once_idx on public.outbound_emails (outbound_email_booking_id, outbound_email_kind)
  where outbound_email_kind in ('reminder', 'booking-confirmation');

create index outbound_email_booking_idx on public.outbound_emails (outbound_email_booking_id);
create index outbound_email_resend_idx on public.outbound_emails (outbound_email_resend_id);

alter table public.outbound_emails enable row level security;
