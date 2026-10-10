// Read-side for Statistik (#10): every confirmed or cancelled booking whose
// meeting starts in the selected month's year or the December before it,
// with the company's membership status and the sum of its manual amounts.
// RLS lets the admin session read every company's rows; the totals are
// computed in lib/domain/statistics.ts.
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type StatisticsBooking,
  statisticsWindow,
} from "@/lib/domain/statistics";
import type { Database } from "@/lib/supabase/database.types";

// PostgREST returns at most max_rows (1000, supabase/config.toml) per
// request, and a busy year can hold more, so the read pages.
const PAGE_ROWS = 1000;

const COLUMNS =
  "booking_addon_total_ore, booking_cancellation_fee_ore, booking_cancellation_fee_waived, booking_end_at, booking_expected_total_ore, booking_id, booking_invoicing_status, booking_start_at, booking_status, companies(company_membership_status), manual_amounts(manual_amount_amount_ore)";

function pageQuery(
  supabase: SupabaseClient<Database>,
  month: string,
  offset: number
) {
  const { from, to } = statisticsWindow(month);
  return supabase
    .from("bookings")
    .select(COLUMNS, { count: "exact" })
    .in("booking_status", ["confirmed", "cancelled"])
    .gte("booking_start_at", from.toISOString())
    .lt("booking_start_at", to.toISOString())
    .order("booking_start_at", { ascending: true })
    .order("booking_id", { ascending: true })
    .range(offset, offset + PAGE_ROWS - 1);
}

type PageResult = Awaited<ReturnType<typeof pageQuery>>;
type Row = NonNullable<PageResult["data"]>[number];

function rowsOrThrow(result: PageResult): Row[] {
  if (result.error) {
    throw new Error(
      `could not list statistics bookings: ${result.error.message}`
    );
  }
  return result.data;
}

function requiredMembership(row: Row): StatisticsBooking["membership"] {
  const membership = row.companies?.company_membership_status;
  if (membership === undefined) {
    throw new Error(`booking ${row.booking_id} is missing its company`);
  }
  return membership;
}

// The query asks for these two statuses only; this narrows the type.
function heldOrCancelled(row: Row): StatisticsBooking["status"] {
  if (
    row.booking_status === "confirmed" ||
    row.booking_status === "cancelled"
  ) {
    return row.booking_status;
  }
  throw new Error(`booking ${row.booking_id} is neither held nor cancelled`);
}

function toStatisticsBooking(row: Row): StatisticsBooking {
  return {
    addonTotalOre: row.booking_addon_total_ore,
    cancellationFeeOre: row.booking_cancellation_fee_ore,
    cancellationFeeWaived: row.booking_cancellation_fee_waived,
    endAt: row.booking_end_at,
    expectedTotalOre: row.booking_expected_total_ore,
    invoicingStatus: row.booking_invoicing_status,
    manualAmountsOre: row.manual_amounts.reduce(
      (sum, amount) => sum + amount.manual_amount_amount_ore,
      0
    ),
    membership: requiredMembership(row),
    startAt: row.booking_start_at,
    status: heldOrCancelled(row),
  };
}

// The first page carries the total count, so a year under the limit costs
// one round trip and a larger one fetches its remaining pages in parallel.
export async function listStatisticsBookings(
  supabase: SupabaseClient<Database>,
  month: string
): Promise<StatisticsBooking[]> {
  const first = await pageQuery(supabase, month, 0);
  const rows = rowsOrThrow(first);
  const offsets: number[] = [];
  for (
    let offset = PAGE_ROWS;
    offset < (first.count ?? 0);
    offset += PAGE_ROWS
  ) {
    offsets.push(offset);
  }
  const rest = await Promise.all(
    offsets.map((offset) => pageQuery(supabase, month, offset))
  );
  return [...rows, ...rest.flatMap(rowsOrThrow)].map(toStatisticsBooking);
}
