-- Bookings: hold (pending_verification) → confirmed; cancelled/expired keep
-- history. Integrity rules live in the section at the bottom of this file
-- (#24): overlap incl. buffer, snapshot immutability, booking number, hold
-- liveness. Price snapshot columns follow ADR-0005, money ADR-0019, times ADR-0021.

create type public.booking_status as enum (
  'pending_verification',
  'confirmed',
  'cancelled',
  'expired'
);

create type public.booking_invoicing_status as enum (
  'not_invoiced',
  'invoiced',
  'not_invoicable'
);

create table public.bookings (
  booking_id uuid primary key default gen_random_uuid(),
  -- Assigned by the bookings_assign_number trigger; app-supplied values are
  -- overwritten, never trusted.
  booking_number text not null unique,
  booking_company_id uuid not null references public.companies (company_id),
  booking_room_id uuid not null references public.rooms (room_id),
  booking_status public.booking_status not null default 'pending_verification',
  booking_start_at timestamptz not null,
  booking_end_at timestamptz not null,
  booking_participant_count integer not null check (booking_participant_count > 0),
  -- The responsible booker — not an auth user (ADR-0004).
  booking_booker_name text not null,
  booking_booker_email text not null,
  booking_booker_phone text not null,
  booking_reference text,
  booking_practical_notes text,
  booking_internal_note text,
  -- Price snapshot (ADR-0005): frozen at confirmation.
  booking_room_price_ore integer not null check (booking_room_price_ore >= 0),
  booking_discount_percent integer not null default 0
    check (booking_discount_percent between 0 and 100),
  booking_addon_total_ore integer not null default 0 check (booking_addon_total_ore >= 0),
  booking_expected_total_ore integer not null default 0 check (booking_expected_total_ore >= 0),
  booking_cancellation_terms text,
  -- Cancellation (ADR-0006): fee on the member price, set at cancellation time.
  booking_cancelled_at timestamptz,
  booking_cancellation_fee_ore integer,
  -- Hold while the verification code is being entered. A hold past expiry is
  -- 'expired' (bookings_live_hold trigger + expire_stale_holds() sweep), so
  -- 'pending_verification' always means a live hold.
  booking_hold_expires_at timestamptz,
  -- Invoicing (ADR-0014): booking becomes invoicable after end time.
  booking_invoicing_status public.booking_invoicing_status not null default 'not_invoiced',
  booking_invoice_date date,
  booking_invoice_number text,
  booking_invoiced_at timestamptz,
  booking_invoiced_by uuid references auth.users (id),
  booking_created_at timestamptz not null default now(),
  booking_updated_at timestamptz not null default now(),
  -- Catering rule (Bilag 1 "Forplejning og hospitality", #7): the flow
  -- requires active acceptance; the confirmation mail (#11, Mail 4) repeats
  -- the rule. Null never happens through the app — the schema requires the
  -- checkbox — but the column stays nullable so fixtures and admin SQL do
  -- not have to fake an instant.
  booking_catering_accepted_at timestamptz,
  check (booking_end_at > booking_start_at)
);

-- Add-ons selected on a booking (#7). One line per add-on (composite key).
-- The line is written once, while the booking is pending, and is then part
-- of the price snapshot (ADR-0005): booking_addon_unit_price_ore is the
-- frozen per-unit price — the catalogue price, or the admin's House Host
-- adjustment, which lives only here and never edits the catalogue
-- (addons.sql). Quantity is the headcount for a per-participant add-on and
-- 1 for a fixed one; the total is unit × quantity, checked below.
create table public.booking_addons (
  booking_addon_booking_id uuid not null references public.bookings (booking_id) on delete cascade,
  booking_addon_addon_id uuid not null references public.addons (addon_id),
  booking_addon_unit_price_ore integer not null check (booking_addon_unit_price_ore >= 0),
  booking_addon_quantity integer not null check (booking_addon_quantity > 0),
  booking_addon_total_ore integer not null check (booking_addon_total_ore >= 0),
  primary key (booking_addon_booking_id, booking_addon_addon_id),
  constraint booking_addon_total_check
    check (booking_addon_total_ore = booking_addon_unit_price_ore * booking_addon_quantity)
);

-- Availability lookups are by room and time.
create index bookings_room_start_idx on public.bookings (booking_room_id, booking_start_at);
create index bookings_company_idx on public.bookings (booking_company_id);

alter table public.bookings enable row level security;
alter table public.booking_addons enable row level security;

-- ---------------------------------------------------------------------------
-- Integrity rules (#24): no overlap incl. the 30-minute buffer (ADR-0002),
-- snapshot immutability (ADR-0005), sequence-backed booking numbers, hold
-- liveness. Enforced in Postgres so every write path obeys them.

-- ADR-0002 buffer with a single home. `timestamptz + interval` is STABLE
-- (resolves through TimeZone) and exclusion constraints require IMMUTABLE
-- index expressions; epoch arithmetic is UTC-absolute, so the wrapper can
-- honestly be declared IMMUTABLE.
create or replace function public.booking_blocked_until(p_end_at timestamptz)
returns timestamptz
language sql
immutable
as $$
  select to_timestamp(extract(epoch from p_end_at) + 1800);
$$;

-- No overlap per room for live rows: [start, blocked_until) ranges must be
-- disjoint (ADR-0002). Cancelled/expired rows keep history without blocking.
-- House Events cannot join a table constraint; triggers cover them (here and
-- in house_events.sql).
alter table public.bookings add constraint bookings_no_overlap
  exclude using gist (
    booking_room_id with =,
    tstzrange(booking_start_at, public.booking_blocked_until(booking_end_at), '[)') with &&
  )
  where (booking_status in ('pending_verification', 'confirmed'));

-- Cross-table overlap checks. Bookings-versus-bookings is the
-- bookings_no_overlap constraint above: one rule, one mechanism, and the
-- tests can tell the two apart by error message. Both helpers are SECURITY
-- DEFINER because house_events are admin-only under RLS while a company's
-- booking insert must still collide with them; they only raise, they return
-- no data.
create or replace function public.assert_booking_room_free(
  p_room_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.house_events he
    join public.house_event_rooms her on her.house_event_room_event_id = he.house_event_id
    where her.house_event_room_room_id = p_room_id
      and tstzrange(he.house_event_start_at, public.booking_blocked_until(he.house_event_end_at), '[)')
          && tstzrange(p_start_at, public.booking_blocked_until(p_end_at), '[)')
  ) then
    raise exception 'room is blocked by a house event in that period (incl. buffer)'
      using errcode = '23P01';
  end if;
end;
$$;

create or replace function public.assert_event_room_free(
  p_room_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_exclude_event_id uuid default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.bookings b
    where b.booking_room_id = p_room_id
      and b.booking_status in ('pending_verification', 'confirmed')
      and tstzrange(b.booking_start_at, public.booking_blocked_until(b.booking_end_at), '[)')
          && tstzrange(p_start_at, public.booking_blocked_until(p_end_at), '[)')
  ) then
    raise exception 'room is already blocked by a booking in that period (incl. buffer)'
      using errcode = '23P01';
  end if;

  if exists (
    select 1
    from public.house_events he
    join public.house_event_rooms her on her.house_event_room_event_id = he.house_event_id
    where her.house_event_room_room_id = p_room_id
      and he.house_event_id is distinct from p_exclude_event_id
      and tstzrange(he.house_event_start_at, public.booking_blocked_until(he.house_event_end_at), '[)')
          && tstzrange(p_start_at, public.booking_blocked_until(p_end_at), '[)')
  ) then
    raise exception 'room is blocked by another house event in that period (incl. buffer)'
      using errcode = '23P01';
  end if;
end;
$$;

revoke execute on function public.assert_booking_room_free(uuid, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.assert_booking_room_free(uuid, timestamptz, timestamptz)
  to authenticated, service_role;
revoke execute on function public.assert_event_room_free(uuid, timestamptz, timestamptz, uuid)
  from public, anon;
grant execute on function public.assert_event_room_free(uuid, timestamptz, timestamptz, uuid)
  to authenticated, service_role;

create or replace function public.enforce_booking_room_free()
returns trigger
language plpgsql
as $$
begin
  -- Cancelled/expired rows keep history without blocking.
  if new.booking_status in ('cancelled', 'expired') then
    return new;
  end if;
  perform public.assert_booking_room_free(
    p_room_id := new.booking_room_id,
    p_start_at := new.booking_start_at,
    p_end_at := new.booking_end_at
  );
  return new;
end;
$$;

create trigger bookings_room_period_free
  before insert or update of booking_room_id, booking_start_at, booking_end_at, booking_status
  on public.bookings
  for each row
  execute function public.enforce_booking_room_free();

-- Booking number: sequence-backed, assigned by the database. The insert
-- trigger overwrites whatever the caller supplied; the update trigger makes
-- the number immutable afterwards. ponytail: one global sequence, so NNNN
-- does not restart each month; a per-month counter needs a locked counter
-- table (#4 can add it if anyone cares).
create sequence public.booking_number_seq;

create or replace function public.next_booking_number()
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  return 'B-'
    || to_char(now(), 'YYMM')
    || '-'
    || lpad(nextval('public.booking_number_seq'::regclass)::text, 4, '0');
end;
$$;

revoke execute on function public.next_booking_number() from public, anon;
grant execute on function public.next_booking_number() to authenticated, service_role;

create or replace function public.enforce_booking_number()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.booking_number := public.next_booking_number();
    return new;
  end if;
  raise exception 'booking_number is assigned by the database and cannot be changed'
    using errcode = 'P0001';
end;
$$;

create trigger bookings_assign_number
  before insert on public.bookings
  for each row
  execute function public.enforce_booking_number();

create trigger bookings_number_immutable
  before update of booking_number on public.bookings
  for each row
  execute function public.enforce_booking_number();

-- Holds are live only while unexpired: any write to a hold whose window has
-- passed flips it to 'expired', so the exclusion constraint, availability
-- queries, and calendar_entries can all treat 'pending_verification' as
-- live. Rows no write touches are flipped by expire_stale_holds() (hourly
-- job); until that sweep runs the constraint conservatively keeps blocking
-- the room.
create or replace function public.enforce_live_hold()
returns trigger
language plpgsql
as $$
begin
  if new.booking_status = 'pending_verification'
    and new.booking_hold_expires_at is not null
    and new.booking_hold_expires_at <= now() then
    new.booking_status := 'expired';
  end if;
  return new;
end;
$$;

create trigger bookings_live_hold
  before insert or update on public.bookings
  for each row
  execute function public.enforce_live_hold();

-- Price snapshot immutability (ADR-0005): the frozen columns cannot change
-- once confirmed. Status, cancellation columns, and notes remain writable.
create or replace function public.enforce_snapshot_immutable()
returns trigger
language plpgsql
as $$
begin
  if new.booking_room_price_ore is distinct from old.booking_room_price_ore
    or new.booking_discount_percent is distinct from old.booking_discount_percent
    or new.booking_addon_total_ore is distinct from old.booking_addon_total_ore
    or new.booking_expected_total_ore is distinct from old.booking_expected_total_ore
    or new.booking_cancellation_terms is distinct from old.booking_cancellation_terms then
    raise exception 'price snapshot is frozen once a booking is confirmed (ADR-0005)'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger bookings_snapshot_immutable
  before update on public.bookings
  for each row
  when (old.booking_status = 'confirmed')
  execute function public.enforce_snapshot_immutable();

-- Add-on snapshot rows freeze with the booking (ADR-0005): no insert, update,
-- or delete on a confirmed booking's add-ons.
create or replace function public.enforce_addon_snapshot_immutable()
returns trigger
language plpgsql
as $$
declare
  v_booking_id uuid;
begin
  -- On DELETE `new` is unassigned and on INSERT `old` is; reference only the
  -- one this operation actually carries.
  if tg_op = 'DELETE' then
    v_booking_id := old.booking_addon_booking_id;
  else
    v_booking_id := new.booking_addon_booking_id;
  end if;

  if exists (
    select 1
    from public.bookings b
    where b.booking_id = v_booking_id
      and b.booking_status = 'confirmed'
  ) then
    raise exception 'add-ons are frozen once the booking is confirmed (ADR-0005)'
      using errcode = 'P0001';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger booking_addons_snapshot_immutable
  before insert or update or delete on public.booking_addons
  for each row
  execute function public.enforce_addon_snapshot_immutable();

-- Line values (#7, ADR-0011): quantity is the headcount for a
-- per-participant add-on and 1 for a fixed one. Checked in Postgres so
-- every write path obeys it; the line total is guarded by the
-- booking_addon_total_check constraint. A per-participant line must be
-- written after the booking row carries the participant count it belongs
-- to (the natural order: booking first, then its lines), so changing the
-- headcount means updating bookings first, then the lines.
create or replace function public.enforce_addon_line_values()
returns trigger
language plpgsql
as $$
declare
  v_model public.addon_pricing_model;
  v_participant_count integer;
begin
  select a.addon_pricing_model into v_model
  from public.addons a
  where a.addon_id = new.booking_addon_addon_id;

  select b.booking_participant_count into v_participant_count
  from public.bookings b
  where b.booking_id = new.booking_addon_booking_id;

  if v_model = 'per_participant'
    and new.booking_addon_quantity is distinct from v_participant_count
  then
    raise exception
      'a per-participant add-on''s quantity must equal the booking''s participant count'
      using errcode = 'P0001';
  end if;

  if v_model = 'fixed' and new.booking_addon_quantity is distinct from 1 then
    raise exception 'a fixed add-on''s quantity must be 1'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger booking_addons_line_values
  before insert or update of booking_addon_addon_id, booking_addon_quantity
  on public.booking_addons
  for each row
  execute function public.enforce_addon_line_values();

-- The booking's frozen add-on total (ADR-0005) is the sum of its line
-- totals, and the expected total is the member price plus that sum.
-- Maintained here, not in the application, so every writer of
-- booking_addons — hold creation, an admin's House Host adjustment, a
-- participant-count change before confirmation — leaves the snapshot
-- columns consistent. The expected total moves by the delta only: the
-- member price part is rounded in TypeScript (lib/domain/pricing.ts) and
-- is not recomputed here. Runs as invoker: a writer of a booking's lines
-- already owns the booking under RLS.
create or replace function public.sync_booking_addon_totals()
returns trigger
language plpgsql
as $$
declare
  v_booking_id uuid;
  v_stored_total integer;
  v_line_sum integer;
begin
  if tg_op = 'DELETE' then
    v_booking_id := old.booking_addon_booking_id;
  else
    v_booking_id := new.booking_addon_booking_id;
  end if;

  select b.booking_addon_total_ore into v_stored_total
  from public.bookings b
  where b.booking_id = v_booking_id;

  select coalesce(sum(a.booking_addon_total_ore), 0) into v_line_sum
  from public.booking_addons a
  where a.booking_addon_booking_id = v_booking_id;

  if v_line_sum is distinct from v_stored_total then
    update public.bookings b
    set booking_addon_total_ore = v_line_sum,
        booking_expected_total_ore =
          b.booking_expected_total_ore + (v_line_sum - v_stored_total)
    where b.booking_id = v_booking_id;
  end if;

  return null;
end;
$$;

create trigger booking_addons_sync_totals
  after insert or update or delete on public.booking_addons
  for each row
  execute function public.sync_booking_addon_totals();
