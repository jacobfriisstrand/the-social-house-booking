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
  roomName: string;
}

// One row's whole invoicing basis: the frozen expected total for a
// confirmed booking; for a cancelled one only the payable cancellation fee
// remains (ADR-0006) — nothing was served, so nothing else is invoiced. A
// waived fee reads as no fee, and a cancelled booking without a fee reads
// as zero.
export function outstandingInvoiceBasisOre(booking: {
  cancellationFeeOre: number | null;
  expectedTotalOre: number;
  status: BookingOverviewStatus;
  waived: boolean;
}): number {
  if (booking.status !== "cancelled") {
    return booking.expectedTotalOre;
  }
  return (
    payableCancellationFeeOre(booking.cancellationFeeOre, booking.waived) ?? 0
  );
}
