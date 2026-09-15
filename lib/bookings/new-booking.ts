// Shared by the company's hold (#2) and admin's direct booking (#14): the
// room lookup, the insert row with its price snapshot, the step type both
// flows chain on, and the Postgres error code an unavailable slot raises.
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
// (ADR-0005) from the company's discount; add-ons arrive with #7. Status,
// hold expiry and company are the caller's.
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
