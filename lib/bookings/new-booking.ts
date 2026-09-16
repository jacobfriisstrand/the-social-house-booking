// Shared by the company's hold (#2) and admin's direct booking (#14): the
// room and add-on lookup with the opening-hours fit (#4), the insert row
// with its price snapshot, the add-on rows, the step type both flows chain
// on, and the Postgres error code an unavailable slot raises.
import { totalAddOnsOre } from "@/lib/domain/addons";
import { bufferEndAt } from "@/lib/domain/buffer";
import { bookingWithinOpeningHours } from "@/lib/domain/opening-hours";
import { buildSnapshot } from "@/lib/domain/snapshot";
import { hoursBetween } from "@/lib/domain/time";
import type { Database } from "@/lib/supabase/database.types";
import type { createClient } from "@/lib/supabase/server";
import type { CreateHoldValues } from "@/lib/validation/booking";
import type { FormError } from "@/lib/validation/form-state";
import { messages } from "@/messages/da";
import { loadRoomOpening } from "./availability";

const { errors } = messages.booking;

// Postgres exclusion_violation: the no-overlap constraint and the
// house-event triggers (#24) both raise it.
export const EXCLUSION_VIOLATION = "23P01";

export type SessionClient = Awaited<ReturnType<typeof createClient>>;

// Either a value or the error state to return to the form.
export type Step<T> =
  | { ok: true; value: T }
  | { ok: false; state: FormError<never> };

export type BookingInput = Pick<
  CreateHoldValues,
  "addonIds" | "endAt" | "participantCount" | "roomId" | "startAt"
>;

export interface BookingAddon {
  addonId: string;
  priceOre: number;
  pricingModel: "fixed" | "per_participant";
}

// An active room with room for the participants, open for the period, and
// the add-ons the booker picked from its list.
export interface BookableRoom {
  addons: BookingAddon[];
  hourlyPriceOre: number;
}

export interface NewBooking {
  bookingId: string;
  bookingNumber: string;
}

const fail = (
  error: string,
  fieldErrors?: FormError<never>["fieldErrors"]
): Step<never> => ({
  ok: false,
  state: { error, fieldErrors, status: "error" },
});

async function findRoom(
  supabase: SessionClient,
  input: BookingInput
): Promise<Step<number>> {
  const room = await supabase
    .from("rooms")
    .select("room_capacity, room_is_active, room_hourly_price_ore")
    .eq("room_id", input.roomId)
    .maybeSingle();
  if (!room.data?.room_is_active) {
    return fail(errors.roomNotFound);
  }
  if (room.data.room_capacity < input.participantCount) {
    return fail(errors.roomCapacity, {
      participantCount: [errors.roomCapacity],
    });
  }
  return { ok: true, value: room.data.room_hourly_price_ore };
}

// The booking and its buffer must fit the room's opening hours (issue #4);
// the database does not know the hours, so this is the only check.
async function assertOpen(
  supabase: SessionClient,
  input: BookingInput
): Promise<Step<undefined>> {
  const opening = await loadRoomOpening(supabase, input.roomId);
  const fits = bookingWithinOpeningHours(
    new Date(input.startAt),
    bufferEndAt(new Date(input.endAt)),
    opening.weekly,
    opening.specialDays
  );
  if (!fits) {
    return fail(errors.outsideOpeningHours, {
      startAt: [errors.outsideOpeningHours],
    });
  }
  return { ok: true, value: undefined };
}

// The active add-ons among `wanted` that the room offers.
async function loadRoomAddons(
  supabase: SessionClient,
  roomId: string,
  wanted: string[]
): Promise<BookingAddon[]> {
  const [links, addons] = await Promise.all([
    supabase
      .from("room_addons")
      .select("room_addon_addon_id")
      .eq("room_addon_room_id", roomId)
      .in("room_addon_addon_id", wanted),
    supabase
      .from("addons")
      .select("addon_id, addon_price_ore, addon_pricing_model")
      .eq("addon_is_active", true)
      .in("addon_id", wanted),
  ]);
  const linked = new Set(
    (links.data ?? []).map((link) => link.room_addon_addon_id)
  );
  return (addons.data ?? [])
    .filter((addon) => linked.has(addon.addon_id))
    .map((addon) => ({
      addonId: addon.addon_id,
      priceOre: addon.addon_price_ore,
      pricingModel: addon.addon_pricing_model,
    }));
}

