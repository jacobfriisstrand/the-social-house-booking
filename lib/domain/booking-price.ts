// The price overview compositions: the live one the booking dialog builds
// from the prices on the page (#148) — the same arithmetic the
// confirmation freezes into the historical price (add-on lines at full
// price, discount on the room only, ADR-0007) — and the frozen read of a
// confirmed booking (#149, ADR-0005). Once "Book nu" creates the hold,
// the verification step shows the frozen overview instead (#6). Pure: no
// React, no form — the form maps its fields onto this interface; frozen
// surfaces pass their row.
import {
  type AddOn,
  type AddOnLine,
  addonLines,
  linesTotalOre,
} from "./addons";
import type {
  BookingAddonOverview,
  ManualAmountEntry,
} from "./booking-overview";
import { type PriceOverviewModel, priceOverview } from "./price-overview";
import { roomTotalOre } from "./pricing";
import { buildSnapshot } from "./snapshot";

// Who is booking, in the terms the price needs: a company books at its
// discount; an admin books on a company's behalf and may set an explicit
// total (#126). The override rides on the admin branch, so a company
// input cannot carry one.
export type BookingPriceViewer =
  | { kind: "admin"; overrideOre?: number }
  | { kind: "company" };

// The add-on selection as the dialog watches it (#119): the chosen ids,
// the chosen quantities, and the headcount a per-participant add-on
// falls back to when the booker left the stepper untouched. The same
// triple travels wherever the selection is priced or read back, so it
// rides as one bundle.
export interface BookingAddOnSelection {
  participantCount: number;
  quantities: Record<string, number> | undefined;
  selectedIds: string[];
}

export interface BookingPriceInput {
  addOnSelection: BookingAddOnSelection;
  discountPercent: number;
  hours: number;
  // The room's add-on catalogue: only its add-ons can be selected; ids
  // from another room (or a deactivated one) drop out — the server
  // re-checks them on submit (lib/bookings/addon-lines).
  roomAddOns: AddOn[];
  roomHourlyPriceOre: number;
  viewer: BookingPriceViewer;
}

// The add-ons of the room's catalogue that the booker chose, in the
// catalogue's order — the same order the confirmation writes.
export function selectedBookingAddOns(
  catalogue: AddOn[],
  selectedIds: string[]
): AddOn[] {
  const chosen = new Set(selectedIds);
  return catalogue.filter((addOn) => chosen.has(addOn.addonId));
}

// The chosen add-ons as priced lines: a fixed add-on prices once whatever
// the quantities say, a per-participant one at the chosen quantity — the
// full headcount when the booker left the stepper untouched (#119).
// The dialog guards against an unset headcount by passing 0 before the
// form mounts, which prices an empty booking.
function bookingAddOnLines(
  catalogue: AddOn[],
  selection: BookingAddOnSelection
): AddOnLine[] {
  const selected = selectedBookingAddOns(catalogue, selection.selectedIds);
  const optionsByAddonId = new Map(
    selected.map((addOn) => [
      addOn.addonId,
      { quantity: selection.quantities?.[addOn.addonId] },
    ])
  );
  return addonLines(
    selected,
    selection.participantCount || 0,
    optionsByAddonId
  );
}

// The live overview model for the booking dialog: the room's total for the
// chosen hours — rounded here, at the only place that still derives it
// from the hourly price; every frozen surface reads booking_room_price_ore
// directly. The discount covers the room rental only (ADR-0007); add-ons
// sit on top. An admin's explicit total replaces the computed one (#126):
// a non-finite value falls back to the computed total instead of
// rendering "NaN". The live dialog shows the add-ons summary only, so the
// model's line breakdown stays empty.
export function bookingPriceOverview(
  input: BookingPriceInput
): PriceOverviewModel {
  const roomTotal = roomTotalOre(input.roomHourlyPriceOre, input.hours);
  const addOnLines = bookingAddOnLines(input.roomAddOns, input.addOnSelection);
  const addOnsOre = linesTotalOre(addOnLines);
  const snapshotInput = {
    addOnsOre,
    discountPercent: input.discountPercent,
    hours: input.hours,
    roomHourlyPriceOre: input.roomHourlyPriceOre,
  };
  // The expected total is the snapshot's: member price plus add-ons. The
  // snapshot columns later freeze exactly these numbers (ADR-0005).
  const { totalOre } = buildSnapshot(snapshotInput);
  const overview = priceOverview({
    addOnsOre,
    discountPercent: input.discountPercent,
    roomTotalOre: roomTotal,
    totalOre,
  });
  if (input.viewer.kind !== "admin") {
    return overview;
  }
  const { overrideOre } = input.viewer;
  return typeof overrideOre === "number" && Number.isFinite(overrideOre)
    ? { ...overview, totalOre: overrideOre }
    : overview;
}

// The price slice a frozen read row carries (ADR-0005): the historical
// price frozen at confirmation, as the admin mapper delivers it
// (lib/bookings/admin-data). AdminBookingRow extends it structurally, so
// the detail sheet passes the row whole and this module stays
// unacquainted with the admin overview.
export interface FrozenBookingPriceRow {
  addOns: BookingAddonOverview[];
  addonTotalOre: number;
  discountPercent: number;
  // The stored frozen total (#126): an admin's explicit price shows
  // exactly as set, not recomputed from the parts.
  expectedTotalOre: number;
  manualAmounts: ManualAmountEntry[];
  roomPriceOre: number;
}

// The frozen overview of a confirmed booking (ADR-0005): the room total,
// discount and add-ons read from the frozen columns — the stored numbers,
// never live prices. The manual amounts (ADR-0010), oldest first, are the
// post-meeting additions on top of the stored total. Serves the
// non-cancelled detail sheet only: a cancelled booking was never served,
// and its fee-only basis (ADR-0006) is the sheet's CancelledPrice block.
export function frozenBookingPriceOverview(
  row: FrozenBookingPriceRow
): PriceOverviewModel {
  return priceOverview({
    addOnLines: row.addOns,
    addOnsOre: row.addonTotalOre,
    discountPercent: row.discountPercent,
    manualAmounts: row.manualAmounts,
    roomTotalOre: row.roomPriceOre,
    totalOre: row.expectedTotalOre,
  });
}
