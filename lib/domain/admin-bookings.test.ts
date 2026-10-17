// The admin booking overview's math (#9): row parts from the frozen
// snapshot (ADR-0005, ADR-0007), the cancelled row's fee-only basis
// (ADR-0006), the totals that sum every column down its rows, sorting,
// and which invoicing actions a selection allows.
import { describe, expect, it } from "vitest";
import {
  adminRowParts,
  adminTotals,
  breakdownAdminRows,
  canAdminCancel,
  companyCashFlow,
  invoiceReadyOre,
  invoiceReadyTotalOre,
  invoicingActionAllowance,
  shiftRangeIds,
  sortAdminRows,
} from "./admin-bookings";

const booking = (
  overrides: Partial<Parameters<typeof adminRowParts>[0]> = {}
) => ({
  addOns: [],
  addonTotalOre: 0,
  bookingId: "b1",
  bookingNumber: "B-2610-0001",
  bookingStatus: "confirmed" as const,
  cancellationFeeOre: null,
  cancellationFeeWaived: false,
  cancelledAt: null,
  companyId: "c1",
  companyName: "Rituals",
  discountPercent: 0,
  endAt: "2026-10-01T11:00:00Z",
  expectedTotalOre: 100_000,
  invoiceDate: null,
  invoiceNumber: null,
  invoicingStatus: "not_invoiced" as const,
  manualAmounts: [],
  manualAmountsOre: 0,
  membershipStatus: "member" as const,
  practicalNotes: null,
  roomId: "r1",
  roomName: "Room of Power",
  roomPriceOre: 100_000,
  startAt: "2026-10-01T09:00:00Z",
  ...overrides,
});

