// Read-side for the member booking overview (#8). The caller supplies the
// company id after requireOwnCompany() has rejected admin sessions; RLS still
// remains the final ownership check on every query. The waived flag (#5)
// reads a fee as no fee, and the live fee for the cancel flow is computed
// here, at load, for confirmed upcoming bookings only.
import type { SupabaseClient } from "@supabase/supabase-js";
import { cancellationFeeAt } from "@/lib/bookings/cancellation";
import {
  outstandingInvoicesFilter,
  upcomingBookingsFilter,
} from "@/lib/bookings/filters";
import { bookingPriceOverview } from "@/lib/bookings/new-booking";
import { rowsOrThrow } from "@/lib/bookings/rows";
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
  | "booking_cancelled_at"
  | "booking_discount_percent"
  | "booking_end_at"
  | "booking_expected_total_ore"
  | "booking_hold_expires_at"
  | "booking_id"
  | "booking_invoice_date"
  | "booking_invoice_number"
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
    > & {
      addons: { addon_name: string; addon_description: string | null } | null;
    }
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
  "booking_addon_total_ore, booking_booker_name, booking_cancellation_fee_ore, booking_cancellation_fee_waived, booking_cancelled_at, booking_discount_percent, booking_end_at, booking_expected_total_ore, booking_hold_expires_at, booking_id, booking_invoice_date, booking_invoice_number, booking_invoicing_status, booking_number, booking_room_id, booking_room_price_ore, booking_start_at, booking_status";

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
    description: line.addons?.addon_description ?? null,
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
    cancelledAt: booking.booking_cancelled_at,
    endAt: booking.booking_end_at,
    // The invoice fields ride along (#122): the sheet shows them only
    // while the status is invoiced.
    invoiceDate: booking.booking_invoice_date,
    invoiceNumber: booking.booking_invoice_number,
    invoicingStatus: booking.booking_invoicing_status,
    liveCancellationFeeOre: liveCancellationFeeOre(booking, now),
    price: bookingPriceOverview(booking, addOns),
    roomId: booking.booking_room_id,
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
      `${BOOKING_COLUMNS}, rooms(room_name), booking_addons(booking_addon_addon_id, booking_addon_quantity, booking_addon_total_ore, addons(addon_name, addon_description)), manual_amounts(manual_amount_amount_ore, manual_amount_created_at, manual_amount_id, manual_amount_note)`
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

/** One choice in a Lokale filter. */
export interface RoomOption {
  roomId: string;
  roomName: string;
}

// The Lokale filter's choices on both Bookinger pages: every room,
// deactivated ones too, so a past booking's room stays selectable. Every
// session may read the rooms (policies/rooms.sql).
export async function listRoomOptions(
  supabase: SupabaseClient<Database>
): Promise<RoomOption[]> {
  const result = await supabase
    .from("rooms")
    .select("room_id, room_name")
    .order("room_name");
  return rowsOrThrow(result, "filter rooms").map((room) => ({
    roomId: room.room_id,
    roomName: room.room_name,
  }));
}

// The admins behind the manual amounts' creator ids (#16): one lookup for
// the whole list, so every entry can show who added it. Admins are
// auth users, which PostgREST cannot embed, and the admin session may read
// the registry (policies/admins.sql). Shared with the admin booking
// overview's rows (lib/bookings/admin-data.ts).
export async function adminDisplayNames(
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
