# Outlook one-way calendar sync

The shared `booking@thesocialhouse.dk` calendar mirrors confirmed bookings and
House Events, one-way platform → Microsoft Graph (ADR-0003, issue #13).
Outlook never writes back: nothing in the platform reads from Microsoft, and
no webhook exists in that direction.

## What is mirrored

- **Confirmed bookings** only. A hold (`pending_verification`) has no
  calendar entry; an expired or cancelled booking removes its entry.
- **House Events**, one Graph entry per event even when the event blocks
  several rooms; the rooms are joined in the location. A whole-day event
  (00:00–24:00, "Hele dagen") becomes a true all-day entry.
- Entry content (`lib/domain/outlook-event.ts`, pure and Vitest-tested):
  subject `B-YYMM-NNNN · Display name`, location = room, body = booker name,
  email, phone, headcount, reference (bookings) or the event description.
  **Practical notes are deliberately not mirrored** — they may hold health
  data (docs/compliance/gdpr-data-inventory.md); Microsoft must not receive
  them. Internal admin notes never leave the database.
- Times go out as Copenhagen wall clock with `timeZone:
  "Europe/Copenhagen"` (ADR-0021); `lib/domain/time.ts` computes the stamp.

## How a change reaches Outlook

1. Triggers mark `calendar_events.calendar_event_needs_sync = true` on every
   write to the mirrored fields: `bookings_calendar_dirty` (bookings.sql),
   `house_events_calendar_dirty` and `house_event_rooms_calendar_dirty`
   (house_events.sql), and `rooms_calendar_dirty` / `companies_calendar_dirty`
   (rooms.sql, companies.sql) when a room's or company's display name
   changes — the rename triggers are bounded to upcoming entries, so
   entries that already ended keep the name they were written with
   (`ponytail`: drop the `> now()` bounds if history must be corrected).
   Confirmed booking writes upsert the one mirror row; cancellations and
   holds re-mark it for removal. There is one mirror row
   per source item (unique FK constraints) — that plus the stored Graph id
   is the no-duplicates guarantee. Hard-deleting a house event
   (`deleteHouseEvent`) nulls the FK; the row becomes a tombstone the
   worker resolves by deleting the Graph entry and then the row.
2. Every five minutes (production only), `netlify/functions/sync-calendar.mts`
   POSTs `/api/jobs/sync-calendar` with `JOB_SECRET`.
3. The route (`app/api/jobs/sync-calendar/route.ts`) answers 503 until
   `OUTLOOK_TENANT_ID`, `OUTLOOK_CLIENT_ID` and `OUTLOOK_CLIENT_SECRET` are
   set; they exist only on the Netlify production context. With them it runs
   `lib/outlook/sync.ts` on the service-role client (allowlist entry 9 in
   `supabase.md`).
4. The worker claims dirty rows one at a time (conditional update returning
   the row's current data, so an edit landing mid-batch keeps its mark), then
   per row: create (no Graph id yet), patch (id known; a 404 recreates under
   a new id), or delete + remove the row. A failed call re-marks the row and
   never erases a stored Graph id, so the retry patches the entry it already
   has instead of creating a second one; per-row failures go to Sentry
   tagged with `calendar_event_id`. A run is bounded by an 8-second budget —
   the route is a standard Netlify function with a 10 s limit — and at most
   100 rows; the rest stay dirty for the next run. The orchestration rules
   are pinned by `lib/outlook/sync.test.ts` (in-memory fake client and
   gateway).

Auth: OAuth2 client-credentials against the Entra tenant, scope
`https://graph.microsoft.com/.default`, application permission
`Calendars.ReadWrite` on the shared mailbox. `lib/outlook/graph.ts` is the
only Microsoft Graph caller (plain fetch, no SDK) and is Vitest-tested
against stubbed fetch.

## Operations

- `.env.example` documents the three `OUTLOOK_*` variables; they are set on
  the Netlify production context only (setup-netlify-env.sh picks them up).
  The mailbox `booking@thesocialhouse.dk` is a constant in
  `lib/outlook/graph.ts` — Bilag 1 fixes it.
- Going live needs a Microsoft Entra app registration (client credentials)
  with `Calendars.ReadWrite` on the shared mailbox, granted admin consent.
  `scripts/setup-azure-outlook.sh` walks the portal and writes the three
  `OUTLOOK_*` variables to a Netlify context as secrets (develop for a
  sandbox run, production at go-live).
  Until the three variables are set, the job is off everywhere and no data
  reaches Microsoft.
- To force a run outside the schedule: `POST /api/jobs/sync-calendar` with
  `Authorization: Bearer $JOB_SECRET` — on production, or on `develop`
  where the scheduled function never fires.
- Local runs do nothing: no `OUTLOOK_*` in `.env.local` means the route
  answers 503. `lib/outlook/sync.test.ts` pins the worker's rules against an
  in-memory client and gateway; `lib/outlook/graph.test.ts` pins the Graph
  call shapes against stubbed fetch.
- If the mailbox shows a missing entry: check `calendar_events` — a row with
  `calendar_event_needs_sync` still true means the worker has not reached it
  (check the Netlify function log); no row at all means the booking is not
  confirmed or the mirror row was removed after a cancellation.

Known ceiling (`ponytail`): idempotency rests on the stored
`calendar_event_graph_event_id`. A failed write-back stores the created id
in the reclaim, so the retry patches — but if the process dies outright
between Graph's create response and the first database write, the next run
creates the entry again and the duplicate needs a manual delete in Outlook.
The window is one row-wide and the employee-visible effect is a duplicated
entry, not lost data.