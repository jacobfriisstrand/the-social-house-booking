import { describe, expect, it } from "vitest";
import { discountAmountOre, memberPriceOre, roomTotalOre } from "./pricing";

describe("roomTotalOre", () => {
  it("multiplies hourly price by hours", () => {
    // 800 kr/hour × 3 hours = 2400 kr = 240000 øre
    expect(roomTotalOre(80_000, 3)).toBe(240_000);
  });

  it("handles 30-minute bookings (0.5 hours)", () => {
    // 800 kr/hour × 0.5 hours = 400 kr = 40000 øre
    expect(roomTotalOre(80_000, 0.5)).toBe(40_000);
  });

  it("handles 1.5-hour bookings", () => {
    // 500 kr/hour × 1.5 hours = 750 kr = 75000 øre
    expect(roomTotalOre(50_000, 1.5)).toBe(75_000);
  });
});

describe("memberPriceOre", () => {
  it("applies 50% discount", () => {
    // 240000 øre × 50% = 120000 øre
    expect(memberPriceOre(240_000, 50)).toBe(120_000);
  });

  it("applies 0% discount (full price)", () => {
    expect(memberPriceOre(240_000, 0)).toBe(240_000);
  });

  it("applies 100% discount (free)", () => {
    expect(memberPriceOre(240_000, 100)).toBe(0);
  });

  it("rounds half-up to nearest øre", () => {
    // 100 øre × 33% = 33 øre (exact)
    expect(memberPriceOre(100, 33)).toBe(67);
  });

  it("rounds half-up when result is fractional", () => {
    // 100 øre × 15% = 15 øre exact → member pays 85
    expect(memberPriceOre(100, 15)).toBe(85);
  });

  it("rounds correctly for odd amounts", () => {
    // 1000 øre × 33% = 330 øre exact → member pays 670
    expect(memberPriceOre(1000, 33)).toBe(670);
  });
});

describe("discountAmountOre", () => {
  it("returns the discount amount for 50% off", () => {
    expect(discountAmountOre(240_000, 50)).toBe(120_000);
  });

  it("returns 0 for 0% discount", () => {
    expect(discountAmountOre(240_000, 0)).toBe(0);
  });

  it("returns full amount for 100% discount", () => {
    expect(discountAmountOre(240_000, 100)).toBe(240_000);
  });

  it("rounds half-up consistently with memberPriceOre", () => {
    const price = 1000;
    const pct = 33;
    expect(discountAmountOre(price, pct) + memberPriceOre(price, pct)).toBe(
      price
    );
  });
});
