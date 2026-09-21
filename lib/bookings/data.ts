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
>;

type BookingAddonRow = Pick<
  Database["public"]["Tables"]["booking_addons"]["Row"],
  | "booking_addon_addon_id"
  | "booking_addon_booking_id"
  | "booking_addon_quantity"
  | "booking_addon_total_ore"
>;

type RoomRow = Pick<
  Database["public"]["Tables"]["rooms"]["Row"],
  "room_id" | "room_name"
>;

type AddonRow = Pick<
  Database["public"]["Tables"]["addons"]["Row"],
  "addon_id" | "addon_name"
>;

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

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function groupAddOnsByBooking(
  bookingAddons: BookingAddonRow[]
): Map<string, BookingAddonRow[]> {
  const addOnsByBooking = new Map<string, BookingAddonRow[]>();
  for (const bookingAddon of bookingAddons) {
    const lines =
      addOnsByBooking.get(bookingAddon.booking_addon_booking_id) ?? [];
    lines.push(bookingAddon);
    addOnsByBooking.set(bookingAddon.booking_addon_booking_id, lines);
  }
  return addOnsByBooking;
}

function toOverviewRow(
  booking: BookingRow,
  roomNames: Map<string, string>,
  addonNames: Map<string, string>,
  addOnsByBooking: Map<string, BookingAddonRow[]>
): BookingOverviewRow {
  const roomName = roomNames.get(booking.booking_room_id);
  if (!roomName) {
    throw new Error(`booking room ${booking.booking_room_id} was not found`);
  }

  const addOns: BookingAddonOverview[] = (
    addOnsByBooking.get(booking.booking_id) ?? []
  ).map((bookingAddon) => ({
    addonId: bookingAddon.booking_addon_addon_id,
    name: addonNames.get(bookingAddon.booking_addon_addon_id) ?? null,
    quantity: bookingAddon.booking_addon_quantity,
    totalOre: bookingAddon.booking_addon_total_ore,
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

export async function listOwnBookingOverview(
  supabase: SupabaseClient<Database>,
  companyId: string
): Promise<BookingOverviewRow[]> {
  const bookingResult = await supabase
    .from("bookings")
    .select(BOOKING_COLUMNS)
    .eq("booking_company_id", companyId)
    .order("booking_start_at", { ascending: true });
  const bookings = rowsOrThrow<BookingRow>(bookingResult, "company bookings");

  if (bookings.length === 0) {
    return [];
  }

  const bookingIds = bookings.map((booking) => booking.booking_id);
  const roomIds = unique(bookings.map((booking) => booking.booking_room_id));
  const [roomResult, bookingAddonResult] = await Promise.all([
    supabase.from("rooms").select("room_id, room_name").in("room_id", roomIds),
    supabase
      .from("booking_addons")
      .select(
        "booking_addon_addon_id, booking_addon_booking_id, booking_addon_quantity, booking_addon_total_ore"
      )
      .in("booking_addon_booking_id", bookingIds)
      .order("booking_addon_addon_id"),
  ]);
  const rooms = rowsOrThrow<RoomRow>(roomResult, "booking rooms");
  const bookingAddons = rowsOrThrow<BookingAddonRow>(
    bookingAddonResult,
    "booking add-ons"
  );

  const addonIds = unique(
    bookingAddons.map((bookingAddon) => bookingAddon.booking_addon_addon_id)
  );
  const addonResult =
    addonIds.length === 0
      ? null
      : await supabase
          .from("addons")
          .select("addon_id, addon_name")
          .in("addon_id", addonIds);
  const addons = addonResult
    ? rowsOrThrow<AddonRow>(addonResult, "booking add-on names")
    : [];

  const roomNames = new Map(
    rooms.map((room) => [room.room_id, room.room_name])
  );
  const addonNames = new Map(
    addons.map((addon) => [addon.addon_id, addon.addon_name])
  );
  const addOnsByBooking = groupAddOnsByBooking(bookingAddons);

  return bookings.map((booking) =>
    toOverviewRow(booking, roomNames, addonNames, addOnsByBooking)
  );
}
