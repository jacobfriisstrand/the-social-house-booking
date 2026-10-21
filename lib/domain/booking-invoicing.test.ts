import { describe, expect, it } from "vitest";
import {
  invoiceBasisOre,
  invoiceBasisParts,
  invoiceBasisTotalOre,
} from "./booking-invoicing";

describe("invoiceBasisTotalOre", () => {
  it("adds the four parts up to the whole basis", () => {
    expect(
      invoiceBasisTotalOre({
        addonsOre: 15_000,
        cancellationFeesOre: 50_000,
        manualAmountsOre: 25_000,
        roomRentOre: 100_000,
      })
    ).toBe(190_000);
  });
});

describe("invoiceBasisParts", () => {
  it("splits a held meeting's frozen composition into parts (ADR-0005, #16)", () => {
    expect(
      invoiceBasisParts({
        addonTotalOre: 35_000,
        cancellationFeeOre: null,
        cancellationFeeWaived: false,
        expectedTotalOre: 135_000,
        manualAmountsOre: 20_000,
        status: "confirmed",
      })
    ).toEqual({
      addonsOre: 35_000,
      cancellationFeesOre: 0,
      manualAmountsOre: 20_000,
      // The room rent after discount (ADR-0007) is the remainder:
      // 135_000 − 35_000.
      roomRentOre: 100_000,
    });
  });

  it("leaves the room rent un-floored under a total-price override (#126)", () => {
    const parts = invoiceBasisParts({
      addonTotalOre: 50_000,
      cancellationFeeOre: null,
      cancellationFeeWaived: false,
      expectedTotalOre: 40_000,
      manualAmountsOre: 25_000,
      status: "confirmed",
    });
    expect(parts).toEqual({
      addonsOre: 50_000,
      cancellationFeesOre: 0,
      manualAmountsOre: 25_000,
      // The stored total sits below the add-on lines; flooring would
      // overstate the real invoice amount.
      roomRentOre: -10_000,
    });
    // The negative room rent is what keeps the parts adding up to the
    // stored total plus manual amounts — an admin's override wins.
    expect(invoiceBasisTotalOre(parts)).toBe(65_000);
  });

  it("gives a cancelled booking its payable fee alone (ADR-0006)", () => {
    expect(
      invoiceBasisParts({
        addonTotalOre: 35_000,
        cancellationFeeOre: 50_000,
        cancellationFeeWaived: false,
        expectedTotalOre: 135_000,
        manualAmountsOre: 20_000,
        status: "cancelled",
      })
    ).toEqual({
      addonsOre: 0,
      cancellationFeesOre: 50_000,
      manualAmountsOre: 0,
      roomRentOre: 0,
    });
  });

  it("reads a waived fee as nothing to invoice", () => {
    expect(
      invoiceBasisParts({
        addonTotalOre: 35_000,
        cancellationFeeOre: 50_000,
        cancellationFeeWaived: true,
        expectedTotalOre: 135_000,
        manualAmountsOre: 0,
        status: "cancelled",
      })
    ).toEqual({
      addonsOre: 0,
      cancellationFeesOre: 0,
      manualAmountsOre: 0,
      roomRentOre: 0,
    });
  });

  it("reads a cancelled booking without a fee as zero", () => {
    expect(
      invoiceBasisParts({
        addonTotalOre: 0,
        cancellationFeeOre: null,
        cancellationFeeWaived: false,
        expectedTotalOre: 135_000,
        manualAmountsOre: 0,
        status: "cancelled",
      })
    ).toEqual({
      addonsOre: 0,
      cancellationFeesOre: 0,
      manualAmountsOre: 0,
      roomRentOre: 0,
    });
  });
});

const confirmed = {
  addonTotalOre: 0,
  cancellationFeeOre: null,
  cancellationFeeWaived: false,
  expectedTotalOre: 40_000,
  invoicingStatus: "not_invoiced",
  manualAmountsOre: 0,
  status: "confirmed",
} as const;

describe("invoiceBasisOre", () => {
  it("reads the whole basis for a booking still open for an invoice", () => {
    expect(
      invoiceBasisOre({
        ...confirmed,
        expectedTotalOre: 135_000,
        manualAmountsOre: 20_000,
      })
    ).toBe(155_000);
  });

  it("reads an invoiced booking's basis the same", () => {
    expect(invoiceBasisOre({ ...confirmed, invoicingStatus: "invoiced" })).toBe(
      40_000
    );
  });

  it("reads a not-invoicable booking as nothing ready to invoice", () => {
    expect(
      invoiceBasisOre({ ...confirmed, invoicingStatus: "not_invoicable" })
    ).toBe(0);
  });

  it("reads a not-invoicable cancelled booking as nothing, fee or not", () => {
    expect(
      invoiceBasisOre({
        ...confirmed,
        cancellationFeeOre: 50_000,
        invoicingStatus: "not_invoicable",
        status: "cancelled",
      })
    ).toBe(0);
  });
});
