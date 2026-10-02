// Read-side for the member booking overview (#8). The caller supplies the
// company id after requireOwnCompany() has rejected admin sessions; RLS still
// remains the final ownership check on every query. The waived flag (#5)
// reads a fee as no fee, and the live fee for the cancel flow is computed
// here, at load, for confirmed upcoming bookings only.
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { cancellationFeeAt } from "@/lib/bookings/cancellation";
import {
  outstandingInvoicesFilter,
  upcomingBookingsFilter,
} from "@/lib/bookings/filters";
import { bookingPriceOverview } from "@/lib/bookings/new-booking";
import {
  manualAmountsTotalOre,
  type OutstandingInvoiceRow,
  outstandingInvoiceBasisOre,
} from "@/lib/domain/booking-invoicing";
import type {
  BookingAddonOverview,
  BookingOverviewRow,
} from "@/lib/domain/booking-overview";
import { payableCancellationFeeOre } from "@/lib/domain/cancellation";
import type { Database } from "@/lib/supabase/database.types";

type BookingRow = Pick<
  Database["public"]["Tables"]["bookings"]["Row"],
  | "booking_addon_total_ore"
  | "booking_booker_name"
  | "booking_cancellation_fee_ore"
  | "booking_cancellation_fee_waived"
  | "booking_discount_percent"
  | "booking_end_at"
  | "booking_expected_total_ore"
  | "booking_hold_expires_at"
  | "booking_id"
  | "booking_invoicing_status"
  | "booking_number"
  | "booking_room_id"
  | "booking_room_price_ore"
  | "booking_start_at"
  | "booking_status"
> & {
  booking_addons: Array<
    Pick<
      Database["public"]["Tables"]["booking_addons"]["Row"],
      | "booking_addon_addon_id"
      | "booking_addon_quantity"
      | "booking_addon_total_ore"
    > & { addons: { addon_name: string } | null }
  >;
  manual_amounts: Array<{
    manual_amount_amount_ore: number;
    manual_amount_created_at: string;
    manual_amount_id: string;
    manual_amount_note: string;
  }> | null;
  rooms: { room_name: string } | null;
};

const BOOKING_COLUMNS =
  "booking_addon_total_ore, booking_booker_name, booking_cancellation_fee_ore, booking_cancellation_fee_waived, booking_discount_percent, booking_end_at, booking_expected_total_ore, booking_hold_expires_at, booking_id, booking_invoicing_status, booking_number, booking_room_id, booking_room_price_ore, booking_start_at, booking_status";

function rowsOrThrow<T>(
  result: { data: T[] | null; error: PostgrestError | null },
  subject: string
): T[] {
  if (result.error) {
    throw new Error(`could not list ${subject}: ${result.error.message}`);
  }
  return result.data ?? [];
}

// The fee the sheet's cancel flow states (#5): only for a confirmed booking
// whose start has not passed — a past booking and a hold have nothing to
// cancel. The confirm recomputes server-side; this is the render-time
// number.
const liveCancellationFeeOre = (
  booking: BookingRow,
  now: Date
): number | null => {
  if (booking.booking_status !== "confirmed") {
    return null;
  }
  if (new Date(booking.booking_start_at).getTime() <= now.getTime()) {
    return null;
  }
  return cancellationFeeAt(booking, now);
};

