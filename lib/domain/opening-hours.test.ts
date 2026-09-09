import { describe, expect, it } from "vitest";
import { bookingWithinHours } from "./opening-hours";

describe("bookingWithinHours", () => {
  it("returns true when booking is within opening hours", () => {
    const start = new Date("2025-06-15T08:00:00Z"); // 10:00 CEST
    const end = new Date("2025-06-15T12:00:00Z"); // 14:00 CEST
    expect(bookingWithinHours(start, end, 8, 0, 17, 0)).toBe(true);
  });

  it("returns false when booking starts before opening", () => {
    const start = new Date("2025-06-15T05:30:00Z"); // 07:30 CEST
    const end = new Date("2025-06-15T12:00:00Z"); // 14:00 CEST
    expect(bookingWithinHours(start, end, 8, 0, 17, 0)).toBe(false);
  });

  it("returns false when booking ends after closing", () => {
    const start = new Date("2025-06-15T14:00:00Z"); // 16:00 CEST
    const end = new Date("2025-06-15T15:30:00Z"); // 17:30 CEST
    expect(bookingWithinHours(start, end, 8, 0, 17, 0)).toBe(false);
  });

  it("returns true when booking starts exactly at opening", () => {
    const start = new Date("2025-06-15T06:00:00Z"); // 08:00 CEST
    const end = new Date("2025-06-15T10:00:00Z"); // 12:00 CEST
    expect(bookingWithinHours(start, end, 8, 0, 17, 0)).toBe(true);
  });

  it("returns true when booking ends exactly at closing", () => {
    const start = new Date("2025-06-15T14:00:00Z"); // 16:00 CEST
    const end = new Date("2025-06-15T15:00:00Z"); // 17:00 CEST
    expect(bookingWithinHours(start, end, 8, 0, 17, 0)).toBe(true);
  });

  it("handles non-round opening hours", () => {
    const start = new Date("2025-06-15T06:15:00Z"); // 08:15 CEST
    const end = new Date("2025-06-15T14:45:00Z"); // 16:45 CEST
    expect(bookingWithinHours(start, end, 8, 15, 16, 45)).toBe(true);
  });

  it("handles DST crossing (CET → CEST)", () => {
    // March 30 2025: clocks spring forward at 02:00 CET → 03:00 CEST
    // 01:00 CET to 04:00 CEST — booking spans the gap
    const start = new Date("2025-03-30T00:00:00Z"); // 01:00 CET
    const end = new Date("2025-03-30T02:00:00Z"); // 04:00 CEST
    expect(bookingWithinHours(start, end, 1, 0, 17, 0)).toBe(true);
  });

  it("handles DST crossing with booking in the skipped hour", () => {
    // 02:30 CET does not exist — it becomes 03:30 CEST
    // So a booking that "starts at 02:30" actually starts at 03:30 CEST
    const start = new Date("2025-03-30T01:30:00Z"); // 03:30 CEST (02:30 CET doesn't exist)
    const end = new Date("2025-03-30T03:00:00Z"); // 05:00 CEST
    expect(bookingWithinHours(start, end, 1, 0, 17, 0)).toBe(true);
  });
});
