// The pre-confirmation price composition (#148): the price overview the
// booking dialog shows before there is a hold — the same arithmetic the
// snapshot uses (add-on lines at full price, discount on the room only,
// ADR-0007), from the prices on the page. Once "Book nu" creates the hold,
// the verification step shows the frozen overview instead (#6). Pure: no
// React, no form — the form maps its fields onto this interface.
import {
  type AddOn,
  type AddOnLine,
  addonLines,
  linesTotalOre,
} from "./addons";
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
