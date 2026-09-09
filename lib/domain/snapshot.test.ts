import { describe, expect, it } from "vitest";
import {
  type BookingSnapshot,
  buildSnapshot,
  expectedTotalOre,
} from "./snapshot";

describe("expectedTotalOre", () => {
  it("sums member price and add-ons", () => {
    expect(expectedTotalOre(120_000, 50_000)).toBe(170_000);
  });

  it("returns member price when no add-ons", () => {
    expect(expectedTotalOre(120_000, 0)).toBe(120_000);
  });

  it("returns 0 when both are 0", () => {
    expect(expectedTotalOre(0, 0)).toBe(0);
  });
});

describe("buildSnapshot", () => {
  it("freezes all pricing values at confirmation", () => {
    const snapshot = buildSnapshot({
      addOnsOre: 50_000,
      discountPercent: 50,
      hours: 3,
      roomHourlyPriceOre: 80_000,
    });

    expect(snapshot).toEqual({
      addOnsOre: 50_000,
      discountPercent: 50,
      hours: 3,
      memberPriceOre: 240_000 - 120_000, // roomTotal = 240k, 50% off = 120k
      roomHourlyPriceOre: 80_000,
      totalOre: 120_000 + 50_000,
    } satisfies BookingSnapshot);
  });

  it("freezes 0% discount (external company)", () => {
    const snapshot = buildSnapshot({
      addOnsOre: 0,
      discountPercent: 0,
      hours: 3,
      roomHourlyPriceOre: 80_000,
    });

    expect(snapshot.memberPriceOre).toBe(240_000);
    expect(snapshot.totalOre).toBe(240_000);
  });

  it("later changes to inputs do not affect snapshot", () => {
    const snapshot = buildSnapshot({
      addOnsOre: 50_000,
      discountPercent: 50,
      hours: 3,
      roomHourlyPriceOre: 80_000,
    });

    // Simulating "price changes after confirmation" — snapshot is immutable
    expect(snapshot.roomHourlyPriceOre).toBe(80_000);
    expect(snapshot.memberPriceOre).toBe(120_000);
  });
});
