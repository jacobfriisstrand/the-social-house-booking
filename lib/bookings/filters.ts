// The PostgREST logical-tree filters behind the count badges
// (lib/bookings/data.ts), as pure strings so the badge rules are testable
// without a database. Timestamp values are double-quoted: the logical-tree
// parser reads the rest of the token as the value, and the quote keeps the
// ISO instant unambiguous.

// Kommende (member badge): not cancelled, start not passed, and a pending
// verification only while its hold still stands — the same split
// splitBookingOverview makes at read time (lib/domain/booking-overview.ts).
export function upcomingBookingsFilter(nowIso: string): string {
  return `and(booking_status.eq.confirmed,booking_start_at.gte."${nowIso}"),and(booking_status.eq.pending_verification,booking_hold_expires_at.gt."${nowIso}")`;
}

// The admin invoicing worklist (the sidebar badge and the /admin/bookings
// list): ended bookings without an invoice. A confirmed booking waits as
// a whole; a cancelled one only while a payable cancellation fee remains
// (ADR-0006) — a cancelled booking without a fee has nothing to invoice.
// The invoicing status and the end instant chain on the query; this string
// carries the status split. House Events are not bookings and an expired
// hold has nothing to invoice, so neither enters the set.
export function outstandingInvoicesFilter(): string {
  return "and(booking_status.eq.confirmed),and(booking_status.eq.cancelled,booking_cancellation_fee_ore.gt.0,booking_cancellation_fee_waived.is.false)";
}
