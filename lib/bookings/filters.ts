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
