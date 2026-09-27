-- Append-only audit of every booking change (#5): one row per write that
-- changed a tracked column, on insert and on every later transition — hold,
-- confirmation (ADR-0005), cancellation (ADR-0006), fee waive, invoicing
-- status, admin edits. Nothing is hard-deleted; the trail is the history
-- the spec's "Afbooking" and "Ombooking og fejl" sections require.

create table public.booking_history (
  booking_history_id uuid primary key default gen_random_uuid(),
  booking_history_booking_id uuid not null references public.bookings (booking_id) on delete cascade,
  booking_history_changed_at timestamptz not null default now(),
  -- The session that made the change: an admin or the company's account
  -- (ADR-0004: the booker is not an auth user). Null for service-role
  -- writes, such as a cancellation through the secure link (allowlist
  -- entry 2) or the hourly job.
  booking_history_changed_by uuid references auth.users (id),
  booking_history_change jsonb not null
);

-- The trail is read per booking, oldest first.
create index booking_history_booking_idx
  on public.booking_history (booking_history_booking_id, booking_history_changed_at);

alter table public.booking_history enable row level security;

-- ---------------------------------------------------------------------------
-- The audit trigger (#5): every write to public.bookings that changes a
-- tracked column appends one booking_history row with the column diff —
-- { "<column>": { "from": <old>, "to": <new> } }; on INSERT every tracked
-- column is recorded with "from" null. Enforced in Postgres so every write
-- path obeys it, exactly like the other bookings integrity rules.
--
-- SECURITY DEFINER because the trail must hold for every writer: company
-- sessions have no RLS grant on this table (admin-read-only), and the
-- unauthenticated cancellation link writes under the service role. The
-- function only inserts what it computes from the row itself.
--
-- booking_updated_at is excluded from the tracked columns so a write that
-- changes nothing else is not logged; booking_id, booking_number,
-- booking_company_id and booking_created_at are immutable or set on insert
-- and carry no diff.
create or replace function public.record_booking_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_change jsonb;
begin
  v_old := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;

  select jsonb_object_agg(
           tracked,
           jsonb_build_object('from', v_old -> tracked, 'to', to_jsonb(new) -> tracked)
         )
    into v_change
  from unnest(array[
    'booking_room_id',
    'booking_status',
    'booking_start_at',
    'booking_end_at',
    'booking_participant_count',
    'booking_booker_name',
    'booking_booker_email',
    'booking_booker_phone',
    'booking_reference',
    'booking_practical_notes',
    'booking_internal_note',
    'booking_room_price_ore',
    'booking_discount_percent',
    'booking_addon_total_ore',
    'booking_expected_total_ore',
    'booking_cancellation_terms',
    'booking_hold_expires_at',
    'booking_invoicing_status',
    'booking_invoice_date',
    'booking_invoice_number',
    'booking_invoiced_at',
    'booking_invoiced_by',
    'booking_catering_accepted_at',
    'booking_cancelled_at',
    'booking_cancellation_fee_ore',
    'booking_cancelled_by',
    'booking_cancellation_fee_waived'
  ]) as tracked
  where v_old -> tracked is distinct from to_jsonb(new) -> tracked;

  if v_change is null then
    return null;
  end if;

  insert into public.booking_history (
    booking_history_booking_id,
    booking_history_changed_by,
    booking_history_change
  ) values (
    new.booking_id,
    auth.uid(),
    v_change
  );
  return null;
end;
$$;

create trigger bookings_record_history
  after insert or update on public.bookings
  for each row
  execute function public.record_booking_history();