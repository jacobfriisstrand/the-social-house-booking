// Period windows (#9): Copenhagen calendar dates (ADR-0021), Monday-first
// Danish weeks, and the instant windows the SQL filters read. The DST
// crossing is the seam: the instant window is built from wall-clock times,
// so a period that spans the autumn shift still ends at midnight local.
import { describe, expect, it } from "vitest";
import {
  calendarDates,
  calendarWindow,
  clampDate,
  monthDates,
  monthOf,
  monthWindow,
  moveMonth,
  periodUtcWindow,
  weekDates,
  weekdayIndexMondayFirst,
} from "./periods";

describe("monthOf", () => {
  it("keeps the year-month part of a date", () => {
    expect(monthOf("2026-10-02")).toBe("2026-10");
  });
});

describe("monthWindow", () => {
  it("spans the whole month, 28-day Februaries included", () => {
    expect(monthWindow("2026-02")).toEqual({
      fromDate: "2026-02-01",
      toDate: "2026-02-28",
    });
  });

  it("spans a 31-day month", () => {
    expect(monthWindow("2026-10")).toEqual({
      fromDate: "2026-10-01",
      toDate: "2026-10-31",
    });
  });
});

describe("moveMonth", () => {
  it("steps across the year boundary", () => {
    expect(moveMonth("2026-12", 1)).toBe("2027-01");
    expect(moveMonth("2026-01", -1)).toBe("2025-12");
  });

  it("steps several months", () => {
    expect(moveMonth("2026-10", -9)).toBe("2026-01");
  });
});

describe("weekdayIndexMondayFirst", () => {
  it("maps Monday to 0 and Sunday to 6", () => {
    // 2026-09-28 is a Monday, 2026-10-04 the Sunday after.
    expect(weekdayIndexMondayFirst("2026-09-28")).toBe(0);
    expect(weekdayIndexMondayFirst("2026-10-04")).toBe(6);
    expect(weekdayIndexMondayFirst("2026-10-02")).toBe(4); // Friday
  });
});

describe("weekDates", () => {
  it("returns the Monday–Sunday week that holds the date", () => {
    expect(weekDates("2026-10-02")).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
  });

  it("starts on the Monday even when the date is a Sunday", () => {
    expect(weekDates("2026-10-04")[0]).toBe("2026-09-28");
  });
});

describe("monthDates", () => {
  it("returns 42 dates starting on the Monday on or before the 1st", () => {
    const dates = monthDates("2026-10");
    expect(dates).toHaveLength(42);
    // 2026-10-01 is a Thursday, so the grid starts Monday 28/09.
    expect(dates[0]).toBe("2026-09-28");
    expect(dates).toContain("2026-10-01");
    expect(dates[41]).toBe("2026-11-08");
  });
});

describe("calendarDates", () => {
  it("gives one date for the day view", () => {
    expect(calendarDates("day", "2026-10-02")).toEqual(["2026-10-02"]);
  });

  it("gives the week for the week view", () => {
    expect(calendarDates("week", "2026-10-02")).toEqual(
      weekDates("2026-10-02")
    );
  });

  it("gives the month grid for the month view", () => {
    expect(calendarDates("month", "2026-10-02")).toEqual(monthDates("2026-10"));
  });
});

describe("calendarWindow", () => {
  it("is the day itself for the day view", () => {
    expect(calendarWindow("day", "2026-10-02")).toEqual({
      fromDate: "2026-10-02",
      toDate: "2026-10-02",
    });
  });

  it("is Monday–Sunday for the week view", () => {
    expect(calendarWindow("week", "2026-10-02")).toEqual({
      fromDate: "2026-09-28",
      toDate: "2026-10-04",
    });
  });

  it("is the six-week grid for the month view", () => {
    expect(calendarWindow("month", "2026-10-02")).toEqual({
      fromDate: "2026-09-28",
      toDate: "2026-11-08",
    });
  });
});

describe("periodUtcWindow", () => {
  it("covers from local midnight to the midnight after the last date", () => {
    const window = periodUtcWindow("2026-10-01", "2026-10-02");
    expect(window.startUtc.toISOString()).toBe("2026-09-30T22:00:00.000Z");
    // Midnight ending 03/10 local, after the CEST→CET shift is a different
    // wall clock: 02/10 is still CEST.
    expect(window.endUtc.toISOString()).toBe("2026-10-02T22:00:00.000Z");
  });

  it("lands the end before the shift when the period ends on the shift day", () => {
    // 2026-10-25 is the Sunday Danish summer time ends (03:00→02:00).
    const window = periodUtcWindow("2026-10-25", "2026-10-25");
    expect(window.startUtc.toISOString()).toBe("2026-10-24T22:00:00.000Z");
    expect(window.endUtc.toISOString()).toBe("2026-10-25T23:00:00.000Z");
  });
});

describe("clampDate", () => {
  it("keeps a date inside the period", () => {
    expect(clampDate("2026-10-15", "2026-10-01", "2026-10-31")).toBe(
      "2026-10-15"
    );
  });

  it("moves an earlier date to the period's start and a later one to its end", () => {
    expect(clampDate("2026-09-01", "2026-10-01", "2026-10-31")).toBe(
      "2026-10-01"
    );
    expect(clampDate("2026-11-01", "2026-10-01", "2026-10-31")).toBe(
      "2026-10-31"
    );
  });
});
