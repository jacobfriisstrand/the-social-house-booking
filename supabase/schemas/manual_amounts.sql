-- Manual amounts (#16, ADR-0010, Bilag 1 "Buffer og aflevering"): extra
-- time and external costs The Social House documents when a room is not
-- returned to standard. Admin assesses each amount case by case and adds
-- it with a short explanation; no automatic calculation exists in v1.0
-- (ADR-0010). Multiple rows per booking are allowed, and the sum enters
-- the booking's invoicing basis (#9). Money is integer øre, excl. VAT
-- (ADR-0019, ADR-0020); the row's creator and timestamp are the audit
-- (who/when).

create table public.manual_amounts (
  manual_amount_id uuid primary key default gen_random_uuid(),
  manual_amount_booking_id uuid not null references public.bookings (booking_id) on delete cascade,
  -- A positive extra charge: the spec invoices extra time and external
  -- costs, never credits.
  manual_amount_amount_ore integer not null check (manual_amount_amount_ore > 0),
  -- The short explanation the spec requires; an amount without one is
  -- not a documented amount.
  manual_amount_note text not null check (btrim(manual_amount_note) <> ''),
  -- The admin who added it, for the audit (who/when).
  manual_amount_created_by uuid references auth.users (id),
  manual_amount_created_at timestamptz not null default now()
);

-- The trail is read per booking, oldest first.
create index manual_amounts_booking_idx
  on public.manual_amounts (manual_amount_booking_id, manual_amount_created_at);

alter table public.manual_amounts enable row level security;

-- ---------------------------------------------------------------------------
-- Post-meeting rule (#16): a manual amount documents what a held meeting
-- cost to set right, so it can only be added to a confirmed booking whose
-- end time has passed — never while the meeting is still ahead, and never
-- on a booking that was called off or whose hold expired: nothing was
-- served, so there is nothing to document. Enforced in Postgres so every
-- write path obeys it.
create or replace function public.enforce_manual_amount_after_meeting()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.bookings b
    where b.booking_id = new.manual_amount_booking_id
      and (b.booking_status <> 'confirmed' or b.booking_end_at > now())
  ) then
    raise exception
      'a manual amount can only be added after the booking has been held'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger manual_amounts_after_meeting
  before insert on public.manual_amounts
  for each row
  execute function public.enforce_manual_amount_after_meeting();
