import { describe, expect, it } from "vitest";
import type { AdminBookingRow } from "@/lib/domain/admin-bookings";
import { toCsv } from "@/lib/export/csv";
import {
  bookingsPeriod,
  bookingsTable,
  bookingsTitle,
  bookingsTotal,
} from "./admin-export";

// The export mirrors the admin Bookinger table's columns (the COLUMNS list
// in admin-bookings-table.tsx), one string cell per column: the invoicing
// badge's label, the cancelled badge as its own Ja column, the date cell's
// date and time range as two readable datetimes, the add-ons indicator and
// the row's total — the same adminRowParts value the table renders.
const baseRow: AdminBookingRow = {
  addOns: [],
  addonTotalOre: 0,
  bookingId: "b1",
  bookingNumber: "TB-2026-0001",
  bookingStatus: "confirmed",
  cancellationFeeOre: null,
  cancellationFeeWaived: false,
  cancelledAt: null,
  companyId: "c1",
  companyName: "Ærø ApS",
  discountPercent: 0,
  endAt: "2026-09-02T19:00:00Z",
  expectedTotalOre: 62_500,
  invoiceDate: null,
  invoiceNumber: null,
  invoicingStatus: "not_invoiced",
  manualAmounts: [],
  manualAmountsOre: 0,
  membershipStatus: "member",
  practicalNotes: null,
  roomId: "r1",
  roomName: "Lokalet",
  roomPriceOre: 62_500,
  startAt: "2026-09-02T17:00:00Z",
};

const row = (overrides: Partial<AdminBookingRow>): AdminBookingRow => ({
  ...baseRow,
  ...overrides,
});

const firstRowCells = (rows: AdminBookingRow[]): string[] =>
  toCsv(bookingsTable(rows)).split("\r\n")[1].split(";");

const firstLine = (rows: AdminBookingRow[]): string =>
  toCsv(bookingsTable(rows)).split("\r\n")[1];

describe("bookingsTable", () => {
  it("carries the table's headers, in the table's order", () => {
    const header = toCsv(bookingsTable([]))
      .split("\r\n")[0]
      .replace("\uFEFF", "");
    expect(header).toBe(
      "Status;Aflyst;Bookingnummer;Virksomhed;Lokale;Start;Slut;Tilkøb;Total pris (Efter rabat)"
    );
  });

  it("maps a confirmed booking to the table's cells", () => {
    expect(firstLine([baseRow])).toBe(
      "Ikke faktureret;-;TB-2026-0001;Ærø ApS;Lokalet;02/09/2026 19:00;02/09/2026 21:00;-;625,00"
    );
  });

  it("writes the room rent after discount, like the table's total", () => {
    expect(
      firstRowCells([row({ discountPercent: 25, roomPriceOre: 80_000 })]).at(-1)
    ).toBe("600,00");
  });

  it("writes a cancelled booking's payable fee as its total, flagged Aflyst", () => {
    const cells = firstRowCells([
      row({
        bookingStatus: "cancelled",
        cancellationFeeOre: 25_000,
        invoicingStatus: "not_invoiced",
      }),
    ]);
    expect(cells[0]).toBe("Ikke faktureret");
    expect(cells[1]).toBe("Ja");
    expect(cells.at(-1)).toBe("250,00");
  });

  it("leaves a waived fee empty like the table's dash", () => {
    const cells = firstRowCells([
      row({
        bookingStatus: "cancelled",
        cancellationFeeOre: 25_000,
        cancellationFeeWaived: true,
      }),
    ]);
    expect(cells[1]).toBe("Ja");
    expect(cells.at(-1)).toBe("-");
  });

  it("marks add-ons and quotes a company name carrying the delimiter", () => {
    expect(
      firstLine([
        row({
          addOns: [
            { addonId: "a1", name: "Kaffe", quantity: 1, totalOre: 1000 },
          ],
          addonTotalOre: 1000,
          companyName: "Møller & Søn; ApS",
        }),
      ])
    ).toBe(
      'Ikke faktureret;-;TB-2026-0001;"Møller & Søn; ApS";Lokalet;02/09/2026 19:00;02/09/2026 21:00;Ja;625,00'
    );
  });

  it("formats kroner without thousands separators so sums stay numeric", () => {
    expect(firstRowCells([row({ roomPriceOre: 1_200_000 })]).at(-1)).toBe(
      "12000,00"
    );
  });

  it("keeps a formula-shaped company name as text", () => {
    const cells = firstRowCells([row({ companyName: "=HYPERLINK(x)" })]);
    expect(cells[3]).toBe("'=HYPERLINK(x)");
  });
});

describe("bookingsTitle", () => {
  it("names the one company a single-company export carries", () => {
    expect(
      bookingsTitle([
        row({ companyName: "Ærø ApS" }),
        row({ companyName: "Ærø ApS" }),
      ])
    ).toBe("Bookinger for Ærø ApS");
  });

  it("stays plain on a mixed or empty export", () => {
    expect(
      bookingsTitle([
        row({ companyName: "Ærø ApS" }),
        row({ companyName: "Nordborg Event ApS" }),
      ])
    ).toBe("Bookinger");
    expect(bookingsTitle([])).toBe("Bookinger");
  });
});

describe("bookingsPeriod", () => {
  it("spans the first start through the last end", () => {
    expect(
      bookingsPeriod([
        row({ endAt: "2026-09-03T19:00:00Z", startAt: "2026-09-02T17:00:00Z" }),
        row({ endAt: "2026-09-05T20:00:00Z", startAt: "2026-09-04T16:00:00Z" }),
      ])
    ).toBe("Periode: 02/09/2026 - 05/09/2026");
  });

  it("collapses to one date on a same-day set", () => {
    expect(bookingsPeriod([baseRow])).toBe("Periode: 02/09/2026");
  });

  it("is undefined for an empty set", () => {
    expect(bookingsPeriod([])).toBeUndefined();
  });
});

describe("bookingsTotal", () => {
  it("sums the total column: room rent after discount plus the cancelled fee", () => {
    expect(
      bookingsTotal([
        row({ roomPriceOre: 62_500 }),
        row({
          bookingStatus: "cancelled",
          cancellationFeeOre: 25_000,
          roomPriceOre: 0,
        }),
      ])
    ).toBe("I alt: 875,00 kr");
  });

  it("skips a waived fee and an empty set", () => {
    expect(
      bookingsTotal([
        row({
          bookingStatus: "cancelled",
          cancellationFeeOre: 25_000,
          cancellationFeeWaived: true,
          roomPriceOre: 0,
        }),
      ])
    ).toBe("I alt: 0,00 kr");
    expect(bookingsTotal([])).toBeUndefined();
  });
});
