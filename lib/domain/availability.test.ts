import { describe, expect, it } from "vitest";
import {
  endOptions,
  periodIsBookable,
  periodIsFree,
  periodsCollide,
  startSlots,
} from "./availability";
import type { SpecialClosingDay, WeeklyOpeningHours } from "./opening-hours";

// Open 09:00-18:00 Monday to Friday, closed at the weekend.
const weekly: WeeklyOpeningHours = [0, 1, 2, 3, 4].map((dayOfWeek) => ({
  closes: "18:00",
  dayOfWeek,
  isClosed: false,
  opens: "09:00",
}));

// Wednesday 2026-09-16 (CEST): 10:00 Copenhagen is 08:00Z.
const now = new Date("2026-09-16T05:00:00Z");
const booking = {
  endAt: new Date("2026-09-16T10:00:00Z"), // 12:00 local
  startAt: new Date("2026-09-16T08:00:00Z"), // 10:00 local
};

describe("periodsCollide", () => {
  it("collides when the intervals overlap", () => {
    expect(
      periodsCollide(booking, {
        endAt: new Date("2026-09-16T09:30:00Z"),
        startAt: new Date("2026-09-16T09:00:00Z"),
      })
    ).toBe(true);
  });

  it("collides inside the 30-minute buffer after the other booking", () => {
    // 12:00-12:30 local starts inside the buffer that runs to 12:30.
    expect(
      periodsCollide(booking, {
        endAt: new Date("2026-09-16T10:30:00Z"),
        startAt: new Date("2026-09-16T10:00:00Z"),
      })
    ).toBe(true);
  });

  it("does not collide once the buffer has passed", () => {
    expect(
      periodsCollide(booking, {
        endAt: new Date("2026-09-16T11:00:00Z"),
        startAt: new Date("2026-09-16T10:30:00Z"),
      })
    ).toBe(false);
  });

  it("applies the buffer in both directions", () => {
    // A 09:00-09:30 local booking's buffer runs to 10:00: touching, not colliding.
    expect(
      periodsCollide(booking, {
        endAt: new Date("2026-09-16T07:30:00Z"),
        startAt: new Date("2026-09-16T07:00:00Z"),
      })
    ).toBe(false);
    // 09:00-09:45 would have its buffer overlap the 10:00 start.
    expect(
      periodsCollide(booking, {
        endAt: new Date("2026-09-16T07:45:00Z"),
        startAt: new Date("2026-09-16T07:00:00Z"),
      })
    ).toBe(true);
  });
});

describe("periodIsFree", () => {
  it("is free with no blocked periods", () => {
    expect(periodIsFree(booking.startAt, booking.endAt, [])).toBe(true);
  });

  it("is not free when any blocked period collides", () => {
    expect(
      periodIsFree(booking.startAt, booking.endAt, [
        {
          endAt: new Date("2026-09-16T07:00:00Z"),
          startAt: new Date("2026-09-16T06:00:00Z"),
        },
        {
          endAt: new Date("2026-09-16T09:00:00Z"),
          startAt: new Date("2026-09-16T08:30:00Z"),
        },
      ])
    ).toBe(false);
  });
});

describe("periodIsBookable", () => {
  it("requires the booking and its buffer to fit the opening hours", () => {
    // 17:00-17:30 local: buffer ends 18:00, exactly at closing.
    expect(
      periodIsBookable({
        blocked: [],
        endAt: new Date("2026-09-16T15:30:00Z"),
        specialDays: [],
        startAt: new Date("2026-09-16T15:00:00Z"),
        weekly,
      })
    ).toBe(true);
    // 17:30-18:00 local: buffer would run past closing.
    expect(
      periodIsBookable({
        blocked: [],
        endAt: new Date("2026-09-16T16:00:00Z"),
        specialDays: [],
        startAt: new Date("2026-09-16T15:30:00Z"),
        weekly,
      })
    ).toBe(false);
  });

  it("is false on a closed day and when blocked", () => {
    // Saturday 2026-09-19.
    expect(
      periodIsBookable({
        blocked: [],
        endAt: new Date("2026-09-19T09:00:00Z"),
        specialDays: [],
        startAt: new Date("2026-09-19T08:00:00Z"),
        weekly,
      })
    ).toBe(false);
    expect(
      periodIsBookable({
        blocked: [booking],
        endAt: new Date("2026-09-16T09:00:00Z"),
        specialDays: [],
        startAt: new Date("2026-09-16T08:00:00Z"),
        weekly,
      })
    ).toBe(false);
  });
});

