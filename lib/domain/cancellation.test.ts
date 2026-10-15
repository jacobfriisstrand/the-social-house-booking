import { describe, expect, it } from "vitest";
import {
  bookingCancellationFeeOre,
  cancellationFeeOre,
  cancellationPercent,
  memberPriceOreForBooking,
  payableCancellationFeeOre,
} from "./cancellation";

describe("cancellationPercent", () => {
  it("returns 0 when more than 72 hours before", () => {
    expect(cancellationPercent(73)).toBe(0);
  });

  it("returns 50 at exactly 72 hours (inclusive boundary)", () => {
    expect(cancellationPercent(72)).toBe(50);
  });

  it("returns 50 at exactly 24 hours (inclusive boundary)", () => {
    expect(cancellationPercent(24)).toBe(50);
  });

  it("returns 50 between 24 and 72 hours", () => {
    expect(cancellationPercent(48)).toBe(50);
  });

  it("returns 100 when less than 24 hours before", () => {
    expect(cancellationPercent(23)).toBe(100);
  });

  it("returns 100 when cancelling immediately before", () => {
    expect(cancellationPercent(0)).toBe(100);
  });
});

describe("cancellationFeeOre", () => {
  it("returns 0 for free cancellation (>72h)", () => {
    // Member price: 1200 kr = 120000 øre, 73 hours before
    expect(cancellationFeeOre(120_000, 73)).toBe(0);
  });

  it("returns 50% of member price at 72h boundary", () => {
    expect(cancellationFeeOre(120_000, 72)).toBe(60_000);
  });

  it("returns 50% of member price at 24h boundary", () => {
    expect(cancellationFeeOre(120_000, 24)).toBe(60_000);
  });

  it("returns 100% of member price below 24h", () => {
    expect(cancellationFeeOre(120_000, 23)).toBe(120_000);
  });

  it("rounds half-up to nearest øre", () => {
    // 1001 øre × 50% = 500.5 → rounds to 501
    expect(cancellationFeeOre(1001, 48)).toBe(501);
  });

  it("computes fee on member price, not list price (ADR-0006)", () => {
    // List: 240000, member after 50% discount: 120000
    // Fee at 48h (50%): 60000 (half of member price, not list price)
    const memberPrice = 120_000;
    expect(cancellationFeeOre(memberPrice, 48)).toBe(60_000);
  });

  it("handles the spec example exactly", () => {
    // Member price 1200 kr = 120000 øre, cancels 48h before → 600 kr = 60000 øre
    expect(cancellationFeeOre(120_000, 48)).toBe(60_000);
  });
});

describe("memberPriceOreForBooking", () => {
  // booking_room_price_ore carries the room's total for the booked hours
  // (ADR-0005): a 2-hour booking frozen at 2400 øre.
  const basis = {
    bookingDiscountPercent: 50,
    bookingEndAt: new Date("2026-10-01T10:00:00Z"),
    bookingRoomPriceOre: 2400,
    bookingStartAt: new Date("2026-10-01T08:00:00Z"),
  };

  it("computes the member price from the snapshot inputs (ADR-0006)", () => {
    // Room total 2400 øre at 50 % discount → 1200 øre.
    expect(memberPriceOreForBooking(basis)).toBe(1200);
  });

  it("matches the rounding chain the snapshot was built with", () => {
    // Room total 10005 øre at 10 % → member price 9005 (discount rounds
    // half up), same as buildSnapshot.
    expect(
      memberPriceOreForBooking({
        ...basis,
        bookingDiscountPercent: 10,
        bookingRoomPriceOre: 10_005,
      })
    ).toBe(9005);
  });
});

describe("bookingCancellationFeeOre", () => {
  // A 2-hour booking frozen at its room rental: 1600000 øre (16000 kr),
  // no discount → member price 1600000 øre.
  const basis = {
    bookingDiscountPercent: 0,
    bookingEndAt: new Date("2026-10-01T11:00:00Z"),
    bookingRoomPriceOre: 1_600_000,
    bookingStartAt: new Date("2026-10-01T09:00:00Z"),
  };

  it("is free more than 72 hours before", () => {
    expect(
      bookingCancellationFeeOre(basis, new Date("2026-09-27T10:00:00Z"))
    ).toBe(0);
  });

  it("is 50 % at exactly 72 hours (inclusive)", () => {
    expect(
      bookingCancellationFeeOre(basis, new Date("2026-09-29T09:00:00Z"))
    ).toBe(800_000);
  });

  it("is 50 % at exactly 24 hours (inclusive)", () => {
    expect(
      bookingCancellationFeeOre(basis, new Date("2026-09-30T09:00:00Z"))
    ).toBe(800_000);
  });

  it("is 100 % less than 24 hours before", () => {
    expect(
      bookingCancellationFeeOre(basis, new Date("2026-09-30T10:00:00Z"))
    ).toBe(1_600_000);
  });

  it("applies the tier to the discounted member price (ADR-0006)", () => {
    // The spec example: member price 120000 øre (1200 kr) cancels 48 h
    // before → 60000 øre (600 kr). Room total 240000 øre at 50 % discount.
    expect(
      bookingCancellationFeeOre(
        {
          bookingDiscountPercent: 50,
          bookingEndAt: new Date("2026-10-01T12:00:00Z"),
          bookingRoomPriceOre: 240_000,
          bookingStartAt: new Date("2026-10-01T10:00:00Z"),
        },
        new Date("2026-09-29T10:00:00Z")
      )
    ).toBe(60_000);
  });

  it("never discounts the fee for add-ons", () => {
    // Add-ons are not part of the basis at all; only room snapshot inputs
    // shape the fee.
    expect(memberPriceOreForBooking(basis)).toBe(1_600_000);
  });
});

describe("payableCancellationFeeOre", () => {
  it("shows the computed fee", () => {
    expect(payableCancellationFeeOre(60_000, false)).toBe(60_000);
  });

  it("reads a waived fee as no fee", () => {
    expect(payableCancellationFeeOre(60_000, true)).toBeNull();
    expect(payableCancellationFeeOre(0, false)).toBe(0);
    expect(payableCancellationFeeOre(null, false)).toBeNull();
  });
});
