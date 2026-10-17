import { describe, expect, it } from "vitest";
import type { WeeklyOpeningHour } from "./opening-hours";
import type { StatisticsBooking } from "./statistics";
import { statisticsOverview } from "./statistics";
import {
  companyUsage,
  occupancy,
  openMinutesInMonth,
  roomUsage,
  type StatisticsRoom,
} from "./statistics-usage";

// Wednesday 14 October 2026, 12:00 in Copenhagen (CEST).
const now = new Date("2026-10-14T12:00:00+02:00");

// A held two-hour meeting: 1.000 kr room rent plus 350 kr add-ons.
const held: StatisticsBooking = {
  addonTotalOre: 35_000,
  cancellationFeeOre: null,
  cancellationFeeWaived: false,
  companyId: "rituals",
  companyName: "Rituals",
  endAt: "2026-10-05T12:00:00+02:00",
  expectedTotalOre: 135_000,
  invoicingStatus: "not_invoiced",
  manualAmountsOre: 0,
  membership: "member",
  participants: 8,
  roomId: "power",
  startAt: "2026-10-05T10:00:00+02:00",
  status: "confirmed",
};

const cancelled: StatisticsBooking = {
  ...held,
  addonTotalOre: 0,
  cancellationFeeOre: 50_000,
  status: "cancelled",
};

// Open 09:00 - 17:00 on weekdays, closed at the weekend.
const weekdays: WeeklyOpeningHour[] = Array.from({ length: 7 }, (_, day) => ({
  closes: "17:00",
  dayOfWeek: day,
  isClosed: day > 4,
  opens: "09:00",
}));

const room = (
  roomId: string,
  name: string,
  isActive = true
): StatisticsRoom => ({
  isActive,
  name,
  roomId,
  specialDays: [],
  weekly: weekdays,
});

const rooms = [room("power", "Room of Power"), room("art", "Room of Art")];

describe("openMinutesInMonth", () => {
  it("counts every open weekday of a past month", () => {
    // September 2026 has 22 weekdays of 8 hours.
    expect(openMinutesInMonth(rooms[0], "2026-09", now)).toBe(22 * 8 * 60);
  });

  it("stops at now: today counts up to noon, later days not at all", () => {
    // 1 - 13 October hold 9 weekdays; the 14th is open 09:00 - 12:00.
    expect(openMinutesInMonth(rooms[0], "2026-10", now)).toBe(
      9 * 8 * 60 + 3 * 60
    );
  });

  it("follows a special closing day over the weekday", () => {
    const closedMonday = {
      ...rooms[0],
      specialDays: [
        { closes: null, date: "2026-09-07", isClosed: true, opens: null },
      ],
    };
    expect(openMinutesInMonth(closedMonday, "2026-09", now)).toBe(21 * 8 * 60);
  });

  it("is zero for a month that has not started", () => {
    expect(openMinutesInMonth(rooms[0], "2026-11", now)).toBe(0);
  });
});

describe("occupancy", () => {
  it("is held time over open time, and null before any open time", () => {
    expect(occupancy(120, 480)).toBe(0.25);
    expect(occupancy(0, 0)).toBeNull();
  });
});

describe("roomUsage", () => {
  it("counts held meetings and cancellations per room, most hours first", () => {
    const usage = roomUsage(
      [
        held,
        cancelled,
        { ...held, roomId: "art", startAt: "2026-10-05T11:00:00+02:00" },
      ],
      rooms,
      "2026-10",
      now
    );
    expect(usage.map((row) => row.name)).toEqual([
      "Room of Power",
      "Room of Art",
    ]);
    expect(usage[0]).toMatchObject({
      basisOre: 135_000 + 50_000,
      bookings: 1,
      cancellations: 1,
      minutes: 120,
    });
    expect(usage[1]).toMatchObject({ bookings: 1, minutes: 60 });
  });

  it("leaves out meetings not yet over and other months", () => {
    const usage = roomUsage(
      [
        {
          ...held,
          endAt: "2026-10-20T12:00:00+02:00",
          startAt: "2026-10-20T10:00:00+02:00",
        },
        {
          ...held,
          endAt: "2026-09-05T12:00:00+02:00",
          startAt: "2026-09-05T10:00:00+02:00",
        },
      ],
      rooms,
      "2026-10",
      now
    );
    expect(usage.every((row) => row.bookings === 0)).toBe(true);
  });

  it("counts a not invoicable booking but adds no amount", () => {
    const [power] = roomUsage(
      [{ ...held, invoicingStatus: "not_invoicable" }],
      rooms,
      "2026-10",
      now
    );
    expect(power).toMatchObject({ basisOre: 0, bookings: 1, minutes: 120 });
  });

  it("lists an inactive room only when it had bookings", () => {
    const withOld = [...rooms, room("old", "Room of Old", false)];
    expect(roomUsage([], withOld, "2026-10", now)).toHaveLength(2);
    expect(
      roomUsage([{ ...held, roomId: "old" }], withOld, "2026-10", now)
    ).toHaveLength(3);
  });

  it("adds up to the month's stat cards", () => {
    const bookings = [held, cancelled, { ...held, roomId: "art" }];
    const usage = roomUsage(bookings, rooms, "2026-10", now);
    const { current } = statisticsOverview(bookings, "2026-10", now);
    const sum = (key: "basisOre" | "bookings" | "cancellations") =>
      usage.reduce((total, row) => total + row[key], 0);
    expect(sum("bookings")).toBe(current.bookings);
    expect(sum("cancellations")).toBe(current.cancellations);
    expect(sum("basisOre")).toBe(current.basisOre);
  });
});

describe("companyUsage", () => {
  it("groups by company with its membership, most bookings first", () => {
    const nordic = {
      ...held,
      companyId: "nordic",
      companyName: "Nordic Events",
      membership: "external" as const,
    };
    const usage = companyUsage(
      [held, nordic, nordic, cancelled],
      "2026-10",
      now
    );
    expect(
      usage.map((row) => [row.name, row.bookings, row.membership])
    ).toEqual([
      ["Nordic Events", 2, "external"],
      ["Rituals", 1, "member"],
    ]);
    expect(usage[1].cancellations).toBe(1);
  });

  it("is empty for a month without finished bookings", () => {
    expect(companyUsage([held], "2026-11", now)).toEqual([]);
  });

  it("averages the guests of the held meetings per company (#118)", () => {
    const small = { ...held, participants: 4 };
    const other = {
      ...held,
      companyId: "nordic",
      companyName: "Nordic Events",
      membership: "external" as const,
      participants: 2,
    };
    const usage = companyUsage(
      [held, small, other, other, cancelled],
      "2026-10",
      now
    );
    const rows = new Map(usage.map((row) => [row.companyId, row]));
    // Rituals: one 8-guest meeting and one 4-guest meeting.
    expect(rows.get("rituals")?.averageParticipants).toBe(6);
    // Nordic: two 2-guest meetings.
    expect(rows.get("nordic")?.averageParticipants).toBe(2);
  });

  it("excludes cancelled meetings from the guests average", () => {
    // The cancelled booking carries no held meeting, so it neither adds
    // guests nor meetings; the one held meeting averages over itself.
    const usage = companyUsage([held, cancelled], "2026-10", now);
    expect(usage[0].averageParticipants).toBe(8);
  });

  it("has no guests average for a company with only cancellations", () => {
    const usage = companyUsage([cancelled], "2026-10", now);
    expect(usage[0].bookings).toBe(0);
    expect(usage[0].averageParticipants).toBeNull();
  });
});
