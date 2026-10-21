import type { PostgrestError } from "@supabase/supabase-js";
import type {
  BookingAddonOverview,
  ManualAmountEntry,
} from "@/lib/domain/booking-overview";
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
