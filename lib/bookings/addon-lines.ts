// Add-on selection on a booking (#7): the room's active add-ons as the
// domain model, and the chosen ids as booking_addons lines. The selected
// ids arrive from a form, so they are re-checked here — an id that is not
// an active add-on of the chosen room (another room's add-on, a
// deactivated one, or a forged id) fails the booking.
import type { SupabaseClient } from "@supabase/supabase-js";
import { type AddOn, type AddOnLine, addonLines } from "@/lib/domain/addons";
import type { Database } from "@/lib/supabase/database.types";
import { messages } from "@/messages/da";

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
