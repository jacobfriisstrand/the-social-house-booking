import type { PriceOverviewModel } from "./price-overview";

export type BookingOverviewStatus =
  | "cancelled"
  | "confirmed"
  | "expired"
  | "pending_verification";

export type BookingInvoicingStatus =
  | "invoiced"
  | "not_invoiced"
  | "not_invoicable";

export interface BookingOverviewEntry {
  bookingHoldExpiresAt: string | null;
  bookingId: string;
  bookingStartAt: string;
  bookingStatus: BookingOverviewStatus;
}

export interface BookingAddonOverview {
  addonId: string;
  name: string | null;
  quantity: number;
  totalOre: number;
}

// One manual amount (ADR-0010): an extra charge admin added after the
// meeting, with its note and its audit (who/when). `who` is the admin's
// display name, or null when the admin row is gone — only the admin
// worklist shows it; the member's price rows carry just the amount and
// the note.
export interface ManualAmountEntry {
  amountOre: number;
  createdAt: string;
  createdByName: string | null;
  manualAmountId: string;
  note: string;
}

export interface BookingOverviewRow extends BookingOverviewEntry {
  addOns: BookingAddonOverview[];
  bookerName: string;
  bookingNumber: string;
  cancellationFeeOre: number | null;
  endAt: string;
  invoicingStatus: BookingInvoicingStatus;
  // The fee as it stands at load, for the cancel flow (#5): set only for a
  // confirmed booking whose start has not passed. The confirm recomputes
  // the fee server-side at the exact moment; this is the number the
  // destructive confirm states.
  liveCancellationFeeOre: number | null;
  price: PriceOverviewModel;
  roomName: string;
}

// The add-ons total for one row's tilkøb cell: the whole point of the
// column (DESIGN.md "Bookinger (member)") — one value per cell, the sum,
// not each add-on as its own row. Amounts integer øre, excl. VAT
// (ADR-0019, ADR-0020).
export function addOnsTotalOre(
  addOns: readonly BookingAddonOverview[]
): number {
  return addOns.reduce((total, addOn) => total + addOn.totalOre, 0);
}

export interface BookingOverviewLists<T extends BookingOverviewEntry> {
  all: T[];
  cancelled: T[];
  past: T[];
  upcoming: T[];
}

// Pending verification belongs with the time-based lists until it expires.
// Expired holds are not bookings and stay out of the member overview.
export function splitBookingOverview<T extends BookingOverviewEntry>(
  bookings: readonly T[],
  now: Date
): BookingOverviewLists<T> {
  const upcoming: T[] = [];
  const past: T[] = [];
  const cancelled: T[] = [];
  const all: T[] = [];
  const nowMs = now.getTime();

  for (const booking of bookings) {
    if (booking.bookingStatus === "expired") {
      continue;
    }
    if (
      booking.bookingStatus === "pending_verification" &&
      booking.bookingHoldExpiresAt !== null &&
      new Date(booking.bookingHoldExpiresAt).getTime() <= nowMs
    ) {
      continue;
    }

    all.push(booking);

    if (booking.bookingStatus === "cancelled") {
      cancelled.push(booking);
      continue;
    }

    if (new Date(booking.bookingStartAt).getTime() >= nowMs) {
      upcoming.push(booking);
    } else {
      past.push(booking);
    }
  }

  return {
    all: all.toSorted(
      (left, right) =>
        new Date(left.bookingStartAt).getTime() -
        new Date(right.bookingStartAt).getTime()
    ),
    cancelled: cancelled.toSorted(
      (left, right) =>
        new Date(right.bookingStartAt).getTime() -
        new Date(left.bookingStartAt).getTime()
    ),
    past: past.toSorted(
      (left, right) =>
        new Date(right.bookingStartAt).getTime() -
        new Date(left.bookingStartAt).getTime()
    ),
    upcoming: upcoming.toSorted(
      (left, right) =>
        new Date(left.bookingStartAt).getTime() -
        new Date(right.bookingStartAt).getTime()
    ),
  };
}