describe("adminRowParts", () => {
  it("reads the snapshot: member price after discount, add-ons, manual amounts, hours", () => {
    const parts = adminRowParts(
      booking({
        addonTotalOre: 15_000,
        discountPercent: 50,
        endAt: "2026-10-01T11:30:00Z",
        // The stored total of the parts' sum: 50_003 member + 15_000.
        expectedTotalOre: 65_003,
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

  it("reads the stored total as the basis when an admin overrode it (#126)", () => {
    const parts = adminRowParts(
      booking({
        addonTotalOre: 15_000,
        discountPercent: 50,
        // The stored total is the admin's price — not the parts' sum
        // (65_003): the override wins, here and on every basis surface.
        expectedTotalOre: 40_000,
        manualAmountsOre: 25_000,
        roomPriceOre: 100_005,
      })
    );
    expect(parts.basisOre).toBe(65_000);
    // The room-rent column and the cancellation fee keep reading the room
    // price (ADR-0006); only the basis follows the override.
    expect(parts.memberPriceOre).toBe(50_003);
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
      booking({ discountPercent: 50, expectedTotalOre: 50_000 }),
      booking({
        bookingId: "b2",
        bookingStatus: "cancelled",
        cancellationFeeOre: 50_000,
        endAt: "2026-10-02T11:00:00Z",
        startAt: "2026-10-02T09:00:00Z",
      }),
    ]);
    expect(totals.bookingCount).toBe(2);
    expect(totals.roomPriceOre).toBe(100_000);
    expect(totals.memberPriceOre).toBe(50_000);
    expect(totals.feeOre).toBe(50_000);
    expect(totals.minutes).toBe(120);
    expect(totals.basisOre).toBe(100_000);
  });

  it("returns zeros for an empty set", () => {
    expect(adminTotals([]).basisOre).toBe(0);
    expect(adminTotals([]).bookingCount).toBe(0);
  });
});

describe("breakdownAdminRows", () => {
  it("groups by company and by room, labels sorted in Danish", () => {
    const rows = [
      booking({
        companyName: "Rituals",
        roomId: "r1",
        roomName: "Room of Power",
      }),
      booking({
        bookingId: "b2",
        companyId: "c2",
        companyName: "Nordic Events",
        endAt: "2026-10-02T11:00:00Z",
        membershipStatus: "external",
        roomId: "r2",
        roomName: "Biblioteket",
        startAt: "2026-10-02T09:00:00Z",
      }),
      booking({
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
  });
});

describe("sortAdminRows", () => {
  it("sorts by date by default with ties in start order", () => {
    const rows = [
      booking({
        bookingId: "late",
        endAt: "2026-10-03T11:00:00Z",
        startAt: "2026-10-03T09:00:00Z",
      }),
      booking({ bookingId: "early" }),
    ];
    const sorted = sortAdminRows(rows, "date", "asc");
    expect(sorted.map((row) => row.bookingId)).toEqual(["early", "late"]);
  });

  it("sorts numbers with nulls last in both directions", () => {
    const rows = [
      booking({ bookingId: "cancelled", bookingStatus: "cancelled" }),
      booking({ bookingId: "big", manualAmountsOre: 5000 }),
    ];
    const asc = sortAdminRows(rows, "manualAmounts", "asc");
    expect(asc.map((row) => row.bookingId)).toEqual(["big", "cancelled"]);
    const desc = sortAdminRows(rows, "manualAmounts", "desc");
    expect(desc.map((row) => row.bookingId)).toEqual(["big", "cancelled"]);
  });

  it("sorts text columns in Danish", () => {
    const rows = [
      booking({ bookingId: "a", companyName: "Rituals" }),
      booking({
        bookingId: "b",
        companyId: "c2",
        companyName: "Nordic Events",
        membershipStatus: "external",
      }),
    ];
    expect(
      sortAdminRows(rows, "company", "asc").map((row) => row.companyName)
    ).toEqual(["Nordic Events", "Rituals"]);
  });

  it("sorts a cancelled row's null discount last", () => {
    const rows = [
      booking({ bookingStatus: "cancelled", discountPercent: 50 }),
      booking({ discountPercent: 50 }),
    ];
    const sorted = sortAdminRows(rows, "discount", "asc");
    expect(sorted[0]?.bookingStatus).toBe("confirmed");
  });
});

describe("invoicingActionAllowance", () => {
  const now = new Date("2026-10-02T12:00:00Z");
  const ended = "2026-10-02T12:00:00Z";
  const future = "2026-10-02T12:00:01Z";

  it("allows the invoice mark on ended, open bookings only", () => {
    expect(
      invoicingActionAllowance(
        [
          { endAt: ended, invoicingStatus: "not_invoiced" },
          { endAt: ended, invoicingStatus: "not_invoicable" },
        ],
        now
      ).canInvoice
    ).toBe(true);
    expect(
      invoicingActionAllowance(
        [{ endAt: future, invoicingStatus: "not_invoiced" }],
        now
      ).canInvoice
    ).toBe(false);
    expect(
      invoicingActionAllowance(
        [{ endAt: ended, invoicingStatus: "invoiced" }],
        now
      ).canInvoice
    ).toBe(false);
  });

  it("allows un-invoicing invoiced and refused bookings only", () => {
    expect(
      invoicingActionAllowance(
        [
          { endAt: ended, invoicingStatus: "invoiced" },
          { endAt: future, invoicingStatus: "not_invoicable" },
        ],
        now
      ).canNotInvoiced
    ).toBe(true);
    expect(
      invoicingActionAllowance(
        [
          { endAt: ended, invoicingStatus: "invoiced" },
          { endAt: ended, invoicingStatus: "not_invoiced" },
        ],
        now
      ).canNotInvoiced
    ).toBe(false);
  });

  it("allows refusing anything not already refused, future included", () => {
    expect(
      invoicingActionAllowance(
        [
          { endAt: future, invoicingStatus: "not_invoiced" },
          { endAt: ended, invoicingStatus: "invoiced" },
        ],
        now
      ).canNotInvoicable
    ).toBe(true);
    expect(
      invoicingActionAllowance(
        [{ endAt: ended, invoicingStatus: "not_invoicable" }],
        now
      ).canNotInvoicable
    ).toBe(false);
  });

  it("allows nothing on an empty selection", () => {
    expect(invoicingActionAllowance([], now)).toEqual({
      canInvoice: false,
      canNotInvoicable: false,
      canNotInvoiced: false,
    });
  });
});

describe("shiftRangeIds", () => {
  const page = ["b1", "b2", "b3", "b4", "b5"];

  it("selects first through fifth on a downward shift", () => {
    expect(shiftRangeIds(page, "b1", "b5")).toEqual([
      "b1",
      "b2",
      "b3",
      "b4",
      "b5",
    ]);
  });

  it("selects upward too — the range runs anchor to click in page order", () => {
    expect(shiftRangeIds(page, "b5", "b2")).toEqual(["b2", "b3", "b4", "b5"]);
  });

  it("keeps ticks outside the range — a range add, not a replace", () => {
    // b4 ticked before the shift-click on b2 from anchor b5.
    expect(shiftRangeIds(["b1", "b2", "b4", "b5"], "b5", "b2")).toEqual([
      "b2",
      "b4",
      "b5",
    ]);
  });

  it("reads as a plain toggle without an anchor on this page", () => {
    expect(shiftRangeIds(page, null, "b3")).toBeNull();
    expect(shiftRangeIds(page, "b9", "b3")).toBeNull();
    expect(shiftRangeIds(page, "b3", "b3")).toBeNull();
  });
});

describe("canAdminCancel", () => {
  const now = new Date("2026-10-01T08:00:00Z");

  it("allows a confirmed booking that has not started", () => {
    expect(canAdminCancel(booking(), now)).toBe(true);
  });

  it("refuses a started or cancelled booking", () => {
    expect(canAdminCancel(booking(), new Date("2026-10-01T09:00:00Z"))).toBe(
      false
    );
    expect(canAdminCancel(booking({ bookingStatus: "cancelled" }), now)).toBe(
      false
    );
  });
});

describe("invoiceReadyOre", () => {
  const now = new Date("2026-10-01T12:00:00Z");
  // The factory's row has already ended at 11:00; an unended booking ends
  // after the now instant.
  const unended = { endAt: "2026-10-01T13:00:00Z" };

  it("counts an ended, uninvoiced booking at its whole basis", () => {
    expect(
      invoiceReadyOre(
        booking({
          addonTotalOre: 15_000,
          expectedTotalOre: 115_000,
          manualAmountsOre: 2500,
          roomPriceOre: 100_000,
        }),
        now
      )
    ).toBe(117_500);
  });

  it("counts nothing before the booking has ended", () => {
    expect(invoiceReadyOre(booking(unended), now)).toBe(0);
  });

  it("counts nothing once invoiced or refused", () => {
    expect(invoiceReadyOre(booking({ invoicingStatus: "invoiced" }), now)).toBe(
      0
    );
    expect(
      invoiceReadyOre(booking({ invoicingStatus: "not_invoicable" }), now)
    ).toBe(0);
  });

  it("counts a cancelled booking at its payable fee alone", () => {
    expect(
      invoiceReadyOre(
        booking({
          bookingStatus: "cancelled",
          cancellationFeeOre: 50_000,
        }),
        now
      )
    ).toBe(50_000);
  });

  it("counts a waived or feeless cancellation as zero", () => {
    expect(
      invoiceReadyOre(
        booking({
          bookingStatus: "cancelled",
          cancellationFeeOre: 50_000,
          cancellationFeeWaived: true,
        }),
        now
      )
    ).toBe(0);
    expect(invoiceReadyOre(booking({ bookingStatus: "cancelled" }), now)).toBe(
      0
    );
  });
});

describe("invoiceReadyTotalOre", () => {
  const now = new Date("2026-10-01T12:00:00Z");
  const unended = { endAt: "2026-10-01T13:00:00Z" };

  it("sums the invoice-ready rows only", () => {
    expect(
      invoiceReadyTotalOre(
        [
          booking({
            bookingId: "b1",
            expectedTotalOre: 10_000,
            roomPriceOre: 10_000,
          }),
          // Not ended yet.
          booking({
            bookingId: "b2",
            expectedTotalOre: 20_000,
            roomPriceOre: 20_000,
            ...unended,
          }),
          // Invoiced.
          booking({
            bookingId: "b3",
            expectedTotalOre: 40_000,
            invoicingStatus: "invoiced",
            roomPriceOre: 40_000,
          }),
          // Cancelled with a payable fee.
          booking({
            bookingId: "b4",
            bookingStatus: "cancelled",
            cancellationFeeOre: 5000,
          }),
        ],
        now
      )
    ).toBe(15_000);
  });
});

describe("companyCashFlow", () => {
  const now = new Date("2026-10-01T12:00:00Z");

  it("groups the invoice-ready bookings per company, biggest first", () => {
    expect(
      companyCashFlow(
        [
          booking({
            bookingId: "b1",
            companyId: "c1",
            companyName: "Rituals",
            expectedTotalOre: 10_000,
            roomPriceOre: 10_000,
          }),
          booking({
            bookingId: "b2",
            companyId: "c2",
            companyName: "Beta A/S",
            expectedTotalOre: 40_000,
            roomPriceOre: 40_000,
          }),
          booking({
            bookingId: "b3",
            companyId: "c1",
            companyName: "Rituals",
            expectedTotalOre: 7000,
            roomPriceOre: 7000,
          }),
        ],
        now
      )
    ).toEqual([
      {
        bookingCount: 1,
        companyId: "c2",
        companyName: "Beta A/S",
        totalOre: 40_000,
      },
      {
        bookingCount: 2,
        companyId: "c1",
        companyName: "Rituals",
        totalOre: 17_000,
      },
    ]);
  });

  it("breaks an amount tie by company name", () => {
    const rows = [
      booking({
        bookingId: "b1",
        companyId: "c1",
        companyName: "Zeta ApS",
        roomPriceOre: 10_000,
      }),
      booking({
        bookingId: "b2",
        companyId: "c2",
        companyName: "Alpha ApS",
        roomPriceOre: 10_000,
      }),
    ];
    expect(
      companyCashFlow(rows, now).map((entry) => entry.companyName)
    ).toEqual(["Alpha ApS", "Zeta ApS"]);
  });

  it("gives a company with nothing invoice-ready no line", () => {
    expect(
      companyCashFlow(
        [
          // Cancelled without a fee: contributes zero.
          booking({
            bookingId: "b1",
            bookingStatus: "cancelled",
            companyId: "c1",
            companyName: "Rituals",
          }),
          // Not ended yet.
          booking({
            bookingId: "b2",
            companyId: "c1",
            endAt: "2026-10-01T13:00:00Z",
            roomPriceOre: 10_000,
          }),
        ],
        now
      )
    ).toEqual([]);
  });
});
