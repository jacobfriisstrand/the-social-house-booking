import type { PostgrestError } from "@supabase/supabase-js";
import type {
  BookingAddonOverview,
  ManualAmountEntry,
} from "@/lib/domain/booking-overview";
import {
  type FrozenBookingPriceRow,
  frozenBookingPriceOverview,
} from "@/lib/domain/booking-price";
import type { PriceOverviewModel } from "@/lib/domain/price-overview";
import type { Database } from "@/lib/supabase/database.types";

// Every list read unwraps the Postgrest response the same way: an error
// throws with the subject named, a null data array is an empty set.
export function rowsOrThrow<T>(
  result: { data: T[] | null; error: PostgrestError | null },
  subject: string
): T[] {
  if (result.error) {
    throw new Error(`could not list ${subject}: ${result.error.message}`);
  }
  return result.data ?? [];
}

// One booking_addons embed line the booking overviews read (#146): the
// line's frozen columns plus the catalogue join — null when the add-on
// row is gone or RLS hides it. The shared type keeps the overviews'
// embeds to the same columns, so the projection below is the one place
// booking_addons rows become domain lines.
export type BookingAddonEmbedRow = Pick<
  Database["public"]["Tables"]["booking_addons"]["Row"],
  | "booking_addon_addon_id"
  | "booking_addon_quantity"
  | "booking_addon_total_ore"
> & {
  addons: Pick<
    Database["public"]["Tables"]["addons"]["Row"],
    "addon_description" | "addon_name"
  > | null;
};

// The one projection of booking_addons rows to the overview's add-on
// lines: the frozen quantity and line total, the catalogue
// name/description read through the join — null when the join row is
// missing. The query orders the lines; the mapper preserves that order.
export const bookingAddonOverviewLines = (
  lines: readonly BookingAddonEmbedRow[] | null
): BookingAddonOverview[] =>
  (lines ?? []).map((line) => ({
    addonId: line.booking_addon_addon_id,
    description: line.addons?.addon_description ?? null,
    name: line.addons?.addon_name ?? null,
    quantity: line.booking_addon_quantity,
    totalOre: line.booking_addon_total_ore,
  }));

// One manual_amounts embed line (ADR-0010): the amount with its note and
// audit. The created-by column is the admin read's extra — the member
// read selects it away, so it stays optional.
export type ManualAmountEmbedRow = Pick<
  Database["public"]["Tables"]["manual_amounts"]["Row"],
  | "manual_amount_amount_ore"
  | "manual_amount_created_at"
  | "manual_amount_id"
  | "manual_amount_note"
> & { manual_amount_created_by?: string | null };

// The one projection of manual_amounts rows to the overview's entries
// (ADR-0010): amount, note, and the audit — who is the creating admin's
// display name when the caller carries the names map (the admin read,
// resolved by adminDisplayNames) and null when the row or the column is
// gone (the member read carries neither). The query orders the entries;
// the mapper preserves that order.
export const manualAmountEntries = (
  amounts: readonly ManualAmountEmbedRow[] | null,
  adminNames?: ReadonlyMap<string, string>
): ManualAmountEntry[] =>
  (amounts ?? []).map((amount) => ({
    amountOre: amount.manual_amount_amount_ore,
    createdAt: amount.manual_amount_created_at,
    createdByName: amount.manual_amount_created_by
      ? (adminNames?.get(amount.manual_amount_created_by) ?? null)
      : null,
    manualAmountId: amount.manual_amount_id,
    note: amount.manual_amount_note,
  }));

// The columns a booking's price overview is read from (ADR-0005): the
// historical price frozen at confirmation — later reads of a booking
// never recompute from live room or company prices, and never from the
// booked hours either, so the time columns stay out of the read. The
// manual amounts (ADR-0010) ride along when the row carries their embed —
// only the member booking sheet's read does.
export interface BookingPriceRow {
  booking_addon_total_ore: number;
  booking_discount_percent: number;
  booking_expected_total_ore: number;
  booking_room_price_ore: number;
  manual_amounts?: ManualAmountEmbedRow[] | null;
}

// The price slice the frozen read (lib/domain/booking-price) composes
// from a bookings row: the stored room total, discount, add-on total and
// expected total, and the manual amounts mapped from their embed.
// `addOns` carries the add-on lines the caller has already mapped from
// the booking_addons embed (the member booking sheet's read) — a read
// without them shows the add-ons summary only.
const frozenBookingPriceRow = (
  row: BookingPriceRow,
  addOns?: BookingAddonOverview[]
): FrozenBookingPriceRow => ({
  addOns: addOns ?? [],
  addonTotalOre: row.booking_addon_total_ore,
  discountPercent: row.booking_discount_percent,
  expectedTotalOre: row.booking_expected_total_ore,
  manualAmounts: manualAmountEntries(row.manual_amounts ?? null),
  roomPriceOre: row.booking_room_price_ore,
});

// The frozen price overview of a bookings row (ADR-0005): the projection
// (frozenBookingPriceRow) plus the frozen composition
// (frozenBookingPriceOverview, lib/domain/booking-price) as one read for
// the query-side callers — the member booking sheet, the notice board and
// the hold reads. The composition stays the price module's; the admin
// detail sheet composes from its own mapper's row instead.
export const bookingPriceOverviewFromRow = (
  row: BookingPriceRow,
  addOns?: BookingAddonOverview[]
): PriceOverviewModel =>
  frozenBookingPriceOverview(frozenBookingPriceRow(row, addOns));
