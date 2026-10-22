// The invoicing-basis policy (CONTEXT.md "Invoicing basis"): what one
// booking adds to an invoicing basis, part by part, and the whole amounts
// built on it. The admin invoicing worklist (CONTEXT.md "Invoicing")
// charges it for bookings that have ended and still carry no invoice —
// a confirmed booking waits with its whole expected total, the price
// snapshot frozen at confirmation (ADR-0005); a cancelled booking waits
// only when a payable cancellation fee remains (ADR-0006), and the fee is
// that row's whole basis. House Events are not bookings and never enter
// the list, and an expired hold has nothing to invoice. All amounts
// integer øre, excl. VAT (ADR-0019, ADR-0020).

import type {
  BookingInvoicingStatus,
  BookingOverviewStatus,
} from "./booking-overview";
import { payableCancellationFeeOre } from "./cancellation";

// What one booking adds to an invoicing basis, part by part — the four
// parts the monthly economy splits its basis into (ADR-0014).
export interface InvoiceBasisParts {
  addonsOre: number;
  cancellationFeesOre: number;
  manualAmountsOre: number;
  roomRentOre: number;
}

// The frozen-snapshot fields the policy reads — the admin overview's row
// and the monthly economy's booking both carry them.
interface InvoiceBasisBooking {
  addonTotalOre: number;
  cancellationFeeOre: number | null;
  cancellationFeeWaived: boolean;
  expectedTotalOre: number;
  manualAmountsOre: number;
  status: BookingOverviewStatus;
}

// THE invoicing-basis policy (one copy, called by the admin overview and
// the monthly economy alike). A cancelled booking was never served: its
// payable cancellation fee (ADR-0006) is the whole basis — nothing else is
// invoiced, and a manual amount documents a held meeting, so none can
// exist; a waived fee reads as no fee, and no fee reads as zero. A held
// meeting adds its frozen composition (ADR-0005) — add-ons and manual
// amounts (#16), and the room rent after discount (ADR-0007) as the
// REMAINDER of the expected total, so the parts always add up to the
// stored total. Un-floored on purpose: an admin's total-price override
// (#126) may sit below the add-on lines and make the room rent negative,
// and flooring it would overstate the real invoice amount. Amounts
// integer øre, excl. VAT (ADR-0019, ADR-0020).
export function invoiceBasisParts(
  booking: InvoiceBasisBooking
): InvoiceBasisParts {
  if (booking.status === "cancelled") {
    return {
      addonsOre: 0,
      cancellationFeesOre:
        payableCancellationFeeOre(
          booking.cancellationFeeOre,
          booking.cancellationFeeWaived
        ) ?? 0,
      manualAmountsOre: 0,
      roomRentOre: 0,
    };
  }
  return {
    addonsOre: booking.addonTotalOre,
    cancellationFeesOre: 0,
    manualAmountsOre: booking.manualAmountsOre,
    roomRentOre: booking.expectedTotalOre - booking.addonTotalOre,
  };
}

// The parts always add up to the booking's whole basis.
export function invoiceBasisTotalOre(parts: InvoiceBasisParts): number {
  return (
    parts.roomRentOre +
    parts.addonsOre +
    parts.cancellationFeesOre +
    parts.manualAmountsOre
  );
}

// One booking's whole invoicing basis, the amount ready to invoice
// (CONTEXT.md "Invoicing basis"): nothing while it is marked not
// invoicable — the admin refused this one an invoice — otherwise the
// lifecycle policy's whole (invoiceBasisParts). The gate the usage rows
// ride; the monthly economy keeps its own not-invoicable gate in tally,
// where the four part columns must zero alongside the counts.
export function invoiceBasisOre(
  booking: InvoiceBasisBooking & { invoicingStatus: BookingInvoicingStatus }
): number {
  return booking.invoicingStatus === "not_invoicable"
    ? 0
    : invoiceBasisTotalOre(invoiceBasisParts(booking));
}
