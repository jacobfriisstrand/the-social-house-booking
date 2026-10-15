// The URL params both Bookinger pages share: the room and booking-state
// multi-selects, the date range, and the sort. Unknown values are no
// filter, and the writers carry only what deviates from the defaults.
import { describe, expect, it } from "vitest";
import {
  appendValues,
  hasListFilters,
  parseListFilters,
  parseSort,
  setPeriodRange,
  setSort,
} from "./view-params";

describe("parseListFilters", () => {
  it("reads no filter from an empty URL", () => {
    expect(parseListFilters({})).toEqual({
      bookingStates: [],
      invoicingStatuses: [],
      roomIds: [],
    });
  });

  it("reads repeated params as a multi-select's selection", () => {
    const filters = parseListFilters({
      room: ["r1", "", "r2"],
      state: ["upcoming", "ghost", "cancelled"],
      status: ["maybe", "invoiced"],
    });
    expect(filters.roomIds).toEqual(["r1", "r2"]);
    expect(filters.invoicingStatuses).toEqual(["invoiced"]);
    expect(filters.bookingStates).toEqual(["upcoming", "cancelled"]);
  });

  it("reads the date range, one end standing for the single day", () => {
    expect(
      parseListFilters({ periodFrom: "2026-10-05", periodTo: "2026-10-09" })
    ).toMatchObject({ periodFrom: "2026-10-05", periodTo: "2026-10-09" });
    expect(parseListFilters({ periodFrom: "2026-10-05" })).toMatchObject({
      periodFrom: "2026-10-05",
      periodTo: "2026-10-05",
    });
    expect(parseListFilters({ periodTo: "2026-10-09" })).toMatchObject({
      periodFrom: "2026-10-09",
      periodTo: "2026-10-09",
    });
  });

  it("swaps reversed ends and drops garbage dates", () => {
    expect(
      parseListFilters({ periodFrom: "2026-10-09", periodTo: "2026-10-05" })
    ).toMatchObject({ periodFrom: "2026-10-05", periodTo: "2026-10-09" });
    const garbage = parseListFilters({ periodFrom: "05/10/2026" });
    expect(garbage.periodFrom).toBeUndefined();
    expect(garbage.periodTo).toBeUndefined();
  });
});

describe("hasListFilters", () => {
  it("is off for an empty URL and on for any one filter", () => {
    expect(hasListFilters(parseListFilters({}))).toBe(false);
    expect(hasListFilters(parseListFilters({ room: "r1" }))).toBe(true);
    expect(hasListFilters(parseListFilters({ status: "invoiced" }))).toBe(true);
    expect(hasListFilters(parseListFilters({ state: "upcoming" }))).toBe(true);
    expect(hasListFilters(parseListFilters({ periodFrom: "2026-10-05" }))).toBe(
      true
    );
  });
});

describe("parseSort", () => {
  const keys = ["date", "room"] as const;

  it("reads a known column and the descending direction", () => {
    expect(parseSort({ dir: "desc", sort: "room" }, keys, "date")).toEqual({
      sort: "room",
      sortDir: "desc",
    });
  });

  it("falls back to the default column, ascending", () => {
    expect(parseSort({ dir: "up", sort: "vibes" }, keys, "date")).toEqual({
      sort: "date",
      sortDir: "asc",
    });
  });
});

describe("the writers", () => {
  it("repeat a selection and carry only what deviates", () => {
    const search = new URLSearchParams();
    appendValues(search, "room", ["r1", "r2"]);
    setPeriodRange(search, { periodFrom: undefined, periodTo: undefined });
    setSort(search, { sort: "date", sortDir: "asc" }, "date");
    expect(search.toString()).toBe("room=r1&room=r2");
  });

  it("write a picked range and a changed sort", () => {
    const search = new URLSearchParams();
    setPeriodRange(search, {
      periodFrom: "2026-10-05",
      periodTo: "2026-10-09",
    });
    setSort(search, { sort: "room", sortDir: "desc" }, "date");
    expect(search.toString()).toBe(
      "periodFrom=2026-10-05&periodTo=2026-10-09&sort=room&dir=desc"
    );
  });
});
