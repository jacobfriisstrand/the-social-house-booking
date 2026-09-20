// Shared by the company's hold (#2) and admin's direct booking (#14): the
// room lookup, the insert row with its price snapshot, the frozen price
// overview (#6) read back from that snapshot, the step type both flows
// chain on, and the Postgres error code an unavailable slot raises.
import {
  type PriceOverviewModel,
  priceOverview,
} from "@/lib/domain/price-overview";
import { buildSnapshot } from "@/lib/domain/snapshot";
import { hoursBetween } from "@/lib/domain/time";
import type { Database } from "@/lib/supabase/database.types";
import type { createClient } from "@/lib/supabase/server";
import type { CreateHoldValues } from "@/lib/validation/booking";
import type { FormError } from "@/lib/validation/form-state";
import { messages } from "@/messages/da";

const { errors } = messages.booking;

// Postgres exclusion_violation: the no-overlap constraint and the
// house-event triggers (#24) both raise it.
export const EXCLUSION_VIOLATION = "23P01";

export type SessionClient = Awaited<ReturnType<typeof createClient>>;

// Either a value or the error state to return to the form.
export type Step<T> =
  | { ok: true; value: T }
  | { ok: false; state: FormError<never> };

// An active room with room for the participants; the hourly price is what
// the snapshot needs.
export async function findBookableRoom(
  supabase: SessionClient,
  input: { participantCount: number; roomId: string }
): Promise<Step<number>> {
  const room = await supabase
    .from("rooms")
    .select("room_capacity, room_is_active, room_hourly_price_ore")
    .eq("room_id", input.roomId)
    .maybeSingle();
  if (!room.data?.room_is_active) {
    return {
      ok: false,
      state: { error: errors.roomNotFound, status: "error" },
    };
  }
  if (room.data.room_capacity < input.participantCount) {
    return {
      ok: false,
      state: {
        error: errors.roomCapacity,
        fieldErrors: { participantCount: [errors.roomCapacity] },
        status: "error",
      },
    };
  }
  return { ok: true, value: room.data.room_hourly_price_ore };
}

type BookingInsert = Omit<
  Database["public"]["Tables"]["bookings"]["Insert"],
  "booking_company_id"
>;

// The row for a new booking: booker, slot, and the price snapshot
// (ADR-0005) from the company's discount. The add-on lines arrive right
// after the insert and Postgres moves booking_addon_total_ore and
// booking_expected_total_ore by their sum (booking_addons_sync_totals), so
// the snapshot starts at member price + 0 and ends at member price + the
// lines. Status, hold expiry, catering acceptance and company are the
// caller's.
export const newBookingRow = (
  input: CreateHoldValues,
  discountPercent: number,
  roomHourlyPriceOre: number
): BookingInsert => {
  const snapshot = buildSnapshot({
    addOnsOre: 0,
    discountPercent,
    hours: hoursBetween(new Date(input.startAt), new Date(input.endAt)),
    roomHourlyPriceOre,
  });
  return {
    booking_booker_email: input.bookerEmail,
    booking_booker_name: input.bookerName,
    booking_booker_phone: input.bookerPhone,
    booking_discount_percent: snapshot.discountPercent,
    booking_end_at: input.endAt,
    booking_expected_total_ore: snapshot.totalOre,
    // Overwritten by the bookings_assign_number trigger (#24).
    booking_number: "",
    booking_participant_count: input.participantCount,
    booking_room_id: input.roomId,
    booking_room_price_ore: snapshot.roomHourlyPriceOre,
    booking_start_at: input.startAt,
  };
};

// The columns a price overview is read from: the snapshot only. Later
// reads of a confirmed booking never recompute from live room or company
// prices (#6, ADR-0005).
export interface BookingPriceRow {
  booking_addon_total_ore: number;
  booking_discount_percent: number;
  booking_end_at: string;
  booking_expected_total_ore: number;
  booking_room_price_ore: number;
  booking_start_at: string;
}

const SNAPSHOT_COLUMNS =
  "booking_addon_total_ore, booking_discount_percent, booking_end_at, booking_expected_total_ore, booking_room_price_ore, booking_start_at";

// The frozen overview of a booking, from its snapshot columns. The total
// is the stored booking_expected_total_ore; room price, discount and
// hours are the frozen inputs the snapshot was built from.
export const bookingPriceOverview = (
  row: BookingPriceRow
): PriceOverviewModel =>
  priceOverview({
    addOnsOre: row.booking_addon_total_ore,
    discountPercent: row.booking_discount_percent,
    hours: hoursBetween(
      new Date(row.booking_start_at),
      new Date(row.booking_end_at)
    ),
    roomHourlyPriceOre: row.booking_room_price_ore,
    totalOre: row.booking_expected_total_ore,
  });

// The snapshot columns of one booking, read back after the add-on lines
// are written so the overview includes them (the sync trigger has updated
// the totals by then). Null when the row is gone or not readable (RLS).
export async function readBookingPriceRow(
  supabase: SessionClient,
  bookingId: string
): Promise<BookingPriceRow | null> {
  const { data } = await supabase
    .from("bookings")
    .select(SNAPSHOT_COLUMNS)
    .eq("booking_id", bookingId)
    .maybeSingle();
  return data;
}
