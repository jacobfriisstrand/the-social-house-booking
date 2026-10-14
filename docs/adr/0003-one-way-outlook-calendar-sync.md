# One-way Outlook 365 calendar sync

Bookings, changes, and cancellations flow one-way from the platform to the shared `booking@thesocialhouse.dk` calendar, which also shows House Events; Outlook never writes back. Two-way sync was considered and deferred to v2.0 because it requires conflict and double-booking handling.

## Implementation decisions (#13)

- Only **confirmed** bookings are mirrored. A hold is an unverified promise, so it never gets a calendar entry; a cancellation or an expired hold removes the entry again.
- One calendar entry per source item: a House Event that blocks several rooms still shows as one entry, with the rooms joined in the location; a whole-day House Event ("Hele dagen") shows as an all-day entry.
- The entry text carries what staff need to run the meeting — booker name, work email, mobile, headcount, reference. **Practical notes never leave the platform**: they may hold health data, and Microsoft must not become a holder of it (docs/compliance/gdpr-data-inventory.md).
- "Same entry, no duplicates" is a database guarantee, not worker discipline: the `calendar_events` table keeps exactly one mirror row per source item (unique FKs) and the dirty-marking triggers in the schema files mark it on every write; the stored Graph event id is the only memory of Outlook, and the worker (`lib/outlook/sync.ts`) is a single serialized writer. Outlook is never read back.
- The mirror is switched on per environment by the `OUTLOOK_*` variables (production only); the mailbox itself is fixed by Bilag 1 and lives as a constant in `lib/outlook/graph.ts`.

## Amendment (2026-10-14, sandbox testing)

The mailbox moved from a code constant to the `OUTLOOK_MAILBOX` variable, set per Netlify context. Production keeps `booking@thesocialhouse.dk` — Bilag 1 still fixes the production value, and the route refuses to run on production against any other address (`OUTLOOK_PROD_MAILBOX` in `lib/outlook/graph.ts`, guard in the sync route). The develop branch deploy (the `branch-deploy` context) carries the sandbox pair (an app registration in the sandbox tenant, the developer's own tenant-hosted mailbox), so test runs write demo data to a sandbox mailbox and never touch the production calendar. Locally, only the sandbox pair may go into `.env.local` for a deliberate test; the route still answers 503 wherever a variable is missing.

## Amendment (2026-10-14, cancellation and entry content)

Two rules above are superseded, decided while testing the mirror live against the sandbox tenant:

- **A cancellation no longer removes the entry.** Graph's own cancel action (`POST /users/{mailbox}/events/{id}/cancel`) deletes an attendee-less event outright — it answered 202 and the entry then 404'd on read — and `PATCH {"isCancelled": true}` is silently ignored (HTTP 200, read-back still `false`), both verified live. So the worker instead patches the stored entry: subject `Aflyst: Room · Company` and `showAs: free`, keeping the row and the Graph id, so a later restore patches the same entry back. An expired booking or a hold still removes the entry, as does a cancelled booking whose entry never reached Outlook. Consequence: the booker's contact details stay in the Microsoft mailbox for cancelled bookings (see docs/compliance/gdpr-data-inventory.md).
- **The entry text now carries the booking number and purchased add-ons.** The subject became `Room · Company` (the number moved into the body so it stays visible), and the body lists the add-on names and quantities ("Tilkøb"). Practical notes still never leave the platform.
