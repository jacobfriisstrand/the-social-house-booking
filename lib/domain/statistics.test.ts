import { describe, expect, it } from "vitest";
import { outstandingInvoiceBasisOre } from "./booking-invoicing";
import {
  monthOf,
  percentChange,
  type StatisticsBooking,
  shiftMonth,
  statisticsOverview,
  statisticsWindow,
} from "./statistics";

// 10 October 2026, 12:00 in Copenhagen (CEST).
const now = new Date("2026-10-10T10:00:00+02:00");

// A held meeting in September: 2 hours, 1.000 kr room rent after discount
// plus 350 kr add-ons.
const held: StatisticsBooking = {
  addonTotalOre: 35_000,
  cancellationFeeOre: null,
  cancellationFeeWaived: false,
  endAt: "2026-09-15T12:00:00+02:00",
  expectedTotalOre: 135_000,
  invoicingStatus: "not_invoiced",
  manualAmountsOre: 0,
  membership: "member",
  startAt: "2026-09-15T10:00:00+02:00",
  status: "confirmed",
};

const cancelled: StatisticsBooking = {
  ...held,
  addonTotalOre: 0,
  cancellationFeeOre: 50_000,
  expectedTotalOre: 100_000,
  status: "cancelled",
};

const september = (bookings: StatisticsBooking[]) =>
  statisticsOverview(bookings, "2026-09", now).current;

