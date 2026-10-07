// The admin booking overview's math (#9): row parts from the frozen
// snapshot (ADR-0005, ADR-0007), the cancelled row's fee-only basis
// (ADR-0006), the totals that sum every column down its rows, the
// per-company and per-room breakdowns, sorting, and invoicability after
// the end time.
import { describe, expect, it } from "vitest";
import type { AdminOverviewRow } from "./admin-bookings";
import {
  adminRowParts,
  adminTotals,
  bookingIsInvoicable,
  bookingNotInvoicableReason,
  breakdownAdminRows,
  sortAdminRows,
} from "./admin-bookings";

const booking = (
  overrides: Partial<Parameters<typeof adminRowParts>[0]> = {}
) => ({
  addonTotalOre: 0,
  bookingId: "b1",
  bookingNumber: "B-2610-0001",
  bookingStatus: "confirmed" as const,
  cancellationFeeOre: null,
  cancellationFeeWaived: false,
  companyId: "c1",
  companyName: "Rituals",
  discountPercent: 0,
  endAt: "2026-10-01T11:00:00Z",
  invoiceDate: null,
  invoiceNumber: null,
  invoicingStatus: "not_invoiced" as const,
  manualAmounts: [],
  manualAmountsOre: 0,
  membershipStatus: "member" as const,
  roomId: "r1",
  roomName: "Room of Power",
  roomPriceOre: 100_000,
  startAt: "2026-10-01T09:00:00Z",
  ...overrides,
});

const houseEvent = (overrides = {}): AdminOverviewRow => ({
  kind: "house_event",
  row: {
    description: "Team day",
    endAt: "2026-10-02T16:00:00Z",
    houseEventId: "h1",
    roomNames: ["Biblioteket"],
    startAt: "2026-10-02T09:00:00Z",
    title: "Sommerfest",
    ...overrides,
  },
});

const bookingRow = (overrides = {}): AdminOverviewRow => ({
  kind: "booking",
  row: booking(overrides),
});

describe("adminRowParts", () => {
  it("reads the snapshot: member price after discount, add-ons, manual amounts, hours", () => {
    const parts = adminRowParts(
      booking({
        addonTotalOre: 15_000,
        discountPercent: 50,
        endAt: "2026-10-01T11:30:00Z",
        manualAmountsOre: 25_000,
        roomPriceOre: 100_005,
        startAt: "2026-10-01T09:00:00Z",
      })
    );
    expect(parts.roomPriceOre).toBe(100_005);
    // 1000,05 kr at 50 % rounds half up to 500,03 kr (ADR-0007).
    expect(parts.memberPriceOre).toBe(50_003);
    expect(parts.addOnsOre).toBe(15_000);
    expect(parts.manualAmountsOre).toBe(25_000);
    expect(parts.minutes).toBe(150);
    // The whole basis is the parts added together.
    expect(parts.basisOre).toBe(90_003);
    expect(parts.feeOre).toBe(0);
  });

  it("gives a cancelled booking its payable fee alone (ADR-0006)", () => {
    const parts = adminRowParts(
      booking({
        bookingStatus: "cancelled",
        cancellationFeeOre: 50_000,
        roomPriceOre: 100_000,
      })
    );
    expect(parts.basisOre).toBe(50_000);
    expect(parts.feeOre).toBe(50_000);
    expect(parts.memberPriceOre).toBeNull();
    expect(parts.addOnsOre).toBeNull();
    expect(parts.minutes).toBeNull();
  });

  it("reads a waived fee as no fee", () => {
    const parts = adminRowParts(
      booking({
        bookingStatus: "cancelled",
        cancellationFeeOre: 50_000,
        cancellationFeeWaived: true,
      })
    );
    expect(parts.basisOre).toBe(0);
    expect(parts.feeOre).toBe(0);
  });

  it("reads a cancelled booking without a fee as zero", () => {
    const parts = adminRowParts(booking({ bookingStatus: "cancelled" }));
    expect(parts.basisOre).toBe(0);
  });
});

describe("adminTotals", () => {
  it("sums every column down its rows, cancelled rows' snapshot excluded", () => {
    const totals = adminTotals([
      bookingRow({ discountPercent: 50 }),
      bookingRow({
        bookingId: "b2",
        bookingStatus: "cancelled",
        cancellationFeeOre: 50_000,
        endAt: "2026-10-02T11:00:00Z",
        startAt: "2026-10-02T09:00:00Z",
      }),
      houseEvent(),
    ]);
    expect(totals.bookingCount).toBe(2);
    expect(totals.roomPriceOre).toBe(100_000);
    expect(totals.memberPriceOre).toBe(50_000);
    expect(totals.feeOre).toBe(50_000);
    expect(totals.minutes).toBe(120);
    expect(totals.basisOre).toBe(100_000);
  });

  it("returns zeros for an empty or event-only set", () => {
    expect(adminTotals([]).basisOre).toBe(0);
    expect(adminTotals([houseEvent()]).bookingCount).toBe(0);
  });
});