function toOverviewRow(booking: BookingRow, now: Date): BookingOverviewRow {
  const roomName = booking.rooms?.room_name;
  if (!roomName) {
    throw new Error(`booking room ${booking.booking_room_id} was not found`);
  }

  const addOns: BookingAddonOverview[] = booking.booking_addons.map((line) => ({
    addonId: line.booking_addon_addon_id,
    name: line.addons?.addon_name ?? null,
    quantity: line.booking_addon_quantity,
    totalOre: line.booking_addon_total_ore,
  }));

  return {
    addOns,
    bookerName: booking.booking_booker_name,
    bookingHoldExpiresAt: booking.booking_hold_expires_at,
    bookingId: booking.booking_id,
    bookingNumber: booking.booking_number,
    bookingStartAt: booking.booking_start_at,
    bookingStatus: booking.booking_status,
    cancellationFeeOre: payableCancellationFeeOre(
      booking.booking_cancellation_fee_ore,
      booking.booking_cancellation_fee_waived
    ),
    endAt: booking.booking_end_at,
    invoicingStatus: booking.booking_invoicing_status,
    liveCancellationFeeOre: liveCancellationFeeOre(booking, now),
    price: bookingPriceOverview(booking, addOns),
    roomName,
  };
}

// One query, not three stages: the room name and every add-on line with its
// add-on name are embedded through the foreign keys, so the overview costs
// a single round trip (deployed, each sequential stage is a network hop).
export async function listOwnBookingOverview(
  supabase: SupabaseClient<Database>,
  companyId: string
): Promise<BookingOverviewRow[]> {
  // One now for the whole read: the live fee and the overview lists judge
  // the same instant, so a booking cannot land in two states.
  const now = new Date();
  const bookingResult = await supabase
    .from("bookings")
    .select(
      `${BOOKING_COLUMNS}, rooms(room_name), booking_addons(booking_addon_addon_id, booking_addon_quantity, booking_addon_total_ore, addons(addon_name)), manual_amounts(manual_amount_amount_ore, manual_amount_created_at, manual_amount_id, manual_amount_note)`
    )
    .eq("booking_company_id", companyId)
    .order("booking_addon_addon_id", {
      ascending: true,
      referencedTable: "booking_addons",
    })
    .order("manual_amount_created_at", {
      ascending: true,
      referencedTable: "manual_amounts",
    })
    .order("booking_start_at", { ascending: true });
  const bookings = rowsOrThrow<BookingRow>(bookingResult, "company bookings");

  return bookings.map((booking) => toOverviewRow(booking, now));
}

// The sidebar badge on the member Bookinger item: how many bookings are
// upcoming, judged on the same terms splitBookingOverview splits at
// (lib/bookings/filters.ts) — not cancelled, start not passed, a pending
// verification only while its hold stands. RLS keeps the count inside the
// company's own rows.
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

// The shape the outstanding-invoice list reads: the booking's frozen basis,
// its manual amounts (#16), and the names the table shows, embedded through
// the foreign keys.
interface OutstandingBookingRow {
  booking_cancellation_fee_ore: number | null;
  booking_cancellation_fee_waived: boolean;
  booking_end_at: string;
  booking_expected_total_ore: number;
  booking_id: string;
  booking_number: string;
  booking_start_at: string;
  booking_status:
    | "cancelled"
    | "confirmed"
    | "expired"
    | "pending_verification";
  companies: { company_display_name: string } | null;
  manual_amounts: Array<{
    manual_amount_amount_ore: number;
    manual_amount_created_at: string;
    manual_amount_created_by: string | null;
    manual_amount_id: string;
    manual_amount_note: string;
  }> | null;
  rooms: { room_name: string } | null;
}

// An embed the foreign keys guarantee (company, room) but that RLS could
// still hide: a row without the name it must render fails loudly with the
// booking number in the message.
function requiredName(
  name: string | undefined,
  subject: string,
  bookingId: string
): string {
  if (name === undefined) {
    throw new Error(`booking ${bookingId} is missing its ${subject}`);
  }
  return name;
}

// The admins behind the manual amounts' creator ids (#16): one lookup for
// the whole list, so every entry can show who added it. Admins are
// auth users, which PostgREST cannot embed, and the admin session may read
// the registry (policies/admins.sql).
async function adminDisplayNames(
  supabase: SupabaseClient<Database>,
  adminIds: readonly (string | null)[]
): Promise<Map<string, string>> {
  const known = [...new Set(adminIds.filter((id) => id !== null))];
  if (known.length === 0) {
    return new Map();
  }
  const { data, error } = await supabase
    .from("admins")
    .select("admin_auth_user_id, admin_display_name")
    .in("admin_auth_user_id", known);
  if (error) {
    throw new Error(`could not list admins: ${error.message}`);
  }
  return new Map(
    data.map((admin) => [admin.admin_auth_user_id, admin.admin_display_name])
  );
}