describe("startSlots", () => {
  const slots = startSlots({
    blocked: [booking],
    date: "2026-09-16",
    now,
    specialDays: [],
    weekly,
  });

  it("lists the fixed 09:00 to 21:30 grid in Copenhagen time", () => {
    expect(slots).toHaveLength(26);
    expect(slots[0].label).toBe("09:00");
    expect(slots[0].startAt.toISOString()).toBe("2026-09-16T07:00:00.000Z");
    expect(slots.at(-1)?.label).toBe("21:30");
  });

  const statusOf = (label: string) =>
    slots.find((slot) => slot.label === label)?.status;

  it("marks the booked slots and the buffer as blocked", () => {
    expect(statusOf("10:00")).toBe("blocked");
    expect(statusOf("11:30")).toBe("blocked");
    expect(statusOf("12:00")).toBe("blocked"); // buffer until 12:30
    expect(statusOf("12:30")).toBe("available");
  });

  it("marks the slot whose own buffer would hit the booking as blocked", () => {
    // 09:30-10:00 has its buffer running to 10:30, into the booking.
    expect(statusOf("09:30")).toBe("blocked");
    expect(statusOf("09:00")).toBe("available");
  });

  it("marks slots outside opening hours as closed", () => {
    // Closes 18:00: 17:00 is the last start whose 30 min + buffer fits.
    expect(statusOf("17:00")).toBe("available");
    expect(statusOf("17:30")).toBe("closed");
    expect(statusOf("21:30")).toBe("closed");
  });

  it("marks slots that have already started as past", () => {
    const later = startSlots({
      blocked: [],
      date: "2026-09-16",
      now: new Date("2026-09-16T11:00:00Z"), // 13:00 local
      specialDays: [],
      weekly,
    });
    expect(later.find((slot) => slot.label === "13:00")?.status).toBe("past");
    expect(later.find((slot) => slot.label === "13:30")?.status).toBe(
      "available"
    );
  });

  it("is all closed on a special closing day", () => {
    const special: SpecialClosingDay[] = [
      { closes: null, date: "2026-09-16", isClosed: true, opens: null },
    ];
    const closed = startSlots({
      blocked: [],
      date: "2026-09-16",
      now,
      specialDays: special,
      weekly,
    });
    expect(closed.every((slot) => slot.status === "closed")).toBe(true);
  });
});

describe("endOptions", () => {
  it("runs in 30-minute steps until the next block's buffer or closing", () => {
    // Start 13:00 local; the room closes 18:00, so the last end is 17:30.
    const ends = endOptions({
      blocked: [],
      specialDays: [],
      startAt: new Date("2026-09-16T11:00:00Z"),
      weekly,
    });
    expect(ends.map((end) => end.toISOString())).toEqual([
      "2026-09-16T11:30:00.000Z",
      "2026-09-16T12:00:00.000Z",
      "2026-09-16T12:30:00.000Z",
      "2026-09-16T13:00:00.000Z",
      "2026-09-16T13:30:00.000Z",
      "2026-09-16T14:00:00.000Z",
      "2026-09-16T14:30:00.000Z",
      "2026-09-16T15:00:00.000Z",
      "2026-09-16T15:30:00.000Z",
    ]);
  });

  it("stops before a later booking, leaving room for the buffer", () => {
    // Start 09:00 local, booking at 10:00: only 09:30 fits (buffer to 10:00).
    const ends = endOptions({
      blocked: [booking],
      specialDays: [],
      startAt: new Date("2026-09-16T07:00:00Z"),
      weekly,
    });
    expect(ends.map((end) => end.toISOString())).toEqual([
      "2026-09-16T07:30:00.000Z",
    ]);
  });

  it("is empty when even 30 minutes do not fit", () => {
    expect(
      endOptions({
        blocked: [],
        specialDays: [],
        startAt: new Date("2026-09-16T15:30:00Z"), // 17:30 local
        weekly,
      })
    ).toEqual([]);
  });
});