// Every picked add-on must be active and offered by the room.
async function findRoomAddons(
  supabase: SessionClient,
  input: BookingInput
): Promise<Step<BookingAddon[]>> {
  const wanted = [...new Set(input.addonIds)];
  if (wanted.length === 0) {
    return { ok: true, value: [] };
  }
  const addons = await loadRoomAddons(supabase, input.roomId, wanted);
  if (addons.length !== wanted.length) {
    return fail(errors.addonInvalid, { addonIds: [errors.addonInvalid] });
  }
  return { ok: true, value: addons };
}

export async function findBookableRoom(
  supabase: SessionClient,
  input: BookingInput
): Promise<Step<BookableRoom>> {
  const price = await findRoom(supabase, input);
  if (!price.ok) {
    return price;
  }
  const open = await assertOpen(supabase, input);
  if (!open.ok) {
    return open;
  }
  const addons = await findRoomAddons(supabase, input);
  if (!addons.ok) {
    return addons;
  }
  return {
    ok: true,
    value: { addons: addons.value, hourlyPriceOre: price.value },
  };
}

type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];

// The row for a new booking: booker, slot, and the price snapshot
// (ADR-0005) from the company's discount and the add-ons (never
// discounted, ADR-0007). Status, hold expiry and company are the caller's.
export const newBookingRow = (
  input: CreateHoldValues,
  discountPercent: number,
  room: BookableRoom
): Omit<BookingInsert, "booking_company_id"> => {
  const snapshot = buildSnapshot({
    addOnsOre: totalAddOnsOre(
      room.addons.map((addon) => ({
        kind: addon.pricingModel,
        name: addon.addonId,
        priceOre: addon.priceOre,
      })),
      input.participantCount
    ),
    discountPercent,
    hours: hoursBetween(new Date(input.startAt), new Date(input.endAt)),
    roomHourlyPriceOre: room.hourlyPriceOre,
  });
  return {
    booking_addon_total_ore: snapshot.addOnsOre,
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

// The database rejects an overlapping slot (exclusion constraint and the
// house-event trigger), so no separate availability query runs first.
export async function insertBooking(
  supabase: SessionClient,
  row: BookingInsert
): Promise<Step<NewBooking>> {
  const inserted = await supabase
    .from("bookings")
    .insert(row)
    .select("booking_id, booking_number")
    .single();
  if (inserted.error) {
    return fail(
      inserted.error.code === EXCLUSION_VIOLATION
        ? errors.slotTaken
        : errors.createFailed
    );
  }
  return {
    ok: true,
    value: {
      bookingId: inserted.data.booking_id,
      bookingNumber: inserted.data.booking_number,
    },
  };
}

// Add-on snapshot rows (ADR-0005). Written while the booking is still
// pending: the booking_addons_snapshot_immutable trigger refuses them on a
// confirmed booking.
export async function insertBookingAddons(
  supabase: SessionClient,
  bookingId: string,
  addons: BookingAddon[]
): Promise<boolean> {
  if (addons.length === 0) {
    return true;
  }
  const { error } = await supabase.from("booking_addons").insert(
    addons.map((addon) => ({
      booking_addon_addon_id: addon.addonId,
      booking_addon_booking_id: bookingId,
      booking_addon_price_ore: addon.priceOre,
    }))
  );
  return error === null;
}

// Frees the room: the exclusion constraint and calendar_entries ignore
// expired rows (#24).
export async function expireBooking(
  supabase: SessionClient,
  bookingId: string
): Promise<void> {
  await supabase
    .from("bookings")
    .update({ booking_status: "expired" })
    .eq("booking_id", bookingId)
    .eq("booking_status", "pending_verification");
}
