# Outlook one-way calendar sync

The shared `booking@thesocialhouse.dk` calendar mirrors confirmed bookings and
House Events, one-way platform → Microsoft Graph (ADR-0003, issue #13).
Outlook never writes back: nothing in the platform reads from Microsoft, and
no webhook exists in that direction.

## What is mirrored

- **Bookings by status.** A confirmed booking mirrors; a hold
  (`pending_verification`) has no calendar entry. A cancelled booking KEEPS
  its entry: the next run patches the subject to `Aflyst: Room · Company`
  and frees the slot (`showAs: free`), so the house sees what was booked and
  that the room is available again — Graph's own cancel action deletes an
  attendee-less event outright (verified live, 2026-10-14), so the marker is
  a patch, not `POST /cancel`. Restoring the booking patches the same entry
  back. An expired booking, and a cancelled booking whose entry never
  reached Outlook, removes the row (nothing to mark).
- **House Events**, one Graph entry per event even when the event blocks
  several rooms; the rooms are joined in the location. A whole-day event
  (00:00–24:00, "Hele dagen") becomes a true all-day entry.
- Entry content (`lib/domain/outlook-event.ts`, pure and Vitest-tested):
  subject `Room · Company`, location = room, body = booker name, email,
  phone, headcount, booking number, reference (when the booker gave one),
  and purchased add-ons with quantities (bookings) or the event description
  (house events).
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
   holds re-mark it for the worker to resolve (an entry is patched Aflyst or
   removed per the status rules above). There is one mirror row
   per source item (unique FK constraints) — that plus the stored Graph id
   is the no-duplicates guarantee. Hard-deleting a house event
   (`deleteHouseEvent`) nulls the FK; the row becomes a tombstone the
   worker resolves by deleting the Graph entry and then the row.
2. Every five minutes (production only), `netlify/functions/sync-calendar.mts`
   POSTs `/api/jobs/sync-calendar` with `JOB_SECRET`.
3. The route (`app/api/jobs/sync-calendar/route.ts`) answers 503 until
   `OUTLOOK_TENANT_ID`, `OUTLOOK_CLIENT_ID`, `OUTLOOK_CLIENT_SECRET` and
   `OUTLOOK_MAILBOX` are set for the context. Production carries
   `booking@thesocialhouse.dk`; the develop branch deploy (the
   `branch-deploy` context) carries the sandbox pair
   (an app registration in the sandbox tenant, the developer's own
   tenant-hosted mailbox) for
   test runs; locally the sandbox set may be copied into `.env.local` for a
   deliberate end-to-end test, and the production
   pair must never go local. With them it
   runs `lib/outlook/sync.ts` on the service-role client (allowlist entry 9
   in `supabase.md`).
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

- `.env.example` documents the four `OUTLOOK_*` variables; they are set on
  Netlify contexts only, never locally (setup-netlify-env.sh picks up the
  production set). The mailbox is `OUTLOOK_MAILBOX`, not a constant:
  production `booking@thesocialhouse.dk` — Bilag 1 fixes the production
  value — and the develop branch deploy the developer's own tenant-hosted
  sandbox mailbox.
- Going live needs a Microsoft Entra app registration (client credentials)
  with `Calendars.ReadWrite` on the shared mailbox, granted admin consent.
  `scripts/setup-azure-outlook.sh` walks the portal, proves the registration
  with a direct token request plus a throwaway Graph event — the job routes
  sit behind Netlify visitor protection until deploy.md go-live item 1, so a
  hand-POST to `/api/jobs/*` 401s regardless — and writes the four
  `OUTLOOK_*` variables to a Netlify context: the sandbox set on the develop
  branch deploy, the production set at go-live.
  Until the four variables are set on a context, the job is off there and no
  data reaches Microsoft.
- To force a run outside the schedule: `POST /api/jobs/sync-calendar` with
  `Authorization: Bearer $JOB_SECRET` — on production, on the develop branch
  deploy (once visitor protection is off), or locally against the values in
  `.env.local`.
- First-run backfill pace (observed locally, 2026-10-14): the 8 s budget
  writes ~35–40 Graph entries per run (906 seed items took 26 runs, ~3.5
  minutes of driven runs); on the five-minute schedule a full initial
  backfill therefore takes about two hours to reach Outlook.
- Local runs do nothing until the sandbox set is deliberately copied into
  `.env.local` (`.env.example` documents when that is safe: sandbox pair
  only, never the production pair); without them the route
  answers 503, and on production the route refuses any mailbox other than
  `booking@thesocialhouse.dk` (Bilag 1). `lib/outlook/sync.test.ts` pins the
  worker's rules against an in-memory client and gateway;
  `lib/outlook/graph.test.ts` pins the Graph call shapes against stubbed
  fetch; `app/api/jobs/sync-calendar/route.test.ts` pins the gate.
- If the mailbox shows a missing entry: check `calendar_events` — a row with
  `calendar_event_needs_sync` still true means the worker has not reached it
  (check the Netlify function log); no row at all means the booking is a
  hold or expired, or was cancelled before its entry ever reached Outlook.
  A cancelled booking whose entry does not yet show the `Aflyst:` mark is
  the same "worker has not reached it" case.

Known ceiling (`ponytail`): idempotency rests on the stored
`calendar_event_graph_event_id`. A failed write-back stores the created id
in the reclaim, so the retry patches — but if the process dies outright
between Graph's create response and the first database write, the next run
creates the entry again and the duplicate needs a manual delete in Outlook.
The window is one row-wide and the employee-visible effect is a duplicated
entry, not lost data.