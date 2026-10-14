import { describe, expect, it } from "vitest";
import {
  adminBookingStatesFilter,
  adminCalendarStateCuts,
  outstandingInvoicesFilter,
  upcomingBookingsFilter,
} from "./filters";

const now = "2026-09-29T12:00:00.000Z";

describe("upcomingBookingsFilter", () => {
  it("counts confirmed bookings that have not ended, a running one included", () => {
    expect(upcomingBookingsFilter(now)).toContain(
      'and(booking_status.eq.confirmed,booking_end_at.gte."2026-09-29T12:00:00.000Z")'
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

describe("adminBookingStatesFilter", () => {
  // The builder only serves two or more ticked buckets: the PostgREST
  // or-list rejects a lone and(...) member (verified locally), so a
  // single bucket chains as plain filters in lib/bookings/admin-data.ts.
  it("joins the two-bucket or-list the admin filter sends", () => {
    expect(adminBookingStatesFilter(["cancelled", "upcoming"], now)).toBe(
      `and(booking_status.eq.confirmed,booking_end_at.gte."${now}"),booking_status.eq.cancelled`
    );
  });

  it("joins every ticked bucket in a fixed order", () => {
    expect(
      adminBookingStatesFilter(["cancelled", "finished", "upcoming"], now)
    ).toBe(
      `and(booking_status.eq.confirmed,booking_end_at.gte."${now}"),and(booking_status.eq.confirmed,booking_end_at.lt."${now}"),booking_status.eq.cancelled`
    );
  });
});

describe("adminCalendarStateCuts", () => {
  it("cuts the calendar on the entries' ends, joined as alternatives", () => {
    expect(adminCalendarStateCuts(["upcoming", "finished"], now)).toBe(
      `booking_end_at.gte."${now}",booking_end_at.lt."${now}"`
    );
  });

  it("a cancelled-only selection returns no cuts, emptying the month view", () => {
    expect(adminCalendarStateCuts(["cancelled"], now)).toBe("");
  });

  it("a ticked cancelled bucket drops out beside the time cuts", () => {
    expect(adminCalendarStateCuts(["cancelled", "upcoming"], now)).toBe(
      `booking_end_at.gte."${now}"`
    );
  });
});
