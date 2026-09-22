// Read-side for the member booking overview (#8). The caller supplies the
// company id after requireOwnCompany() has rejected admin sessions; RLS still
// remains the final ownership check on every query.
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { bookingPriceOverview } from "@/lib/bookings/new-booking";
import type {
  BookingAddonOverview,
  BookingOverviewRow,
} from "@/lib/domain/booking-overview";
import type { Database } from "@/lib/supabase/database.types";

type BookingRow = Pick<
  Database["public"]["Tables"]["bookings"]["Row"],
  | "booking_addon_total_ore"
  | "booking_booker_name"
  | "booking_cancellation_fee_ore"
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
  rooms: { room_name: string } | null;
};

const BOOKING_COLUMNS =
  "booking_addon_total_ore, booking_booker_name, booking_cancellation_fee_ore, booking_discount_percent, booking_end_at, booking_expected_total_ore, booking_hold_expires_at, booking_id, booking_invoicing_status, booking_number, booking_room_id, booking_room_price_ore, booking_start_at, booking_status";

function rowsOrThrow<T>(
  result: { data: T[] | null; error: PostgrestError | null },
  subject: string
): T[] {
  if (result.error) {
    throw new Error(`could not list ${subject}: ${result.error.message}`);
  }
  return result.data ?? [];
}

function toOverviewRow(booking: BookingRow): BookingOverviewRow {
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
    cancellationFeeOre: booking.booking_cancellation_fee_ore,
    endAt: booking.booking_end_at,
    invoicingStatus: booking.booking_invoicing_status,
    price: bookingPriceOverview(booking),
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
  const bookingResult = await supabase
    .from("bookings")
    .select(
      `${BOOKING_COLUMNS}, rooms(room_name), booking_addons(booking_addon_addon_id, booking_addon_quantity, booking_addon_total_ore, addons(addon_name))`
    )
    .eq("booking_company_id", companyId)
    .order("booking_start_at", { ascending: true });
  const bookings = rowsOrThrow<BookingRow>(bookingResult, "company bookings");

  return bookings.map(toOverviewRow);
}
