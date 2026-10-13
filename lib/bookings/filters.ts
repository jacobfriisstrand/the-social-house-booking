// The PostgREST logical-tree filters behind the count badges
// (lib/bookings/data.ts), as pure strings so the badge rules are testable
// without a database. Timestamp values are double-quoted: the logical-tree
// parser reads the rest of the token as the value, and the quote keeps the
// ISO instant unambiguous.
import type { AdminBookingState } from "@/lib/domain/admin-bookings";

// Kommende (member badge): not cancelled, start not passed, and a pending
// verification only while its hold still stands — the same split
// splitBookingOverview makes at read time (lib/domain/booking-overview.ts).
export function upcomingBookingsFilter(nowIso: string): string {
  return `and(booking_status.eq.confirmed,booking_start_at.gte."${nowIso}"),and(booking_status.eq.pending_verification,booking_hold_expires_at.gt."${nowIso}")`;
}

// The admin invoicing worklist — the sidebar badge and the worklist
// query (countOutstandingInvoices, listOutstandingInvoices): ended
// bookings without an invoice. A confirmed booking waits as
// a whole; a cancelled one only while a payable cancellation fee remains
// (ADR-0006) — a cancelled booking without a fee has nothing to invoice.
// The invoicing status and the end instant chain on the query; this string
// carries the status split. House Events are not bookings and an expired
// hold has nothing to invoice, so neither enters the set.
export function outstandingInvoicesFilter(): string {
  return "and(booking_status.eq.confirmed),and(booking_status.eq.cancelled,booking_cancellation_fee_ore.gt.0,booking_cancellation_fee_waived.is.false)";
}

// The admin overview's Bookingstatus filter: the ticked buckets as one
// or-filter — cancelled, or a confirmed booking that has (not) finished.
// The cut is the END instant: "afsluttede" means ended, so a booking that
// started but runs tonight is still kommende. Deliberately unlike the
// member tabs' start-based split (splitBookingOverview): the admin cares
// about finished work, the member about not-started plans. Called with
// two or more ticked buckets only: the PostgREST or-list parses a lone
// and(...) as a parse error, so a single bucket chains as plain filters
// instead (lib/bookings/admin-data.ts). Empty selection returns "" and
// the caller skips the filter; the fixed condition order keeps the
// string testable.
export function adminBookingStatesFilter(
  states: readonly AdminBookingState[],
  nowIso: string
): string {
  const conditions: string[] = [];
  if (states.includes("upcoming")) {
    conditions.push(
      `and(booking_status.eq.confirmed,booking_end_at.gte."${nowIso}")`
    );
  }
  if (states.includes("finished")) {
    conditions.push(
      `and(booking_status.eq.confirmed,booking_end_at.lt."${nowIso}")`
    );
  }
  if (states.includes("cancelled")) {
    conditions.push("booking_status.eq.cancelled");
  }
  return conditions.join(",");
}

// The same filter's cuts for the admin month view: the time buckets cut
// on the entries' ends — a running entry is still kommende. The cuts
// join as alternatives; chaining them (a gte AND a lt on the end) would
// match nothing. A cancelled bucket drops out — the calendar reads no
// cancelled bookings — so a cancelled-only selection returns "" and the
// caller empties the month view.
export function adminCalendarStateCuts(
  states: readonly AdminBookingState[],
  nowIso: string
): string {
  const cuts: string[] = [];
  if (states.includes("upcoming")) {
    cuts.push(`booking_end_at.gte."${nowIso}"`);
  }
  if (states.includes("finished")) {
    cuts.push(`booking_end_at.lt."${nowIso}"`);
  }
  return cuts.join(",");
}
