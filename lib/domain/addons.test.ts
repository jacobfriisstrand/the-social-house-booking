import { describe, expect, it } from "vitest";
import {
  type AddOn,
  addonLine,
  addonLines,
  addonQuantity,
  linesTotalOre,
} from "./addons";

const screen: AddOn = {
  addonId: "00000000-0000-0000-0000-0000000000a1",
  description: null,
  name: "Ekstra skærm",
  priceOre: 50_000,
  pricingModel: "fixed",
};

const lunch: AddOn = {
  addonId: "00000000-0000-0000-0000-0000000000a2",
  description: null,
  name: "Lunch",
  priceOre: 22_500,
  pricingModel: "per_participant",
};

describe("addonQuantity", () => {
  it("is 1 for a fixed add-on", () => {
    expect(addonQuantity("fixed", 10)).toBe(1);
  });

  it("is the participant count for a per-participant add-on", () => {
    expect(addonQuantity("per_participant", 10)).toBe(10);
  });
});

describe("addonLine", () => {
  it("prices a fixed add-on as its total, whatever the headcount", () => {
    expect(addonLine(screen, 10)).toEqual({
      addonId: screen.addonId,
      quantity: 1,
      totalOre: 50_000,
      unitPriceOre: 50_000,
    });
  });

  it("prices a per-participant add-on as price × participants", () => {
    // Bilag 1: 10 × 225 kr = 2 250 kr.
    expect(addonLine(lunch, 10)).toEqual({
      addonId: lunch.addonId,
      quantity: 10,
      totalOre: 225_000,
      unitPriceOre: 22_500,
    });
  });

  it("ignores the participant count for a fixed add-on", () => {
    expect(addonLine(screen, 0).totalOre).toBe(50_000);
  });

  it("gives 0 for 0 participants on a per-participant add-on", () => {
    expect(addonLine(lunch, 0).totalOre).toBe(0);
  });

  it("uses an override unit price without touching the catalogue price", () => {
    // House Host adjusted per booking (#7): the line carries the adjusted
    // amount; addon_price_ore keeps its base for the next booking.
    const host: AddOn = { ...screen, priceOre: 100_000 };
    const line = addonLine(host, 10, { overrideUnitPriceOre: 150_000 });
    expect(line).toEqual({
      addonId: host.addonId,
      quantity: 1,
      totalOre: 150_000,
      unitPriceOre: 150_000,
    });
    expect(host.priceOre).toBe(100_000);
  });

  it("falls back to the catalogue price on a null override", () => {
    expect(
      addonLine(screen, 10, { overrideUnitPriceOre: null }).unitPriceOre
    ).toBe(50_000);
  });
});

describe("addonLines", () => {
  it("builds one line per add-on and sums to the booking's add-on total", () => {
    const lines = addonLines([screen, lunch], 5);
    expect(lines).toEqual([
      {
        addonId: screen.addonId,
        quantity: 1,
        totalOre: 50_000,
        unitPriceOre: 50_000,
      },
      {
        addonId: lunch.addonId,
        quantity: 5,
        totalOre: 112_500,
        unitPriceOre: 22_500,
      },
    ]);
    expect(linesTotalOre(lines)).toBe(162_500);
  });

  it("applies overrides per add-on only", () => {
    const lines = addonLines(
      [screen, lunch],
      4,
      new Map([[screen.addonId, { overrideUnitPriceOre: 60_000 }]])
    );
    expect(lines[0]?.totalOre).toBe(60_000);
    expect(lines[1]?.totalOre).toBe(90_000);
    expect(linesTotalOre(lines)).toBe(150_000);
  });

  it("returns no lines for an empty selection", () => {
    expect(addonLines([], 5)).toEqual([]);
    expect(linesTotalOre([])).toBe(0);
  });
});
