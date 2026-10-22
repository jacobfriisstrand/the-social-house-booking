// The member booking overview (#8) with the admin overview's filter row
// and sorting (#9): the booking-state buckets cut on the end instant,
// expired holds never listed, an empty selection is no filter, and the
// columns sort by what their cells show.
import { describe, expect, it } from "vitest";
import {
  addOnsTotalOre,
  type BookingAddonOverview,
  type BookingOverviewEntry,
  type BookingOverviewRow,
  type BookingOverviewStatus,
  bookingStateBucket,
  filterBookingOverview,
  sortBookingOverview,
} from "./booking-overview";

const now = new Date("2026-09-20T10:00:00Z");

const booking = (
  bookingId: string,
  bookingStartAt: string,
  overrides: Partial<BookingOverviewEntry> = {}
): BookingOverviewEntry => ({
  bookingHoldExpiresAt: null,
  bookingId,
  bookingStartAt,
  bookingStatus: "confirmed",
  // One hour long unless the case says otherwise.
  endAt: new Date(Date.parse(bookingStartAt) + 3_600_000).toISOString(),
  invoicingStatus: "not_invoiced",
  roomId: "r1",
  ...overrides,
});

const ids = (rows: readonly { bookingId: string }[]): string[] =>
  rows.map((row) => row.bookingId);

const noFilter = { bookingStates: [], invoicingStatuses: [], roomIds: [] };

describe("bookingStateBucket", () => {
  it("files cancelled bookings as cancelled whatever their date", () => {
    const status: BookingOverviewStatus = "cancelled";
    expect(
      bookingStateBucket(
        booking("future", "2026-09-25T10:00:00Z", { bookingStatus: status }),
        now
      )
    ).toBe("cancelled");
    expect(
      bookingStateBucket(
        booking("past", "2026-09-10T10:00:00Z", { bookingStatus: status }),
        now
      )
    ).toBe("cancelled");
  });

  it("cuts on the end instant: a running meeting is still upcoming", () => {
    const running = booking("running", "2026-09-20T09:30:00Z");
    expect(bookingStateBucket(running, now)).toBe("upcoming");
    const endsNow = booking("ends-now", "2026-09-20T09:00:00Z");
    expect(bookingStateBucket(endsNow, now)).toBe("upcoming");
    const ended = booking("ended", "2026-09-20T08:59:59Z");
    expect(bookingStateBucket(ended, now)).toBe("finished");
  });

  it("files a standing hold as upcoming", () => {
    const hold = booking("hold", "2026-09-21T10:00:00Z", {
      bookingHoldExpiresAt: "2026-09-20T10:05:00Z",
      bookingStatus: "pending_verification",
    });
    expect(bookingStateBucket(hold, now)).toBe("upcoming");
  });

  it("never lists an expired booking or a hold that ran out", () => {
    const expired = booking("expired", "2026-09-25T10:00:00Z", {
      bookingStatus: "expired",
    });
    const staleHold = booking("stale-hold", "2026-09-25T10:30:00Z", {
      bookingHoldExpiresAt: "2026-09-20T09:59:59Z",
      bookingStatus: "pending_verification",
    });
    expect(bookingStateBucket(expired, now)).toBeNull();
    expect(bookingStateBucket(staleHold, now)).toBeNull();
  });
});

describe("filterBookingOverview", () => {
  const rows = [
    booking("past-r1", "2026-09-10T10:00:00Z", { invoicingStatus: "invoiced" }),
    booking("next-r2", "2026-09-22T10:00:00Z", { roomId: "r2" }),
    booking("cancelled-r1", "2026-09-25T10:00:00Z", {
      bookingStatus: "cancelled",
    }),
    booking("expired", "2026-09-25T12:00:00Z", { bookingStatus: "expired" }),
  ];

  it("keeps every listed booking, in the given order, without a filter", () => {
    expect(ids(filterBookingOverview(rows, noFilter, now))).toEqual([
      "past-r1",
      "next-r2",
      "cancelled-r1",
    ]);
  });

  it("keeps the ticked buckets", () => {
    expect(
      ids(
        filterBookingOverview(
          rows,
          { ...noFilter, bookingStates: ["finished", "cancelled"] },
          now
        )
      )
    ).toEqual(["past-r1", "cancelled-r1"]);
  });

  it("keeps the ticked rooms, intersected with the buckets", () => {
    expect(
      ids(
        filterBookingOverview(
          rows,
          {
            ...noFilter,
            bookingStates: ["upcoming", "cancelled"],
            roomIds: ["r1"],
          },
          now
        )
      )
    ).toEqual(["cancelled-r1"]);
  });

  it("keeps the ticked invoicing statuses", () => {
    expect(
      ids(
        filterBookingOverview(
          rows,
          { ...noFilter, invoicingStatuses: ["invoiced"] },
          now
        )
      )
    ).toEqual(["past-r1"]);
  });

  it("keeps bookings starting within the Copenhagen date range", () => {
    // 21/09 00:00 in Copenhagen is 20/09 22:00 UTC: a booking at 23:30
    // UTC on the 20th starts on the 21st locally.
    const lateEvening = booking("late-evening", "2026-09-20T23:30:00Z");
    expect(
      ids(
        filterBookingOverview(
          [...rows, lateEvening],
          { ...noFilter, periodFrom: "2026-09-21", periodTo: "2026-09-22" },
          now
        )
      )
    ).toEqual(["next-r2", "late-evening"]);
  });

  it("applies no range unless both ends are set", () => {
    expect(
      filterBookingOverview(
        rows,
        { ...noFilter, periodFrom: "2026-09-21" },
        now
      )
    ).toHaveLength(3);
  });
});

