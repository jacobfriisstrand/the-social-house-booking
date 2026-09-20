import { describe, expect, it } from "vitest";
import {
  type BookingOverviewEntry,
  type BookingOverviewStatus,
  splitBookingOverview,
} from "./booking-overview";

const booking = (
  bookingId: string,
  bookingStartAt: string,
  bookingStatus: BookingOverviewStatus = "confirmed",
  bookingHoldExpiresAt: string | null = null
): BookingOverviewEntry => ({
  bookingHoldExpiresAt,
  bookingId,
  bookingStartAt,
  bookingStatus,
});

describe("splitBookingOverview", () => {
  const now = new Date("2026-09-20T10:00:00Z");

  it("sorts upcoming bookings from soonest to latest", () => {
    const result = splitBookingOverview(
      [
        booking("later", "2026-09-22T10:00:00Z"),
        booking("now", "2026-09-20T10:00:00Z"),
        booking("soon", "2026-09-20T11:00:00Z", "pending_verification"),
      ],
      now
    );

    expect(result.upcoming.map(({ bookingId }) => bookingId)).toEqual([
      "now",
      "soon",
      "later",
    ]);
    expect(result.all.map(({ bookingId }) => bookingId)).toEqual([
      "now",
      "soon",
      "later",
    ]);
  });

  it("sorts past bookings from latest to oldest", () => {
    const result = splitBookingOverview(
      [
        booking("old", "2026-09-18T10:00:00Z"),
        booking("latest", "2026-09-20T09:59:59Z"),
        booking("middle", "2026-09-19T10:00:00Z"),
      ],
      now
    );

    expect(result.past.map(({ bookingId }) => bookingId)).toEqual([
      "latest",
      "middle",
      "old",
    ]);
  });

  it("keeps cancelled bookings in their own list regardless of date", () => {
    const result = splitBookingOverview(
      [
        booking("cancelled-future", "2026-09-25T10:00:00Z", "cancelled"),
        booking("cancelled-past", "2026-09-19T10:00:00Z", "cancelled"),
        booking("confirmed", "2026-09-21T10:00:00Z"),
      ],
      now
    );

    expect(result.cancelled.map(({ bookingId }) => bookingId)).toEqual([
      "cancelled-future",
      "cancelled-past",
    ]);
    expect(result.all.map(({ bookingId }) => bookingId)).toEqual([
      "cancelled-past",
      "confirmed",
      "cancelled-future",
    ]);
    expect(result.upcoming.map(({ bookingId }) => bookingId)).toEqual([
      "confirmed",
    ]);
  });

  it("does not show expired verification holds", () => {
    const result = splitBookingOverview(
      [
        booking("expired", "2026-09-25T10:00:00Z", "expired"),
        booking(
          "stale-hold",
          "2026-09-25T10:30:00Z",
          "pending_verification",
          "2026-09-20T09:59:59Z"
        ),
        booking("confirmed", "2026-09-25T11:00:00Z"),
      ],
      now
    );

    expect(result.upcoming.map(({ bookingId }) => bookingId)).toEqual([
      "confirmed",
    ]);
    expect(result.all.map(({ bookingId }) => bookingId)).toEqual(["confirmed"]);
    expect(result.past).toHaveLength(0);
    expect(result.cancelled).toHaveLength(0);
  });
});
