# Day view only in v1.0 — amended for the admin booking overview

The calendar is a single day grid: 30-minute rows from 09:00 to 22:00, one column per room, for admins and members alike. The spec (Bilag 1, "Calendar and notice board") lists day, week and month views; week and month were deferred to a later version because the day grid already answers "is a room free now", the notice board and invoicing table cover the rest of the spec's calendar needs, and a week grid across six rooms is unreadable. Design rules for the grid are in `docs/design/DESIGN.md`.

**Amendment (2026-10-02, issue #9):** the admin booking overview brings the calendar into the invoicing view, and with it the week and month views the deferral held back. The split is now by surface:

- **Hjem (members and admins) stays day-only.** It answers "is a room free now"; nothing in the notice board needs more than today.
- **Bookinger (admin) has day, week and month**, on one page with the list, sharing the period, company, room and invoicing-status filters. The day view is the same day grid as Hjem; week and month are compact date grids — one cell per date with its bookings and House Events in start order, colour-coded like the day grid — because a 30-minute week grid across six rooms remains unreadable. A month cell shows a date's blocks, not their hours; the invoicing list next to it carries the detail.

The original reasoning stands everywhere else: one day grid for "now", and the invoicing view as the place where longer spans are read with filters and totals rather than raw room columns.

**Amendment (2026-10-07, issue #9):** the overview's day and week views are dropped again. The list carries the detail and prev / I dag / next steps the period a month at a time, so the admin page is the list and the month grid only; the 30-minute day grid stays on Hjem, and the week grid across six rooms remains unreadable.
