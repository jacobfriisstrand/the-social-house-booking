import { describe, expect, it } from "vitest";
import { type AddOn, addOnTotalOre, totalAddOnsOre } from "./addons";

describe("addOnTotalOre", () => {
  it("returns the fixed price for a fixed add-on", () => {
    const screen: AddOn = {
      kind: "fixed",
      name: "Extra screen",
      priceOre: 50_000,
    };
    expect(addOnTotalOre(screen, 10)).toBe(50_000);
  });

  it("returns price × participant count for a per-participant add-on", () => {
    const lunch: AddOn = {
      kind: "per_participant",
      name: "Lunch",
      priceOre: 22_500,
    };
    expect(addOnTotalOre(lunch, 10)).toBe(225_000);
  });

  it("returns 0 for 0 participants on a per-participant add-on", () => {
    const lunch: AddOn = {
      kind: "per_participant",
      name: "Lunch",
      priceOre: 22_500,
    };
    expect(addOnTotalOre(lunch, 0)).toBe(0);
  });

  it("ignores participant count for fixed add-ons", () => {
    const screen: AddOn = {
      kind: "fixed",
      name: "Extra screen",
      priceOre: 50_000,
    };
    expect(addOnTotalOre(screen, 0)).toBe(50_000);
  });
});

describe("totalAddOnsOre", () => {
  it("sums multiple add-ons", () => {
    const addOns: AddOn[] = [
      { kind: "fixed", name: "Extra screen", priceOre: 50_000 },
      { kind: "per_participant", name: "Lunch", priceOre: 22_500 },
    ];
    // 50000 + (22500 × 5) = 50000 + 112500 = 162500
    expect(totalAddOnsOre(addOns, 5)).toBe(162_500);
  });

  it("returns 0 for an empty list", () => {
    expect(totalAddOnsOre([], 5)).toBe(0);
  });

  it("never applies discount to add-ons (ADR-0007)", () => {
    const addOns: AddOn[] = [
      { kind: "per_participant", name: "Lunch", priceOre: 22_500 },
    ];
    // Even with discount context, add-ons are always full price
    expect(totalAddOnsOre(addOns, 3)).toBe(67_500);
  });
});
