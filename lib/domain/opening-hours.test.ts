import { describe, expect, it } from "vitest";
import {
  bookingWithinOpeningHours,
  dayOfWeek,
  type WeeklyOpeningHours,
} from "./opening-hours";

// Weekly hours 08:00-18:00 Monday-Friday (0-4), closed Saturday, open 10:00-14:00 Sunday.
const standardWeek: WeeklyOpeningHours = [
  { closes: "18:00", dayOfWeek: 0, isClosed: false, opens: "08:00" },
  { closes: "18:00", dayOfWeek: 1, isClosed: false, opens: "08:00" },
  { closes: "18:00", dayOfWeek: 2, isClosed: false, opens: "08:00" },
  { closes: "18:00", dayOfWeek: 3, isClosed: false, opens: "08:00" },
  { closes: "18:00", dayOfWeek: 4, isClosed: false, opens: "08:00" },
  { closes: "14:00", dayOfWeek: 5, isClosed: false, opens: "08:00" },
  { closes: "14:00", dayOfWeek: 6, isClosed: true, opens: "10:00" },
];

describe("bookingWithinOpeningHours", () => {
  it("accepts a booking inside the weekday hours", () => {
    // 2026-09-07 is a Monday: 09:00-11:00 CEST = 07:00-09:00 UTC
    const start = new Date("2026-09-07T07:00:00Z");
    const end = new Date("2026-09-07T11:00:00Z");
    expect(bookingWithinOpeningHours(start, end, standardWeek)).toBe(true);
  });

  it("accepts a booking that starts exactly at opening", () => {
    // Monday 2025-06-16 08:00 CEST
    const start = new Date("2025-06-16T06:00:00Z");
    const end = new Date("2025-06-16T10:00:00Z");
    expect(bookingWithinOpeningHours(start, end, standardWeek)).toBe(true);
  });

  it("accepts a booking that ends exactly at closing", () => {
    // Monday 2025-06-16 16:00-18:00 CEST, closes at 18:00.
    const start = new Date("2025-06-16T14:00:00Z");
    const end = new Date("2025-06-16T16:00:00Z");
    expect(bookingWithinOpeningHours(start, end, standardWeek)).toBe(true);
  });

  it("rejects a booking starting before opening", () => {
    // Monday 2025-06-16, starts 07:30 CEST — before 08:00.
    const start = new Date("2025-06-16T05:30:00Z");
    const end = new Date("2025-06-16T12:00:00Z");
    expect(bookingWithinOpeningHours(start, end, standardWeek)).toBe(false);
  });

  it("rejects a booking ending after closing", () => {
    // Monday 2025-06-16, ends 18:30 CEST — after 18:00.
    const start = new Date("2025-06-16T14:00:00Z"); // 16:00 CEST
    const end = new Date("2025-06-16T16:30:00Z"); // 18:30 CEST
    expect(bookingWithinOpeningHours(start, end, standardWeek)).toBe(false);
  });

  it("handles non-round opening hours", () => {
    // Monday 2026-09-07, hours 08:00-18:00; 08:15-16:45 CEST
    const start = new Date("2026-09-07T06:15:00Z");
    const end = new Date("2026-09-07T14:45:00Z");
    expect(bookingWithinOpeningHours(start, end, standardWeek)).toBe(true);
  });

  it("rejects a booking on a closed day", () => {
    // 2026-09-13 is a Sunday, closed per the weekly row.
    const start = new Date("2026-09-13T08:00:00Z"); // 10:00 CEST
    const end = new Date("2026-09-13T10:00:00Z"); // 12:00 CEST
    expect(bookingWithinOpeningHours(start, end, standardWeek)).toBe(false);
  });

  it("rejects a booking outside a shortened day", () => {
    // Saturday 2026-09-12 opens 08:00-14:00; 13:00-15:00 CEST ends too late.
    const start = new Date("2026-09-12T11:00:00Z"); // 13:00 CEST
    const end = new Date("2026-09-12T13:00:00Z"); // 15:00 CEST
    expect(bookingWithinOpeningHours(start, end, standardWeek)).toBe(false);
  });

  it("accepts a booking ending exactly at a shortened day's close", () => {
    // Saturday 2026-09-12: 12:00-14:00 CEST ends exactly at 14:00 closes.
    const start = new Date("2026-09-12T10:00:00Z");
    const end = new Date("2026-09-12T12:00:00Z");
    expect(bookingWithinOpeningHours(start, end, standardWeek)).toBe(true);
  });

  it("accepts a booking ending exactly at a 24:00 close (midnight)", () => {
    // Monday 2026-09-07, open 08:00-24:00: 20:00-24:00 CEST. The end
    // instant is Tuesday 00:00 Copenhagen — same booking, not a two-date
    // span.
    const midnightWeek: WeeklyOpeningHours = [
      { closes: "24:00", dayOfWeek: 0, isClosed: false, opens: "08:00" },
    ];
    const start = new Date("2026-09-07T18:00:00Z"); // 20:00 CEST
    const end = new Date("2026-09-07T22:00:00Z"); // 24:00 CEST (next date 00:00)
    expect(bookingWithinOpeningHours(start, end, midnightWeek)).toBe(true);
  });

  it("rejects a booking ending after a 24:00 close", () => {
    // 20:00-00:30 crosses midnight: past the 24:00 close.
    const midnightWeek: WeeklyOpeningHours = [
      { closes: "24:00", dayOfWeek: 0, isClosed: false, opens: "08:00" },
    ];
    const start = new Date("2026-09-07T18:00:00Z"); // 20:00 CEST
    const end = new Date("2026-09-07T22:30:00Z"); // 00:30 next date
    expect(bookingWithinOpeningHours(start, end, midnightWeek)).toBe(false);
  });

  it("rejects a booking ending at midnight when the room closes earlier", () => {
    // Monday closes 18:00; an end at 00:00 next date is not 24:00 of Monday.
    const start = new Date("2026-09-07T15:00:00Z"); // 17:00 CEST
    const end = new Date("2026-09-07T22:00:00Z"); // 00:00 next date
    expect(bookingWithinOpeningHours(start, end, standardWeek)).toBe(false);
  });

  it("a special closing day overrides the weekly row (closed)", () => {
    // Thursday 2026-12-24 10:00-12:00 would fit the weekly 08-18, but the
    // special day closes the date.
    const specialDays = [
      { closes: null, date: "2026-12-24", isClosed: true, opens: null },
    ];
    const start = new Date("2026-12-24T09:00:00Z"); // 10:00 CET
    const end = new Date("2026-12-24T10:00:00Z"); // 11:00 CEST
    expect(
      bookingWithinOpeningHours(start, end, standardWeek, specialDays)
    ).toBe(false);
  });

  it("a special closing day overrides the weekly hours (open)", () => {
    // Sunday 2025-12-21 with special hours 09:00-16:00; weekly says 10-14.
    const specialDays = [
      { closes: "16:00", date: "2025-12-21", isClosed: false, opens: "09:00" },
    ];
    const start = new Date("2025-12-21T08:00:00Z"); // 10:00 CET (winter)
    const end = new Date("2025-12-21T15:00:00Z"); // 16:00 CET
    expect(
      bookingWithinOpeningHours(start, end, standardWeek, specialDays)
    ).toBe(true);
  });

  it("a booking outside the special day's hours is rejected", () => {
    const specialDays = [
      { closes: "16:00", date: "2025-12-21", isClosed: false, opens: "09:00" },
    ];
    const start = new Date("2025-12-21T15:00:00Z"); // 16:00 CET
    const end = new Date("2025-12-21T16:00:00Z"); // 17:00 CET
    expect(
      bookingWithinOpeningHours(start, end, standardWeek, specialDays)
    ).toBe(false);
  });

  it("a missing weekday row means closed", () => {
    // Monday only; Tuesday 2026-09-15 has no row → closed.
    const sparse: WeeklyOpeningHours = [
      { closes: "18:00", dayOfWeek: 0, isClosed: false, opens: "08:00" },
    ];
    const start = new Date("2026-09-15T08:00:00Z"); // 10:00 CEST
    const end = new Date("2026-09-15T10:00:00Z"); // 12:00 CEST
    expect(bookingWithinOpeningHours(start, end, sparse)).toBe(false);
  });

  it("rejects a booking spanning two Copenhagen dates", () => {
    // Booked 17:00-20:00 CEST across two days where hours end at 18:00 — the
    // end falls on the next day's row, which cannot contain it.
    const start = new Date("2026-09-07T15:00:00Z"); // Monday 17:00 CEST
    const end = new Date("2026-09-07T18:00:00Z"); // Monday 20:00 CEST
    expect(bookingWithinOpeningHours(start, end, standardWeek)).toBe(false);
  });

  it("handles DST crossing (CET → CEST)", () => {
    // March 30 2025: clocks spring forward at 02:00 CET → 03:00 CEST.
    // 01:00 CET to 04:00 CEST — inside 01:00-17:00 wall hours.
    const start = new Date("2025-03-30T00:00:00Z"); // 01:00 CET
    const end = new Date("2025-03-30T02:00:00Z"); // 04:00 CEST
    const sunday: WeeklyOpeningHours = [
      { closes: "17:00", dayOfWeek: 6, isClosed: false, opens: "01:00" },
    ];
    expect(bookingWithinOpeningHours(start, end, sunday)).toBe(true);
  });

  it("maps weekdays correctly (0 = Monday, 6 = Sunday)", () => {
    // 2026-09-13 is a Sunday; weekly row only open on Sunday 12:00-16:00.
    const sundayOnly: WeeklyOpeningHours = [
      { closes: "16:00", dayOfWeek: 6, isClosed: false, opens: "12:00" },
    ];
    const start = new Date("2026-09-13T10:00:00Z"); // 12:00 CEST (DST still active in September)
    const end = new Date("2026-09-13T14:00:00Z"); // 16:00 CEST
    expect(bookingWithinOpeningHours(start, end, sundayOnly)).toBe(true);

    // 2026-09-14 is a Monday (day 0) — closed per the row above.
    const startMon = new Date("2026-09-14T11:00:00Z"); // 13:00 CEST
    const endMon = new Date("2026-09-14T12:00:00Z"); // 14:00 CEST
    expect(bookingWithinOpeningHours(startMon, endMon, sundayOnly)).toBe(false);
  });
});

describe("dayOfWeek", () => {
  it("derives the Copenhagen weekday from a UTC instant", () => {
    // 2026-09-13T23:30Z is already Monday 14th 01:30 in Copenhagen.
    expect(dayOfWeek(new Date("2026-09-13T23:30:00Z"))).toBe(0);
    expect(dayOfWeek(new Date("2026-09-14T00:00:00Z"))).toBe(0);
    expect(dayOfWeek(new Date("2026-09-19T12:00:00Z"))).toBe(5); // Saturday
    expect(dayOfWeek(new Date("2026-09-20T12:00:00Z"))).toBe(6); // Sunday
  });
});
