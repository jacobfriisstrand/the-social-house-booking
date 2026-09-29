import { describe, expect, it } from "vitest";
import {
  dayGridColumn,
  GRID_ROW_COUNT,
  type GridCell,
  gridSpan,
  roomStatusAt,
} from "./day-grid";
import type { WeeklyOpeningHours } from "./opening-hours";

// Open 09:00-18:00 every day of the week.
const weekly: WeeklyOpeningHours = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  closes: "18:00",
  dayOfWeek,
  isClosed: false,
  opens: "09:00",
}));

// Wednesday 2026-09-16 is CEST: 09:00 Copenhagen is 07:00Z.
const date = "2026-09-16";
const booking = {
  endAt: new Date("2026-09-16T10:00:00Z"), // 12:00 local
  id: "booking-1",
  startAt: new Date("2026-09-16T08:00:00Z"), // 10:00 local
};
const earlyMorning = new Date("2026-09-16T04:00:00Z"); // 06:00 local

const slotAt = (cells: GridCell[], row: number) =>
  cells.find((cell) => cell.kind === "slot" && cell.row === row);

describe("gridSpan", () => {
  it("places a period on its 30-minute rows counted from 09:00", () => {
    expect(gridSpan(date, booking)).toEqual({ firstRow: 2, rowSpan: 4 });
  });

  it("counts from 09:00 on the date that leaves summer time", () => {
    // 2026-10-25 is CET after 03:00: 10:00-12:00 local is 09:00Z-11:00Z.
    expect(
      gridSpan("2026-10-25", {
        endAt: new Date("2026-10-25T11:00:00Z"),
        startAt: new Date("2026-10-25T09:00:00Z"),
      })
    ).toEqual({ firstRow: 2, rowSpan: 4 });
  });

  it("clips a period that starts before 09:00 or ends after 22:00", () => {
    expect(
      gridSpan(date, {
        endAt: new Date("2026-09-16T21:00:00Z"), // 23:00 local
        startAt: new Date("2026-09-16T05:00:00Z"), // 07:00 local
      })
    ).toEqual({ firstRow: 0, rowSpan: GRID_ROW_COUNT });
  });

  it("widens an off-grid period to whole rows", () => {
    expect(
      gridSpan(date, {
        endAt: new Date("2026-09-16T08:40:00Z"), // 10:40 local
        startAt: new Date("2026-09-16T08:10:00Z"), // 10:10 local
      })
    ).toEqual({ firstRow: 2, rowSpan: 2 });
  });

  it("is null for a period wholly outside the grid", () => {
    expect(
      gridSpan(date, {
        endAt: new Date("2026-09-16T06:30:00Z"), // 08:30 local
        startAt: new Date("2026-09-16T06:00:00Z"), // 08:00 local
      })
    ).toBeNull();
  });
});

describe("dayGridColumn", () => {
  const cells = dayGridColumn({
    date,
    entries: [booking],
    now: earlyMorning,
    specialDays: [],
    weekly,
  });

  it("places the entry and the 30-minute buffer right below it", () => {
    expect(cells).toContainEqual({
      entryId: "booking-1",
      firstRow: 2,
      kind: "entry",
      rowSpan: 4,
    });
    expect(cells).toContainEqual({ firstRow: 6, kind: "buffer", rowSpan: 1 });
  });

  it("fills every other row with a slot, in row order", () => {
    const rows = cells.map((cell) =>
      cell.kind === "slot" ? cell.row : cell.firstRow
    );
    expect(rows).toEqual([...rows].sort((a, b) => a - b));
    expect(cells.filter((cell) => cell.kind === "slot")).toHaveLength(
      GRID_ROW_COUNT - 5
    );
  });

  it("marks a free open slot available and says why the others are not", () => {
    // 09:00-09:30 plus its buffer ends exactly at the 10:00 start, so it
    // fits; from 09:30 the buffer would run into the booking.
    expect(slotAt(cells, 0)).toMatchObject({
      label: "09:00",
      status: "available",
    });
    expect(slotAt(cells, 1)).toMatchObject({
      label: "09:30",
      status: "blocked",
    });
    expect(slotAt(cells, 7)).toMatchObject({
      label: "12:30",
      status: "available",
    });
    // 17:30: the booking plus its buffer would pass the 18:00 close.
    expect(slotAt(cells, 17)).toMatchObject({ status: "closed" });
  });

  it("marks slots that have started as past", () => {
    const afternoon = dayGridColumn({
      date,
      entries: [],
      now: new Date("2026-09-16T11:00:00Z"), // 13:00 local
      specialDays: [],
      weekly,
    });
    expect(slotAt(afternoon, 8)).toMatchObject({ status: "past" });
    expect(slotAt(afternoon, 9)).toMatchObject({ status: "available" });
  });

  it("shows the buffer of an entry that ended just before 09:00", () => {
    const column = dayGridColumn({
      date,
      entries: [
        {
          endAt: new Date("2026-09-16T07:00:00Z"), // 09:00 local
          id: "early",
          startAt: new Date("2026-09-16T06:00:00Z"), // 08:00 local
        },
      ],
      now: earlyMorning,
      specialDays: [],
      weekly,
    });
    expect(column[0]).toEqual({ firstRow: 0, kind: "buffer", rowSpan: 1 });
  });
});

describe("roomStatusAt", () => {
  const room = { entries: [booking], specialDays: [], weekly };

  it("is occupied until the end of what is on, without the buffer", () => {
    expect(
      roomStatusAt({ ...room, now: new Date("2026-09-16T09:00:00Z") })
    ).toEqual({ freeAt: booking.endAt, kind: "occupied" });
  });

  it("is free from the booking's end, while the buffer still runs", () => {
    expect(
      roomStatusAt({ ...room, now: new Date("2026-09-16T10:10:00Z") })
    ).toEqual({ kind: "free" });
  });

  it("is occupied from the booking's first minute", () => {
    expect(roomStatusAt({ ...room, now: booking.startAt })).toMatchObject({
      kind: "occupied",
    });
  });

  it("is closed outside opening hours", () => {
    expect(roomStatusAt({ ...room, now: earlyMorning })).toEqual({
      kind: "closed",
    });
  });

  it("is closed on a special closing day", () => {
    expect(
      roomStatusAt({
        ...room,
        now: new Date("2026-09-16T12:00:00Z"),
        specialDays: [{ closes: null, date, isClosed: true, opens: null }],
      })
    ).toEqual({ kind: "closed" });
  });
});
