-- The invoicing audit (#9, Bilag 1 "Adminpanel og faktureringsgrundlag"):
-- one row per change of bookings.booking_invoicing_status, written by the
-- record_invoicing_event trigger (bookings.sql) in the same transaction as
-- the change it mirrors — the bulk "Markér som faktureret" action updates
-- every selected booking in one statement, and each row's event follows.
-- The invoice date and number are the values the booking carries at the
-- moment of the change; the admin who made it and when close the audit
-- (who/when, ADR-0014). The from/to statuses are the booking enum, not
-- plain text: the issue sketch said text, but the enum already exists
-- (bookings.sql) and keeps a buggy writer from recording a status the
-- bookings table could never hold.

create table public.invoicing_events (
  invoicing_event_id uuid primary key default gen_random_uuid(),
  invoicing_event_booking_id uuid not null references public.bookings (booking_id) on delete cascade,
  invoicing_event_from_status public.booking_invoicing_status not null,
  invoicing_event_to_status public.booking_invoicing_status not null,
  invoicing_event_invoice_date date,
  invoicing_event_invoice_number text,
  invoicing_event_changed_by uuid references auth.users (id),
  invoicing_event_changed_at timestamptz not null default now()
);

-- The trail is read per booking, oldest first — the same shape the manual
-- amounts' index gives (manual_amounts.sql).
create index invoicing_events_booking_idx
  on public.invoicing_events (invoicing_event_booking_id, invoicing_event_changed_at);

alter table public.invoicing_events enable row level security;

-- Admin-only audit: a company must not see or write the invoicing trail
-- (the default rule, as on house_events.sql). Rows are inserted by the
-- record_invoicing_event trigger, which runs as the admin whose update
-- fired it — the policy's insert arm lets that through and nothing else.
create policy invoicing_events_admin_all on public.invoicing_events
  for all to authenticated
  using ((auth.jwt() ->> 'app_role') = 'admin')
  with check ((auth.jwt() ->> 'app_role') = 'admin');
