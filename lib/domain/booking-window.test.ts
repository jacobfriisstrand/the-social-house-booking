import { describe, expect, it } from "vitest";
import {
  BOOKING_HORIZON_MONTHS,
  bookingHorizonEnd,
  bookingWindowOutcome,
  isOnSlotGrid,
  MIN_BOOKING_MINUTES,
  SLOT_MINUTES,
} from "./booking-window";

// A Wednesday in September 2026, 10:00 Copenhagen (CEST).
const now = new Date("2026-09-16T08:00:00Z");

describe("constants", () => {
  it("match Bilag 1: 30-minute intervals, minimum 30 minutes, 12 months", () => {
    expect(SLOT_MINUTES).toBe(30);
    expect(MIN_BOOKING_MINUTES).toBe(30);
    expect(BOOKING_HORIZON_MONTHS).toBe(12);
  });
});

describe("isOnSlotGrid", () => {
  it("accepts whole and half hours", () => {
    expect(isOnSlotGrid(new Date("2026-09-16T09:00:00Z"))).toBe(true);
    expect(isOnSlotGrid(new Date("2026-09-16T09:30:00Z"))).toBe(true);
  });

  it("rejects anything between", () => {
    expect(isOnSlotGrid(new Date("2026-09-16T09:15:00Z"))).toBe(false);
    expect(isOnSlotGrid(new Date("2026-09-16T09:00:01Z"))).toBe(false);
  });
});

describe("bookingHorizonEnd", () => {
  it("is twelve months from now", () => {
    expect(bookingHorizonEnd(now).toISOString()).toBe(
      "2027-09-16T08:00:00.000Z"
    );
  });
});

describe("bookingWindowOutcome", () => {
  it("accepts a same-day booking later today", () => {
    expect(
      bookingWindowOutcome({
        endAt: new Date("2026-09-16T11:00:00Z"),
        now,
        startAt: new Date("2026-09-16T10:00:00Z"),
      })
    ).toEqual({ kind: "ok" });
  });

  it("accepts a booking exactly at the horizon", () => {
    expect(
      bookingWindowOutcome({
        endAt: new Date("2027-09-16T08:00:00Z"),
        now,
        startAt: new Date("2027-09-16T07:30:00Z"),
      })
    ).toEqual({ kind: "ok" });
  });

  it("rejects times off the 30-minute grid", () => {
    expect(
      bookingWindowOutcome({
        endAt: new Date("2026-09-16T11:00:00Z"),
        now,
        startAt: new Date("2026-09-16T10:15:00Z"),
      })
    ).toEqual({ kind: "off_grid" });
    expect(
      bookingWindowOutcome({
        endAt: new Date("2026-09-16T11:10:00Z"),
        now,
        startAt: new Date("2026-09-16T10:00:00Z"),
      })
    ).toEqual({ kind: "off_grid" });
  });

  it("rejects a booking shorter than 30 minutes", () => {
    expect(
      bookingWindowOutcome({
        endAt: new Date("2026-09-16T10:00:00Z"),
        now,
        startAt: new Date("2026-09-16T10:00:00Z"),
      })
    ).toEqual({ kind: "too_short" });
  });

  it("rejects a start that is not in the future", () => {
    expect(
      bookingWindowOutcome({
        endAt: new Date("2026-09-16T09:00:00Z"),
        now,
        startAt: new Date("2026-09-16T08:00:00Z"),
      })
    ).toEqual({ kind: "in_past" });
  });

  it("rejects a booking ending past the horizon", () => {
    expect(
      bookingWindowOutcome({
        endAt: new Date("2027-09-16T08:30:00Z"),
        now,
        startAt: new Date("2027-09-16T08:00:00Z"),
      })
    ).toEqual({ kind: "beyond_horizon" });
  });
});
