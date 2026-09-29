import { describe, expect, it } from "vitest";
import { upcomingBookingsFilter } from "./filters";

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