describe("sortBookingOverview", () => {
  const row = (
    bookingId: string,
    bookingStartAt: string,
    overrides: Partial<BookingOverviewRow> = {}
  ): BookingOverviewRow => ({
    ...booking(bookingId, bookingStartAt),
    addOns: [],
    bookerName: "Anna",
    bookingNumber: bookingId,
    cancellationFeeOre: null,
    cancellationPolicy: {
      mayCancel: false,
      refusal: "not_cancellable",
    },
    cancelledAt: null,
    invoiceDate: null,
    invoiceNumber: null,
    price: {
      addOnLines: [],
      addOnsOre: 0,
      discountPercent: 0,
      manualAmounts: [],
      roomMemberTotalOre: 100_000,
      roomNormalTotalOre: 100_000,
      savingsOre: 0,
      showSavings: false,
      totalOre: 100_000,
    },
    roomName: "Room of Power",
    ...overrides,
  });

  it("sorts by date ascending with the oldest first", () => {
    const rows = [
      row("later", "2026-09-22T10:00:00Z"),
      row("earlier", "2026-09-12T10:00:00Z"),
    ];
    expect(ids(sortBookingOverview(rows, "date", "asc"))).toEqual([
      "earlier",
      "later",
    ]);
    expect(ids(sortBookingOverview(rows, "date", "desc"))).toEqual([
      "later",
      "earlier",
    ]);
  });

  it("sorts text columns in Danish order", () => {
    const rows = [
      row("a", "2026-09-12T10:00:00Z", { roomName: "Room of Relations" }),
      row("b", "2026-09-13T10:00:00Z", { roomName: "Room of Ideas" }),
    ];
    expect(ids(sortBookingOverview(rows, "room", "asc"))).toEqual(["b", "a"]);
  });

  it("sorts cells showing no value last in both directions", () => {
    const withFee = row("fee", "2026-09-12T10:00:00Z", {
      cancellationFeeOre: 50_000,
    });
    const noFee = row("no-fee", "2026-09-11T10:00:00Z");
    const smallFee = row("small-fee", "2026-09-13T10:00:00Z", {
      cancellationFeeOre: 10_000,
    });
    const rows = [noFee, withFee, smallFee];
    expect(ids(sortBookingOverview(rows, "fee", "asc"))).toEqual([
      "small-fee",
      "fee",
      "no-fee",
    ]);
    expect(ids(sortBookingOverview(rows, "fee", "desc"))).toEqual([
      "fee",
      "small-fee",
      "no-fee",
    ]);
  });

  it("sorts the add-ons by their total and the discount by its percentage", () => {
    const lunch: BookingAddonOverview = {
      addonId: "lunch",
      name: "Frokost",
      quantity: 4,
      totalOre: 80_000,
    };
    const rows = [
      row("none", "2026-09-11T10:00:00Z"),
      row("lunch", "2026-09-12T10:00:00Z", { addOns: [lunch] }),
    ];
    expect(ids(sortBookingOverview(rows, "addOns", "desc"))).toEqual([
      "lunch",
      "none",
    ]);
    const discounted = row("discounted", "2026-09-13T10:00:00Z", {
      price: { ...rows[0].price, discountPercent: 20, showSavings: true },
    });
    expect(
      ids(sortBookingOverview([rows[0], discounted], "discount", "asc"))
    ).toEqual(["discounted", "none"]);
  });

  it("keeps ties in start order", () => {
    const rows = [
      row("second", "2026-09-13T10:00:00Z"),
      row("first", "2026-09-12T10:00:00Z"),
    ];
    expect(ids(sortBookingOverview(rows, "booker", "desc"))).toEqual([
      "first",
      "second",
    ]);
  });
});

describe("addOnsTotalOre", () => {
  const addOn = (totalOre: number): BookingAddonOverview => ({
    addonId: "addon",
    name: "Lunch",
    quantity: 1,
    totalOre,
  });

  it("sums each add-on line's total", () => {
    expect(addOnsTotalOre([addOn(50_000), addOn(180_000)])).toBe(230_000);
  });

  it("reads an empty list as zero", () => {
    expect(addOnsTotalOre([])).toBe(0);
  });
});
