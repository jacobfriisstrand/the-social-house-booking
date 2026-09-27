import { describe, expect, it } from "vitest";
import { priceOverview } from "./price-overview";

describe("priceOverview", () => {
  it("shows the issue's example: a 3h room at 2400 kr, 50 % discount", () => {
    const overview = priceOverview({
      addOnsOre: 0,
      discountPercent: 50,
      roomTotalOre: 240_000,
      totalOre: 120_000,
    });

    expect(overview).toEqual({
      addOnsOre: 0,
      discountPercent: 50,
      roomMemberTotalOre: 120_000,
      roomNormalTotalOre: 240_000,
      savingsOre: 120_000,
      showSavings: true,
      totalOre: 120_000,
    });
  });

  it("adds undiscounted add-ons on top of the member price", () => {
    const overview = priceOverview({
      addOnsOre: 45_000,
      discountPercent: 50,
      roomTotalOre: 240_000,
      totalOre: 165_000,
    });

    // ADR-0007: savings cover the room rental only; add-ons sit on top
    // untouched and the total is member price + add-ons.
    expect(overview.roomMemberTotalOre).toBe(120_000);
    expect(overview.savingsOre).toBe(120_000);
    expect(overview.addOnsOre).toBe(45_000);
    expect(overview.totalOre).toBe(165_000);
  });

  it("shows no savings banner for a company without a discount", () => {
    const overview = priceOverview({
      addOnsOre: 0,
      discountPercent: 0,
      roomTotalOre: 160_000,
      totalOre: 160_000,
    });

    expect(overview.showSavings).toBe(false);
    expect(overview.savingsOre).toBe(0);
    expect(overview.roomMemberTotalOre).toBe(overview.roomNormalTotalOre);
  });

  it("takes the room total as the caller rounded it", () => {
    // The live preview derives 806 øre/h × 0.5 h = 402.75 → 403 with
    // roomTotalOre() before this model sees it; 10 % → member 362.7 → 363.
    const overview = priceOverview({
      addOnsOre: 0,
      discountPercent: 10,
      roomTotalOre: 403,
      totalOre: 363,
    });

    expect(overview.roomNormalTotalOre).toBe(403);
    expect(overview.roomMemberTotalOre).toBe(363);
    expect(overview.savingsOre).toBe(40);
  });

  it("carries the frozen total through unchanged", () => {
    const overview = priceOverview({
      addOnsOre: 0,
      discountPercent: 50,
      roomTotalOre: 240_000,
      totalOre: 120_000,
    });

    expect(overview.totalOre).toBe(120_000);
  });
});
