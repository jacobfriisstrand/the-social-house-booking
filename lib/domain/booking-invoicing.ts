// The admin invoicing worklist (CONTEXT.md "Invoicing"): bookings that
// have ended and still carry no invoice. A confirmed booking waits with
// its whole expected total — the price snapshot frozen at confirmation
// (ADR-0005); a cancelled booking waits only when a payable cancellation
// fee remains (ADR-0006), and the fee is that row's whole basis. House
// Events are not bookings and never enter the list, and an expired hold
// has nothing to invoice. All amounts integer øre, excl. VAT
// (ADR-0019, ADR-0020).

import type { BookingOverviewStatus } from "./booking-overview";
import { payableCancellationFeeOre } from "./cancellation";

export interface OutstandingInvoiceRow {
  basisOre: number;
  bookingEndAt: string;
  bookingId: string;
  bookingNumber: string;
  bookingStartAt: string;
  bookingStatus: BookingOverviewStatus;
  companyName: string;
  // The booking's manual amounts (ADR-0010) as the sheet shows them,
  // oldest first, the creator's display name included when known.
  manualAmounts: ManualAmountEntry[];
  roomName: string;
}

// One manual amount (ADR-0010): an extra charge admin added after the
// meeting, with its note and its audit (who/when). `who` is the admin's
// display name, or null when the admin row is gone.
export interface ManualAmountEntry {
  amountOre: number;
  createdAt: string;
  createdByName: string | null;
  manualAmountId: string;
  note: string;
}

// One booking's manual amounts (ADR-0010) as one sum for its own column
// (DESIGN.md "Bookinger (admin)"), kept apart from the auto-computed
// basis the total shows. Amounts integer øre, excl. VAT (ADR-0019,
// ADR-0020).
export function manualAmountsTotalOre(
  entries: readonly ManualAmountEntry[]
): number {
  return entries.reduce((sum, entry) => sum + entry.amountOre, 0);
}

// One row's whole invoicing basis: the frozen expected total for a
// confirmed booking plus its manual amounts (#16); for a cancelled one
// only the payable cancellation fee remains (ADR-0006) — nothing was
// served, so nothing else is invoiced, and a manual amount documents a
// held meeting, so none can exist. A waived fee reads as no fee, and a
// cancelled booking without a fee reads as zero.
export function outstandingInvoiceBasisOre(booking: {
  cancellationFeeOre: number | null;
  expectedTotalOre: number;
  manualAmountsOre: number;
  status: BookingOverviewStatus;
  waived: boolean;
}): number {
  if (booking.status !== "cancelled") {
    return booking.expectedTotalOre + booking.manualAmountsOre;
  }
  return (
    payableCancellationFeeOre(booking.cancellationFeeOre, booking.waived) ?? 0
  );
}
