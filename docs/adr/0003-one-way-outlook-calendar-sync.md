# One-way Outlook 365 calendar sync

Bookings, changes, and cancellations flow one-way from the platform to the shared `booking@thesocialhouse.dk` calendar, which also shows House Events; Outlook never writes back. Two-way sync was considered and deferred to v2.0 because it requires conflict and double-booking handling.

## Implementation decisions (#13)

- Only **confirmed** bookings are mirrored. A hold is an unverified promise, so it never gets a calendar entry; a cancellation or an expired hold removes the entry again.
- One calendar entry per source item: a House Event that blocks several rooms still shows as one entry, with the rooms joined in the location; a whole-day House Event ("Hele dagen") shows as an all-day entry.
- The entry text carries what staff need to run the meeting — booker name, work email, mobile, headcount, reference. **Practical notes never leave the platform**: they may hold health data, and Microsoft must not become a holder of it (docs/compliance/gdpr-data-inventory.md).
- "Same entry, no duplicates" is a database guarantee, not worker discipline: the `calendar_events` table keeps exactly one mirror row per source item (unique FKs) and the dirty-marking triggers in the schema files mark it on every write; the stored Graph event id is the only memory of Outlook, and the worker (`lib/outlook/sync.ts`) is a single serialized writer. Outlook is never read back.
- The mirror is switched on per environment by the `OUTLOOK_*` variables (production only); the mailbox itself is fixed by Bilag 1 and lives as a constant in `lib/outlook/graph.ts`.
