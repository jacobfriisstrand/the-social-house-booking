-- Backfill for the Outlook mirror (#13): mirror rows for the confirmed
-- bookings and house events that existed before the calendar_events table
-- (20261013132823_calendar_events.sql). The dirty-marking triggers cover
-- every write from here on; this only seeds the queue, so go-live mirrors
-- the existing rows too. Idempotent via the unique mirror-row constraints.

insert into public.calendar_events (calendar_event_booking_id, calendar_event_needs_sync)
select booking_id, true
from public.bookings
where booking_status = 'confirmed'
on conflict (calendar_event_booking_id) do nothing;

insert into public.calendar_events (calendar_event_house_event_id, calendar_event_needs_sync)
select house_event_id, true
from public.house_events
on conflict (calendar_event_house_event_id) do nothing;