describe("monthOf", () => {
  it("reads the month in Copenhagen, not UTC", () => {
    expect(monthOf(new Date("2026-09-30T22:30:00Z"))).toBe("2026-10");
    expect(monthOf(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01");
  });

  it("follows summer time after the March switch", () => {
    expect(monthOf(new Date("2026-03-31T22:30:00Z"))).toBe("2026-04");
    expect(monthOf(new Date("2026-03-31T21:30:00Z"))).toBe("2026-03");
  });
});

describe("shiftMonth", () => {
  it("moves within a year", () => {
    expect(shiftMonth("2026-09", 1)).toBe("2026-10");
    expect(shiftMonth("2026-09", -8)).toBe("2026-01");
  });

  it("crosses the turn of the year both ways", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
});

describe("statisticsWindow", () => {
  it("covers the year and the December before it, Copenhagen midnight", () => {
    const { from, to } = statisticsWindow("2026-03");
    expect(from.toISOString()).toBe("2025-11-30T23:00:00.000Z");
    expect(to.toISOString()).toBe("2026-12-31T23:00:00.000Z");
  });
});

describe("percentChange", () => {
  it("is the change as a fraction of last month", () => {
    expect(percentChange(110, 100)).toBeCloseTo(0.1);
    expect(percentChange(75, 100)).toBeCloseTo(-0.25);
    expect(percentChange(100, 100)).toBe(0);
  });

  it("has nothing to compare against when last month was zero", () => {
    expect(percentChange(5, 0)).toBeNull();
    expect(percentChange(0, 0)).toBeNull();
  });
});

describe("statisticsOverview", () => {
  it("counts a held meeting and splits its basis into parts", () => {
    const stats = september([{ ...held, manualAmountsOre: 20_000 }]);
    expect(stats).toMatchObject({
      addonsOre: 35_000,
      basisOre: 155_000,
      bookings: 1,
      cancellationFeesOre: 0,
      cancellations: 0,
      externalBasisOre: 0,
      manualAmountsOre: 20_000,
      memberBasisOre: 155_000,
      roomMinutes: 120,
      roomRentOre: 100_000,
    });
  });

  it("adds the same basis as the invoicing worklist", () => {
    const bookings = [
      { ...held, manualAmountsOre: 20_000 },
      cancelled,
      { ...cancelled, cancellationFeeWaived: true },
    ];
    const worklistTotal = bookings
      .map((booking) =>
        outstandingInvoiceBasisOre({
          cancellationFeeOre: booking.cancellationFeeOre,
          expectedTotalOre: booking.expectedTotalOre,
          manualAmountsOre: booking.manualAmountsOre,
          status: booking.status,
          waived: booking.cancellationFeeWaived,
        })
      )
      .reduce((sum, basis) => sum + basis, 0);
    expect(september(bookings).basisOre).toBe(worklistTotal);
  });

  it("counts a cancellation and only its payable fee", () => {
    const stats = september([
      cancelled,
      { ...cancelled, cancellationFeeWaived: true },
      { ...cancelled, cancellationFeeOre: null },
    ]);
    expect(stats).toMatchObject({
      basisOre: 50_000,
      bookings: 0,
      cancellationFeesOre: 50_000,
      cancellations: 3,
      roomMinutes: 0,
    });
  });

  it("keeps a not-invoicable booking in the counts and out of the amounts", () => {
    const stats = september([{ ...held, invoicingStatus: "not_invoicable" }]);
    expect(stats).toMatchObject({
      basisOre: 0,
      bookings: 1,
      memberBasisOre: 0,
      roomMinutes: 120,
      roomRentOre: 0,
    });
  });

  it("counts invoiced bookings in the month's basis", () => {
    const stats = september([{ ...held, invoicingStatus: "invoiced" }]);
    expect(stats.basisOre).toBe(135_000);
  });

  it("splits the basis between member and external companies", () => {
    const stats = september([held, { ...held, membership: "external" }]);
    expect(stats.memberBasisOre).toBe(135_000);
    expect(stats.externalBasisOre).toBe(135_000);
  });

  it("shows a meeting not yet over as expected, never in the basis", () => {
    const later: StatisticsBooking = {
      ...held,
      endAt: "2026-10-20T12:00:00+02:00",
      startAt: "2026-10-20T10:00:00+02:00",
    };
    const october = statisticsOverview(
      [
        later,
        { ...later, ...cancelled, endAt: later.endAt, startAt: later.startAt },
      ],
      "2026-10",
      now
    ).current;
    expect(october).toMatchObject({
      basisOre: 0,
      bookings: 0,
      cancellations: 0,
      expectedBookings: 1,
      expectedOre: 185_000,
      roomMinutes: 0,
    });
  });

  it("treats a meeting in progress as not finished", () => {
    const running: StatisticsBooking = {
      ...held,
      endAt: "2026-10-10T13:00:00+02:00",
      startAt: "2026-10-10T11:00:00+02:00",
    };
    const october = statisticsOverview([running], "2026-10", now).current;
    expect(october.bookings).toBe(0);
    expect(october.expectedOre).toBe(135_000);
  });

  it("measures room hours in real time across the October switch", () => {
    // 25 October 2026: clocks go back at 03:00, so 00:00–04:00 is 5 hours.
    const night: StatisticsBooking = {
      ...held,
      endAt: "2026-10-25T04:00:00+01:00",
      startAt: "2026-10-25T00:00:00+02:00",
    };
    const later = new Date("2026-11-01T12:00:00+01:00");
    expect(
      statisticsOverview([night], "2026-10", later).current.roomMinutes
    ).toBe(300);
  });

  it("places a booking in the Copenhagen month it starts in", () => {
    const midnight: StatisticsBooking = {
      ...held,
      endAt: "2026-09-01T02:00:00+02:00",
      startAt: "2026-09-01T00:00:00+02:00",
    };
    const { current, previous } = statisticsOverview(
      [midnight],
      "2026-09",
      now
    );
    expect(current.bookings).toBe(1);
    expect(previous.bookings).toBe(0);
  });

  it("compares January with the December before it", () => {
    const december: StatisticsBooking = {
      ...held,
      endAt: "2025-12-10T12:00:00+01:00",
      startAt: "2025-12-10T10:00:00+01:00",
    };
    const { previous } = statisticsOverview([december], "2026-01", now);
    expect(previous.bookings).toBe(1);
  });

  it("returns empty months when nothing was booked", () => {
    const { current, previous } = statisticsOverview([], "2026-09", now);
    expect(current.basisOre).toBe(0);
    expect(previous.bookings).toBe(0);
  });

  it("lists the year month by month, with no data after this month", () => {
    const { year } = statisticsOverview([held, cancelled], "2026-03", now);
    expect(year.map((point) => point.month)).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
    ]);
    expect(year[0]).toEqual({
      basisOre: 0,
      bookings: 0,
      cancellations: 0,
      month: "2026-01",
    });
    expect(year[8]).toEqual({
      basisOre: 185_000,
      bookings: 1,
      cancellations: 1,
      month: "2026-09",
    });
    expect(year[9].bookings).toBe(0);
    expect(year[10]).toEqual({
      basisOre: null,
      bookings: null,
      cancellations: null,
      month: "2026-11",
    });
  });
});
