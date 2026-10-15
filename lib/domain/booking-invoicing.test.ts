import { describe, expect, it } from "vitest";
import {
  manualAmountsTotalOre,
  outstandingInvoiceBasisOre,
} from "./booking-invoicing";

const confirmed = {
  cancellationFeeOre: null,
  expectedTotalOre: 40_000,
  manualAmountsOre: 0,
  status: "confirmed",
  waived: false,
} as const;

const manualAmounts = [
  {
    amountOre: 45_000,
    createdAt: "2026-10-01T15:00:00Z",
    createdByName: "Ali",
    manualAmountId: "88888888-8888-8888-8888-888888888001",
    note: "Ekstra rengøring",
  },
  {
    amountOre: 25_000,
    createdAt: "2026-10-01T16:00:00Z",
    createdByName: null,
    manualAmountId: "88888888-8888-8888-8888-888888888002",
    note: "Eksterne omkostninger",
  },
];

describe("manualAmountsTotalOre", () => {
  it("sums the booking's manual amounts", () => {
    expect(manualAmountsTotalOre(manualAmounts)).toBe(70_000);
  });

  it("reads no manual amounts as zero", () => {
    expect(manualAmountsTotalOre([])).toBe(0);
  });
});

describe("outstandingInvoiceBasisOre", () => {
  it("reads a confirmed booking as its frozen expected total", () => {
    expect(outstandingInvoiceBasisOre(confirmed)).toBe(40_000);
  });

  it("adds the manual amounts to a confirmed booking's basis (#16)", () => {
    expect(
      outstandingInvoiceBasisOre({ ...confirmed, manualAmountsOre: 45_000 })
    ).toBe(85_000);
  });

  it("reads a cancelled booking as its payable fee alone", () => {
    expect(
      outstandingInvoiceBasisOre({
        ...confirmed,
        cancellationFeeOre: 80_000,
        status: "cancelled",
      })
    ).toBe(80_000);
  });

  it("never adds manual amounts to a cancelled booking's basis", () => {
    expect(
      outstandingInvoiceBasisOre({
        ...confirmed,
        cancellationFeeOre: 80_000,
        manualAmountsOre: 45_000,
        status: "cancelled",
      })
    ).toBe(80_000);
  });

  it("reads a waived fee as nothing to invoice", () => {
    expect(
      outstandingInvoiceBasisOre({
        ...confirmed,
        cancellationFeeOre: 80_000,
        status: "cancelled",
        waived: true,
      })
    ).toBe(0);
  });

  it("reads a cancelled booking without a fee as zero", () => {
    expect(
      outstandingInvoiceBasisOre({
        ...confirmed,
        status: "cancelled",
      })
    ).toBe(0);
  });
});
