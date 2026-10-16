// The add-ons breakdown (#123 follow-up): the price overview carries each
// add-on's own line under the add-ons summary — name (3x prefix for a
// per-participant add-on), price, the inactive label for a line whose
// add-on is gone — instead of hiding the lines in a hover card. The
// manual amount keeps its tooltip; a model without lines renders no
// add-on rows at all.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PriceOverviewModel } from "@/lib/domain/price-overview";
import { priceOverview } from "@/lib/domain/price-overview";
import { formatOre } from "@/lib/format";
import { messages } from "@/messages/da";
import { PriceOverview } from "./price-overview";

const copy = messages.booking.price;

const model = (overrides: Partial<PriceOverviewModel>): PriceOverviewModel =>
  priceOverview({
    addOnLines: [],
    addOnsOre: 0,
    discountPercent: 0,
    manualAmounts: [],
    roomTotalOre: 62_500,
    totalOre: 62_500,
    ...overrides,
  });

const markup = (price: PriceOverviewModel): string =>
  renderToStaticMarkup(<PriceOverview model={price} />);

describe("PriceOverview add-on breakdown", () => {
  it("lists each add-on under the summary, with its own price", () => {
    const html = markup(
      model({
        addOnLines: [
          {
            addonId: "a1",
            name: "Kaffe og the",
            quantity: 1,
            totalOre: 25_000,
          },
          {
            addonId: "a2",
            name: "Forplejning",
            quantity: 12,
            totalOre: 60_000,
          },
        ],
        addOnsOre: 85_000,
        totalOre: 147_500,
      })
    );
    expect(html).toContain(copy.addOns);
    expect(html).toContain(formatOre(85_000));
    // The fixed add-on is just the name; the per-participant one carries
    // the 12x headcount prefix.
    expect(html).toContain("Kaffe og the");
    expect(html).toContain("12x Forplejning");
    expect(html).toContain(formatOre(25_000));
    expect(html).toContain(formatOre(60_000));
  });

  it("shows the inactive label for a line whose add-on is gone", () => {
    const html = markup(
      model({
        addOnLines: [
          { addonId: "a1", name: null, quantity: 1, totalOre: 10_000 },
        ],
        addOnsOre: 10_000,
        totalOre: 72_500,
      })
    );
    expect(html).toContain(messages.bookings.inactiveAddOn);
  });

  it("carries an info hover only for lines with a description", () => {
    const html = markup(
      model({
        addOnLines: [
          {
            addonId: "a1",
            description: "Kaffe, te og vand serveres af huset.",
            name: "Kaffe og the",
            quantity: 1,
            totalOre: 25_000,
          },
          { addonId: "a2", name: "Parkering", quantity: 1, totalOre: 5000 },
        ],
        addOnsOre: 30_000,
        totalOre: 107_500,
      })
    );
    // The description text lives in the closed tooltip's content, which a
    // static render does not open — the button, one per described line,
    // is what the static markup can pin.
    expect(html.split(`aria-label="${copy.addOnInfo}"`).length - 1).toBe(1);
  });

  it("keeps the sum when the caller has no lines", () => {
    // The verification step, the calendar entry sheet and the notice board
    // pass only the add-ons sum — the summary row must survive, without
    // any per-line rows.
    const html = markup(model({ addOnsOre: 85_000, totalOre: 147_500 }));
    expect(html).toContain(copy.addOns);
    expect(html).toContain(formatOre(85_000));
    expect(html).not.toContain("12x");
  });

  it("renders no add-on rows without lines", () => {
    const html = markup(model({}));
    expect(html).toContain(copy.room);
    expect(html).not.toContain(copy.addOns);
  });

  it("always carries the discount row, 0,00 when the company has none", () => {
    const html = markup(model({}));
    expect(html).toContain(copy.memberDiscount(0));
    expect(html).toContain(formatOre(0));
  });

  it("reads room, then the room's discount, then the add-ons", () => {
    const html = markup(
      model({
        addOnLines: [
          {
            addonId: "a1",
            name: "Kaffe og the",
            quantity: 1,
            totalOre: 25_000,
          },
        ],
        addOnsOre: 25_000,
        discountPercent: 15,
        totalOre: 78_125,
      })
    );
    expect(html).toContain(copy.memberDiscount(15));
    // The 15% covers the room rental alone: 62.500 → 53.125, 9.375 saved.
    expect(html).toContain(formatOre(-9375));
    expect(html.indexOf(copy.room)).toBeLessThan(
      html.indexOf(copy.memberDiscount(15))
    );
    expect(html.indexOf(copy.memberDiscount(15))).toBeLessThan(
      html.indexOf(copy.addOns)
    );
  });
});