// The basis rule lives in lib/domain/booking-invoicing.ts with its tests;
// this mapping only flattens the row the table shows, its manual amounts
// (ADR-0010) oldest first with their audit names.
function toOutstandingInvoiceRow(
  booking: OutstandingBookingRow,
  adminNames: ReadonlyMap<string, string>
): OutstandingInvoiceRow {
  const companyName = requiredName(
    booking.companies?.company_display_name,
    "company",
    booking.booking_id
  );
  const roomName = requiredName(
    booking.rooms?.room_name,
    "room",
    booking.booking_id
  );

  const manualAmounts = (booking.manual_amounts ?? []).map((amount) => ({
    amountOre: amount.manual_amount_amount_ore,
    createdAt: amount.manual_amount_created_at,
    createdByName: amount.manual_amount_created_by
      ? (adminNames.get(amount.manual_amount_created_by) ?? null)
      : null,
    manualAmountId: amount.manual_amount_id,
    note: amount.manual_amount_note,
  }));

  return {
    basisOre: outstandingInvoiceBasisOre({
      cancellationFeeOre: booking.booking_cancellation_fee_ore,
      expectedTotalOre: booking.booking_expected_total_ore,
      manualAmountsOre: manualAmountsTotalOre(manualAmounts),
      status: booking.booking_status,
      waived: booking.booking_cancellation_fee_waived,
    }),
    bookingEndAt: booking.booking_end_at,
    bookingId: booking.booking_id,
    bookingNumber: booking.booking_number,
    bookingStartAt: booking.booking_start_at,
    bookingStatus: booking.booking_status,
    companyName,
    manualAmounts,
    roomName,
  };
}

// The sidebar badge on the admin Bookinger item: how many ended bookings
// still wait for an invoice, across every month (lib/bookings/filters.ts
// carries the rule). RLS lets the admin session count them all.
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

// The admin Bookinger list: the same set the badge counts, one row per
// booking, newest ended first (2026-09-29). No limit: the worklist is the
// set the badge counts, and it shrinks as the admin invoices — if a tenant
// ever outgrows it, the list moves to server-side paging.
export async function listOutstandingInvoices(
  supabase: SupabaseClient<Database>,
  now = new Date()
): Promise<OutstandingInvoiceRow[]> {
  const nowIso = now.toISOString();
  const result = await supabase
    .from("bookings")
    .select(
      "booking_cancellation_fee_ore, booking_cancellation_fee_waived, booking_end_at, booking_expected_total_ore, booking_id, booking_number, booking_start_at, booking_status, rooms(room_name), companies(company_display_name), manual_amounts(manual_amount_amount_ore, manual_amount_created_at, manual_amount_created_by, manual_amount_id, manual_amount_note)"
    )
    .eq("booking_invoicing_status", "not_invoiced")
    .lt("booking_end_at", nowIso)
    .or(outstandingInvoicesFilter())
    .order("booking_end_at", { ascending: false })
    .order("booking_start_at", { ascending: false })
    .order("manual_amount_created_at", {
      ascending: true,
      referencedTable: "manual_amounts",
    });
  const bookings = rowsOrThrow<OutstandingBookingRow>(
    result,
    "outstanding invoices"
  );
  const adminNames = await adminDisplayNames(
    supabase,
    bookings.flatMap((booking) =>
      (booking.manual_amounts ?? []).map(
        (amount) => amount.manual_amount_created_by
      )
    )
  );

  return bookings.map((booking) =>
    toOutstandingInvoiceRow(booking, adminNames)
  );
}
