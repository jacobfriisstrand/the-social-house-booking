import { describe, expect, it } from "vitest";
import { cphWallClock, hoursBetween, toUtc } from "./time";

describe("toUtc", () => {
  it("parses an ISO string with positive offset to a UTC Date", () => {
    const date = toUtc("2025-06-15T10:00:00+02:00");
    expect(date.toISOString()).toBe("2025-06-15T08:00:00.000Z");
  });

  it("parses an ISO string with negative offset to a UTC Date", () => {
    const date = toUtc("2025-06-15T10:00:00-05:00");
    expect(date.toISOString()).toBe("2025-06-15T15:00:00.000Z");
  });

  it("parses a UTC ISO string (Z suffix)", () => {
    const date = toUtc("2025-06-15T08:00:00Z");
    expect(date.toISOString()).toBe("2025-06-15T08:00:00.000Z");
  });
});

describe("hoursBetween", () => {
  it("returns 2 for a 2-hour gap", () => {
    const start = toUtc("2025-06-15T10:00:00+02:00");
    const end = toUtc("2025-06-15T12:00:00+02:00");
    expect(hoursBetween(start, end)).toBe(2);
  });

  it("returns 0.5 for a 30-minute gap", () => {
    const start = toUtc("2025-06-15T10:00:00+02:00");
    const end = toUtc("2025-06-15T10:30:00+02:00");
    expect(hoursBetween(start, end)).toBe(0.5);
  });

  it("returns a negative value when end is before start", () => {
    const start = toUtc("2025-06-15T12:00:00+02:00");
    const end = toUtc("2025-06-15T10:00:00+02:00");
    expect(hoursBetween(start, end)).toBe(-2);
  });

  it("handles DST crossing (CET → CEST, spring forward)", () => {
    // March 30 2025: clocks spring forward at 02:00 CET → 03:00 CEST
    // 01:00 CET to 04:00 CEST = 3 wall-clock hours but only 2 real hours
    const start = toUtc("2025-03-30T01:00:00+01:00"); // 00:00 UTC
    const end = toUtc("2025-03-30T04:00:00+02:00"); // 02:00 UTC
    expect(hoursBetween(start, end)).toBe(2);
  });
});

describe("cphWallClock", () => {
  it("converts a UTC summer time to Copenhagen local time", () => {
    // UTC 08:00 in summer = CEST 10:00
    const utc = new Date("2025-06-15T08:00:00Z");
    const cph = cphWallClock(utc);
    expect(cph).toEqual({ hour: 10, minute: 0 });
  });

  it("converts a UTC winter time to Copenhagen local time", () => {
    // UTC 08:00 in winter = CET 09:00
    const utc = new Date("2025-01-15T08:00:00Z");
    const cph = cphWallClock(utc);
    expect(cph).toEqual({ hour: 9, minute: 0 });
  });

  it("handles midnight crossover", () => {
    // UTC 23:30 in summer = CEST 01:30 next day
    const utc = new Date("2025-06-15T23:30:00Z");
    const cph = cphWallClock(utc);
    expect(cph).toEqual({ hour: 1, minute: 30 });
  });

  it("handles DST spring-forward gap correctly", () => {
    // 02:30 CEST does not exist (clocks jump from 01:59:59 CET to 03:00:00 CEST)
    // UTC 00:30 = 01:30 CET (before gap), UTC 01:30 = 03:30 CEST (after gap)
    const beforeGap = new Date("2025-03-30T00:30:00Z");
    const afterGap = new Date("2025-03-30T01:30:00Z");
    expect(cphWallClock(beforeGap)).toEqual({ hour: 1, minute: 30 });
    expect(cphWallClock(afterGap)).toEqual({ hour: 3, minute: 30 });
  });
});