describe("breakdownAdminRows", () => {
  it("groups by company and by room, labels sorted in Danish", () => {
    const rows = [
      bookingRow({
        companyName: "Rituals",
        roomId: "r1",
        roomName: "Room of Power",
      }),
      bookingRow({
        bookingId: "b2",
        companyId: "c2",
        companyName: "Nordic Events",
        endAt: "2026-10-02T11:00:00Z",
        membershipStatus: "external",
        roomId: "r2",
        roomName: "Biblioteket",
        startAt: "2026-10-02T09:00:00Z",
      }),
      bookingRow({
        bookingId: "b3",
        endAt: "2026-10-03T10:00:00Z",
        roomId: "r1",
        roomName: "Room of Power",
        startAt: "2026-10-03T09:00:00Z",
      }),
    ];

    const byCompany = breakdownAdminRows(rows, "company");
    expect(byCompany.map((entry) => entry.label)).toEqual([
      "Nordic Events",
      "Rituals",
    ]);
    expect(
      byCompany.find((entry) => entry.label === "Rituals")?.bookingCount
    ).toBe(2);

    const byRoom = breakdownAdminRows(rows, "room");
    expect(byRoom.map((entry) => entry.label)).toEqual([
      "Biblioteket",
      "Room of Power",
    ]);
    expect(
      byRoom.find((entry) => entry.label === "Room of Power")?.minutes
    ).toBe(180);
    // House Events enter no breakdown.
    expect(breakdownAdminRows([...rows, houseEvent()], "room")).toHaveLength(2);
  });
});

describe("sortAdminRows", () => {
  it("sorts by date by default with ties in start order", () => {
    const rows = [
      bookingRow({
        bookingId: "late",
        endAt: "2026-10-03T11:00:00Z",
        startAt: "2026-10-03T09:00:00Z",
      }),
      bookingRow({ bookingId: "early" }),
    ];
    const sorted = sortAdminRows(rows, "date", "asc");
    expect(
      sorted.map((entry) =>
        entry.kind === "booking" ? entry.row.bookingId : ""
      )
    ).toEqual(["early", "late"]);
  });

  it("sorts numbers with nulls last in both directions", () => {
    const rows = [
      bookingRow({ bookingId: "event-sort" }),
      houseEvent(),
      bookingRow({ bookingId: "big", manualAmountsOre: 5000 }),
    ];
    const asc = sortAdminRows(rows, "manualAmounts", "asc");
    expect(asc[0]?.kind).toBe("booking");
    expect(asc.at(-1)?.kind).toBe("house_event");
    const desc = sortAdminRows(rows, "manualAmounts", "desc");
    expect(desc[0]?.kind).toBe("booking");
  });

  it("sorts text columns in Danish", () => {
    const rows = [
      bookingRow({ bookingId: "a", companyName: "Rituals" }),
      bookingRow({
        bookingId: "b",
        companyId: "c2",
        companyName: "Nordic Events",
        membershipStatus: "external",
      }),
    ];
    expect(
      sortAdminRows(rows, "company", "asc")[0]?.kind === "booking" &&
        (
          sortAdminRows(rows, "company", "asc")[0] as {
            row: { companyName: string };
          }
        ).row.companyName
    ).toBe("Nordic Events");
  });

  it("sorts a cancelled row's null discount last", () => {
    const rows = [
      bookingRow({ bookingStatus: "cancelled", discountPercent: 50 }),
      bookingRow({ discountPercent: 50 }),
    ];
    const sorted = sortAdminRows(rows, "discount", "asc");
    expect(sorted[0]?.kind === "booking" && sorted[0].row.bookingStatus).toBe(
      "confirmed"
    );
  });
});

describe("bookingIsInvoicable", () => {
  const now = new Date("2026-10-02T12:00:00Z");

  it("allows an ended booking that still waits for its invoice", () => {
    expect(
      bookingIsInvoicable(
        { endAt: "2026-10-02T12:00:00Z", invoicingStatus: "not_invoiced" },
        now
      )
    ).toBe(true);
  });

  it("refuses a booking whose end time has not passed", () => {
    expect(
      bookingIsInvoicable(
        { endAt: "2026-10-02T12:00:01Z", invoicingStatus: "not_invoiced" },
        now
      )
    ).toBe(false);
  });

  it("refuses an already invoiced or already refused booking", () => {
    expect(
      bookingIsInvoicable(
        { endAt: "2026-10-01T09:00:00Z", invoicingStatus: "invoiced" },
        now
      )
    ).toBe(false);
    expect(
      bookingIsInvoicable(
        { endAt: "2026-10-01T09:00:00Z", invoicingStatus: "not_invoicable" },
        now
      )
    ).toBe(false);
  });
});

describe("bookingNotInvoicableReason", () => {
  const now = new Date("2026-10-02T12:00:00Z");

  it("gives null for an ended booking that still waits for its invoice", () => {
    expect(
      bookingNotInvoicableReason(
        { endAt: "2026-10-02T12:00:00Z", invoicingStatus: "not_invoiced" },
        now
      )
    ).toBe(null);
  });

  it("says a booking that has not ended is in the future", () => {
    expect(
      bookingNotInvoicableReason(
        { endAt: "2026-10-02T12:00:01Z", invoicingStatus: "not_invoiced" },
        now
      )
    ).toBe("future");
  });

  it("carries the row's status when it is already invoiced or refused", () => {
    expect(
      bookingNotInvoicableReason(
        { endAt: "2026-10-01T09:00:00Z", invoicingStatus: "invoiced" },
        now
      )
    ).toBe("invoiced");
    expect(
      bookingNotInvoicableReason(
        { endAt: "2026-10-01T09:00:00Z", invoicingStatus: "not_invoicable" },
        now
      )
    ).toBe("not_invoicable");
  });
});
