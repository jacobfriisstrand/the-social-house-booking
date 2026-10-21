// Read-side for the member booking overview (#8). The caller supplies the
// company id after requireOwnCompany() has rejected admin sessions; RLS still
// remains the final ownership check on every query. The waived flag (#5)
// reads a fee as no fee, and the live fee for the cancel flow is computed
// here, at load, for confirmed upcoming bookings only.
import type { SupabaseClient } from "@supabase/supabase-js";
import { cancellationFeeAt } from "@/lib/bookings/cancellation";
import { bookingPriceOverview } from "@/lib/bookings/new-booking";
import {
  type BookingAddonEmbedRow,
  bookingAddonOverviewLines,
  type ManualAmountEmbedRow,
  rowsOrThrow,
} from "@/lib/bookings/rows";
import type { BookingOverviewRow } from "@/lib/domain/booking-overview";
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
  booking_addons: BookingAddonEmbedRow[];
  manual_amounts: ManualAmountEmbedRow[] | null;
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

  const addOns = bookingAddonOverviewLines(booking.booking_addons);

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
