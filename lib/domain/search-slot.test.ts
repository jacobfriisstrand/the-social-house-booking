import { describe, expect, it } from "vitest";
import { defaultSearchSlot, searchSlotOn, startsInPast } from "./search-slot";

const at = (iso: string) => new Date(iso);

describe("defaultSearchSlot", () => {
  it("starts at the next half hour still ahead, for one hour", () => {
    expect(defaultSearchSlot(at("2026-10-14T13:05:00+02:00"))).toEqual({
      date: "2026-10-14",
      from: "13:30",
      to: "14:30",
    });
  });

  it("skips a slot that starts right now", () => {
    expect(defaultSearchSlot(at("2026-10-14T13:00:00+02:00")).from).toBe(
      "13:30"
    );
  });

  it("starts at the grid's opening before it", () => {
    expect(defaultSearchSlot(at("2026-10-14T06:40:00+02:00"))).toEqual({
      date: "2026-10-14",
      from: "09:00",
      to: "10:00",
    });
  });

  it("moves to tomorrow once the hour no longer fits today", () => {
    expect(defaultSearchSlot(at("2026-10-14T21:05:00+02:00"))).toEqual({
      date: "2026-10-15",
      from: "09:00",
      to: "10:00",
    });
  });

  it("reads the date in Copenhagen and crosses the month", () => {
    // 31 October 23:30 UTC is already 1 November in Copenhagen (CET).
    expect(defaultSearchSlot(at("2026-10-31T23:30:00Z")).date).toBe(
      "2026-11-01"
    );
    expect(defaultSearchSlot(at("2026-10-31T22:30:00+01:00")).date).toBe(
      "2026-11-01"
    );
  });
});

describe("searchSlotOn", () => {
  const now = at("2026-10-14T13:05:00+02:00");

  it("starts today at the next slot still ahead", () => {
    expect(searchSlotOn("2026-10-14", now)).toEqual({
      date: "2026-10-14",
      from: "13:30",
      to: "14:30",
    });
  });

  it("starts a later day at the grid's start", () => {
    expect(searchSlotOn("2026-10-20", now)).toEqual({
      date: "2026-10-20",
      from: "09:00",
      to: "10:00",
    });
  });

  it("keeps a chosen day that is over, at the grid's start", () => {
    const late = at("2026-10-14T21:30:00+02:00");
    expect(searchSlotOn("2026-10-14", late)).toEqual({
      date: "2026-10-14",
      from: "09:00",
      to: "10:00",
    });
  });
});

describe("startsInPast", () => {
  const now = at("2026-10-14T19:05:00+02:00");

  it("is true for a start at or before now, in Copenhagen time", () => {
    expect(startsInPast("2026-10-14", "09:00", now)).toBe(true);
    expect(startsInPast("2026-10-14", "19:00", now)).toBe(true);
  });

  it("is false for a later start", () => {
    expect(startsInPast("2026-10-14", "19:30", now)).toBe(false);
    expect(startsInPast("2026-10-15", "09:00", now)).toBe(false);
  });
});
