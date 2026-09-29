// The admin invoicing worklist (CONTEXT.md "Invoicing"): bookings that
// have ended and still carry no invoice. A confirmed booking waits with
// its whole expected total — the price snapshot frozen at confirmation
// (ADR-0005); a cancelled booking waits only when a payable cancellation
// fee remains (ADR-0006), and the fee is that row's whole basis. House
// Events are not bookings and never enter the list, and an expired hold
// has nothing to invoice. All amounts integer øre, excl. VAT
// (ADR-0019, ADR-0020).
import type { BookingOverviewStatus } from "./booking-overview";

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
