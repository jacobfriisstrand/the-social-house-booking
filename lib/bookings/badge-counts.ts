// The two sidebar badge counts (#55): each is one head-count query the
// layouts pass to the AppShell as the badge number on the Bookinger nav
// item. The count rules are pure strings in lib/bookings/filters.ts.
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  outstandingInvoicesFilter,
  upcomingBookingsFilter,
} from "@/lib/bookings/filters";
import type { Database } from "@/lib/supabase/database.types";

// The sidebar badge on the member Bookinger item: how many bookings the
// page's Kommende bucket holds (bookingStateBucket in
// lib/domain/booking-overview.ts, the SQL in lib/bookings/filters.ts) —
// not cancelled, end not passed, a pending verification only while its
// hold stands. RLS keeps the count inside the company's own rows.
export async function countUpcomingOwnBookings(
  supabase: SupabaseClient<Database>,
  companyId: string,
  now = new Date()
): Promise<number> {
  const result = await supabase
    .from("bookings")
    .select("booking_id", { count: "exact", head: true })
    .eq("booking_company_id", companyId)
    .or(upcomingBookingsFilter(now.toISOString()));
  if (result.error) {
    throw new Error(
      `could not count upcoming bookings: ${result.error.message}`
    );
  }
  return result.count ?? 0;
}

// The sidebar badge on the admin Bookinger item: every invoiceable booking
// that has ended and still waits for an invoice. The status split
// (confirmed, or cancelled with a payable fee) holds
// (lib/bookings/filters.ts); the end instant chains on the query as a
// strict less-than — the same cut isInvoiceReadyEnd states on the domain
// side (lib/domain/admin-bookings.ts), so the badge and the cash-flow
// total cannot drift (ADR-0005's shared set). RLS lets the admin session
// count them all.
export async function countOutstandingInvoices(
  supabase: SupabaseClient<Database>,
  now = new Date()
): Promise<number> {
  const result = await supabase
    .from("bookings")
    .select("booking_id", { count: "exact", head: true })
    .eq("booking_invoicing_status", "not_invoiced")
    .lt("booking_end_at", now.toISOString())
    .or(outstandingInvoicesFilter());
  if (result.error) {
    throw new Error(
      `could not count outstanding invoices: ${result.error.message}`
    );
  }
  return result.count ?? 0;
}
