// Add-on selection on a booking (#7): the room's active add-ons as the
// domain model, and the chosen ids as booking_addons lines. The selected
// ids arrive from a form, so they are re-checked here — an id that is not
// an active add-on of the chosen room (another room's add-on, a
// deactivated one, or a forged id) fails the booking.
import type { SupabaseClient } from "@supabase/supabase-js";
import { type AddOn, type AddOnLine, addonLines } from "@/lib/domain/addons";
import type { Database } from "@/lib/supabase/database.types";
import type { FormError } from "@/lib/validation/form-state";
import { messages } from "@/messages/da";
import { findBookableRoom, type SessionClient } from "./new-booking";

const { errors } = messages.booking;

export type AddonRow = Database["public"]["Tables"]["addons"]["Row"];

export const addOnFromRow = (row: AddonRow): AddOn => ({
  addonId: row.addon_id,
  description: row.addon_description,
  name: row.addon_name,
  priceOre: row.addon_price_ore,
  pricingModel: row.addon_pricing_model,
});

// The add-ons the booking flow offers for a room: active only, in the
// admin's display order, then by name. Companies read active add-ons
// through RLS (addons_select_active_or_admin); admins see the same rows.
export async function listRoomAddOns(
  supabase: SupabaseClient<Database>,
  roomId: string
): Promise<AddOn[]> {
  const { data, error } = await supabase
    .from("room_addons")
    .select("room_addon_addon_id, addons!inner(*)")
    .eq("room_addon_room_id", roomId)
    .eq("addons.addon_is_active", true)
    .order("addon_sort_order", {
      ascending: true,
      nullsFirst: false,
      referencedTable: "addons",
    })
    .order("addon_name", { ascending: true, referencedTable: "addons" });
  if (error) {
    throw new Error(`could not list the room's add-ons: ${error.message}`);
  }
  return data.map((link) => addOnFromRow(link.addons));
}

// The booking forms' room select needs each room's offered add-ons keyed by
// room id: one lookup per room, in one place.
export async function addOnsByRoomId(
  supabase: SupabaseClient<Database>,
  roomIds: string[]
): Promise<Record<string, AddOn[]>> {
  const lists = await Promise.all(
    roomIds.map(async (roomId) => listRoomAddOns(supabase, roomId))
  );
  const byRoomId: Record<string, AddOn[]> = {};
  for (const [index, roomId] of roomIds.entries()) {
    byRoomId[roomId] = lists[index] ?? [];
  }
  return byRoomId;
}

export type AddOnSelection =
  | { ok: true; lines: AddOnLine[]; selected: AddOn[] }
  | { error: string; ok: false };

// The chosen ids → lines in the add-ons' display order (so the confirmation
// renders them stably). Duplicates collapse; unknown ids fail.
export function selectAddOnLines(
  available: AddOn[],
  selectedIds: string[],
  participantCount: number
): AddOnSelection {
  const uniqueIds = new Set(selectedIds);
  const selected = available.filter((addOn) => uniqueIds.has(addOn.addonId));
  if (selected.length !== uniqueIds.size) {
    return { error: errors.addOnInvalid, ok: false };
  }
  return { lines: addonLines(selected, participantCount), ok: true, selected };
}

export interface AddOnLineInsert {
  booking_addon_addon_id: string;
  booking_addon_booking_id: string;
  booking_addon_quantity: number;
  booking_addon_total_ore: number;
  booking_addon_unit_price_ore: number;
}

export const lineInserts = (
  bookingId: string,
  lines: AddOnLine[]
): AddOnLineInsert[] =>
  lines.map((line) => ({
    booking_addon_addon_id: line.addonId,
    booking_addon_booking_id: bookingId,
    booking_addon_quantity: line.quantity,
    booking_addon_total_ore: line.totalOre,
    booking_addon_unit_price_ore: line.unitPriceOre,
  }));

// The room's active add-ons re-checked against the chosen ids (#7): the ids
// come from a form, so a stale or forged id fails here rather than pricing
// a booking with an add-on the room does not offer. Both booking actions
// (company and admin) run this; the failure is the ready-to-return error
// state with the field error on addOnIds.
export interface AddOnSelectionState {
  error: string;
  fieldErrors: { addOnIds: string[] };
  status: "error";
}

export async function checkedAddOnLines(
  supabase: SupabaseClient<Database>,
  roomId: string,
  selectedIds: string[],
  participantCount: number
): Promise<{ lines: AddOnLine[] } | AddOnSelectionState> {
  const roomAddOns = await listRoomAddOns(supabase, roomId);
  const selection = selectAddOnLines(roomAddOns, selectedIds, participantCount);
  if (!selection.ok) {
    return {
      error: selection.error,
      fieldErrors: { addOnIds: [selection.error] },
      status: "error",
    };
  }
  return { lines: selection.lines };
}

// The checks both booking actions run, in order: the room must be bookable,
// then the chosen add-on ids must belong to it (#7). The failure is the
// ready-to-return error state.
export type RoomAndAddOns =
  | { lines: AddOnLine[]; ok: true; roomHourlyPriceOre: number }
  | { ok: false; state: FormError<never> };

export async function findRoomAndAddOns(
  supabase: SessionClient,
  input: { addOnIds: string[]; participantCount: number; roomId: string }
): Promise<RoomAndAddOns> {
  const room = await findBookableRoom(supabase, input);
  if (!room.ok) {
    return room;
  }
  const selection = await checkedAddOnLines(
    supabase,
    input.roomId,
    input.addOnIds,
    input.participantCount
  );
  if (!("lines" in selection)) {
    return { ok: false, state: selection };
  }
  return { lines: selection.lines, ok: true, roomHourlyPriceOre: room.value };
}

// Writes a pending booking's add-on lines. False means the write failed:
// the caller then releases the booking (below) so the room does not sit
// blocked on a row the booker cannot complete.
export async function writeAddOnLines(
  supabase: SessionClient,
  bookingId: string,
  lines: AddOnLine[]
): Promise<boolean> {
  if (lines.length === 0) {
    return true;
  }
  const { error } = await supabase
    .from("booking_addons")
    .insert(lineInserts(bookingId, lines));
  return !error;
}

// Frees the room: the exclusion constraint and calendar_entries ignore
// expired rows (#24).
export async function releasePendingBooking(
  supabase: SessionClient,
  bookingId: string
): Promise<void> {
  await supabase
    .from("bookings")
    .update({ booking_status: "expired" })
    .eq("booking_id", bookingId)
    .eq("booking_status", "pending_verification");
}
