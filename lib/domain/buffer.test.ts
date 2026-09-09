import { describe, expect, it } from "vitest";
import { bufferEndAt, fitsWithinClosingTime } from "./buffer";

describe("bufferEndAt", () => {
  it("adds 30 minutes to the booking end time", () => {
    const end = new Date("2025-06-15T12:00:00Z");
    expect(bufferEndAt(end)).toEqual(new Date("2025-06-15T12:30:00Z"));
  });

  it("handles midnight crossover", () => {
    const end = new Date("2025-06-15T23:45:00Z");
    expect(bufferEndAt(end)).toEqual(new Date("2025-06-16T00:15:00Z"));
  });
});

describe("fitsWithinClosingTime", () => {
  it("returns true when buffer ends before closing", () => {
    // Buffer ends 12:30 CEST, closing 17:00 CEST
    const bufEnd = new Date("2025-06-15T10:30:00Z"); // 12:30 CEST
    expect(fitsWithinClosingTime(bufEnd, 17, 0)).toBe(true);
  });

  it("returns true when buffer ends exactly at closing", () => {
    // Buffer ends 17:00 CEST = 15:00 UTC
    const bufEnd = new Date("2025-06-15T15:00:00Z");
    expect(fitsWithinClosingTime(bufEnd, 17, 0)).toBe(true);
  });

  it("returns false when buffer ends after closing", () => {
    // Buffer ends 17:15 CEST, closing 17:00 CEST
    const bufEnd = new Date("2025-06-15T15:15:00Z");
    expect(fitsWithinClosingTime(bufEnd, 17, 0)).toBe(false);
  });

  it("handles closing at non-round hours", () => {
    // Buffer ends 16:15 CEST, closing 16:30 CEST
    const bufEnd = new Date("2025-06-15T14:15:00Z");
    expect(fitsWithinClosingTime(bufEnd, 16, 30)).toBe(true);
  });

  it("handles winter time (CET)", () => {
    // Buffer ends 16:30 CET = 15:30 UTC, closing 17:00 CET
    const bufEnd = new Date("2025-01-15T15:30:00Z");
    expect(fitsWithinClosingTime(bufEnd, 17, 0)).toBe(true);
  });
});
