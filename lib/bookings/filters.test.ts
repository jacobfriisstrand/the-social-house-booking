import { describe, expect, it } from "vitest";
import { outstandingInvoicesFilter, upcomingBookingsFilter } from "./filters";

const now = "2026-09-29T12:00:00.000Z";

describe("upcomingBookingsFilter", () => {
  it("counts confirmed bookings that have not started", () => {
    expect(upcomingBookingsFilter(now)).toContain(
      'and(booking_status.eq.confirmed,booking_start_at.gte."2026-09-29T12:00:00.000Z")'
    );
  });

  it("counts a pending verification only while its hold stands", () => {
    expect(upcomingBookingsFilter(now)).toContain(
      'and(booking_status.eq.pending_verification,booking_hold_expires_at.gt."2026-09-29T12:00:00.000Z")'
    );
  });

  it("never counts cancelled bookings", () => {
    const filter = upcomingBookingsFilter(now);
    expect(filter).not.toContain("cancelled");
  });
});

describe("outstandingInvoicesFilter", () => {
  it("keeps confirmed bookings whose end has passed", () => {
    expect(outstandingInvoicesFilter()).toContain(
      "and(booking_status.eq.confirmed)"
    );
  });

  it("keeps cancelled bookings only while a payable fee remains", () => {
    expect(outstandingInvoicesFilter()).toContain(
      "and(booking_status.eq.cancelled,booking_cancellation_fee_ore.gt.0,booking_cancellation_fee_waived.is.false)"
    );
  });

  it("relies on the query for the invoicing status and the end instant", () => {
    const filter = outstandingInvoicesFilter();
    expect(filter).not.toContain("invoicing");
    expect(filter).not.toContain("booking_end_at");
  });
});
