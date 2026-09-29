import { describe, expect, it } from "vitest";
import { outstandingInvoiceBasisOre } from "./booking-invoicing";

const confirmed = {
  cancellationFeeOre: null,
  expectedTotalOre: 40_000,
  status: "confirmed",
  waived: false,
} as const;

describe("outstandingInvoiceBasisOre", () => {
  it("reads a confirmed booking as its frozen expected total", () => {
    expect(outstandingInvoiceBasisOre(confirmed)).toBe(40_000);
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
