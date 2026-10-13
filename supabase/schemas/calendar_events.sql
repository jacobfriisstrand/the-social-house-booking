-- The Outlook 365 mirror (#13, ADR-0003): one row per item mirrored to the
-- shared booking@thesocialhouse.dk calendar — a confirmed booking or a house
-- event. Not the member-visible calendar: that projection is the
-- calendar_entries view (calendar_entries.sql); this table is internal sync
-- state. The row is the sync queue: triggers on bookings/house_events (in
-- their schema files) mark calendar_event_needs_sync on every write, the
-- worker (lib/outlook/sync.ts) claims dirty rows, creates/updates/deletes
-- the Graph event, and stores calendar_event_graph_event_id for
-- idempotency. One unique mirror row per source item is the no-duplicates
-- guarantee; the stored Graph id is the same-entry guarantee. Outlook never
-- writes back: nothing here or in the worker reads from Microsoft.
--
-- Internal sync state: RLS is enabled with no policies, so no login —
-- company or admin — sees or writes a row. The worker runs on the service
-- key (allowlist in docs/agents/supabase.md); the dirty-marking triggers run
-- SECURITY DEFINER. A hard delete of a source row (house events have one,
-- lib/house-events/actions.ts) nulls the FK; the tombstone trigger below
-- re-marks the row and the worker resolves it by deleting the Graph entry
-- and then the row. Bookings are never hard-deleted, but the FK behaves the
-- same way if one ever is.

create table public.calendar_events (
  calendar_event_id uuid primary key default gen_random_uuid(),
  calendar_event_booking_id uuid references public.bookings (booking_id)
    on delete set null (calendar_event_booking_id),
  calendar_event_house_event_id uuid references public.house_events (house_event_id)
    on delete set null (calendar_event_house_event_id),
  calendar_event_graph_event_id text,
  calendar_event_last_synced_at timestamptz,
  calendar_event_needs_sync boolean not null default true,
  calendar_event_created_at timestamptz not null default now(),
  calendar_event_updated_at timestamptz not null default now(),
  -- A tombstone (both null) is legitimate between a source delete and the
  -- worker's cleanup; mirroring both sources on one Graph entry is not.
  constraint calendar_events_source_exclusive
    check (num_nonnulls(calendar_event_booking_id, calendar_event_house_event_id) <= 1),
  constraint calendar_events_booking_key unique (calendar_event_booking_id),
  constraint calendar_events_house_event_key unique (calendar_event_house_event_id)
);

-- The worker claims dirty rows; the partial index keeps that read free no
-- matter how much history the table accumulates.
create index calendar_events_dirty_idx
  on public.calendar_events (calendar_event_id)
  where calendar_event_needs_sync;

alter table public.calendar_events enable row level security;

-- Tombstone: the ON DELETE SET NULL actions above are the deletion signal
-- for a hard-deleted source row. A before trigger can carry the change into
-- the same write.
create or replace function public.mark_calendar_event_orphaned()
returns trigger
language plpgsql
as $$
begin
  new.calendar_event_needs_sync := true;
  return new;
end;
$$;

create trigger calendar_events_source_removed
  before update of calendar_event_booking_id, calendar_event_house_event_id
  on public.calendar_events
  for each row
  when ((old.calendar_event_booking_id is not null and new.calendar_event_booking_id is null)
     or (old.calendar_event_house_event_id is not null and new.calendar_event_house_event_id is null))
  execute function public.mark_calendar_event_orphaned();