import { describe, expect, it } from "vitest";
import type { AddOn } from "./addons";
import {
  type BookingPriceViewer,
  bookingPriceOverview,
  selectedBookingAddOns,
} from "./booking-price";

const screen: AddOn = {
  addonId: "screen",
  description: "Skærm",
  name: "Skærm",
  priceOre: 10_000,
  pricingModel: "fixed",
};

const lunch: AddOn = {
  addonId: "lunch",
  description: "Frokost",
  name: "Frokost",
  priceOre: 22_500,
  pricingModel: "per_participant",
};

const catalogue = [screen, lunch];

function companyViewer(): BookingPriceViewer {
  return { kind: "company" };
}

function adminViewer(overrideOre?: number): BookingPriceViewer {
  return overrideOre === undefined
    ? { kind: "admin" }
    : { kind: "admin", overrideOre };
}

function input(
  overrides: Partial<
    Omit<Parameters<typeof bookingPriceOverview>[0], "viewer">
  > & {
    viewer?: BookingPriceViewer;
  }
): Parameters<typeof bookingPriceOverview>[0] {
  return {
    addOnSelection: {
      participantCount: 8,
      quantities: undefined,
      selectedIds: [],
    },
    discountPercent: 0,
    hours: 3,
    roomAddOns: catalogue,
    roomHourlyPriceOre: 24_000,
    viewer: companyViewer(),
    ...overrides,
  };
}

describe("selectedBookingAddOns", () => {
  it("keeps only catalogue add-ons the booker chose, in catalogue order", () => {
    const selected = selectedBookingAddOns(catalogue, ["lunch", "screen"]);
    expect(selected).toEqual([screen, lunch]);
  });

  it("drops ids that are not add-ons of the room", () => {
    const selected = selectedBookingAddOns(catalogue, ["lunch", "ghost"]);
    expect(selected).toEqual([lunch]);
  });
});

describe("bookingPriceOverview — room, hours, discount", () => {
  it("derives the room total from hourly price × hours and reports the member price", () => {
    const overview = bookingPriceOverview(
      input({ discountPercent: 25, viewer: companyViewer() })
    );
    expect(overview.roomNormalTotalOre).toBe(72_000);
    expect(overview.roomMemberTotalOre).toBe(54_000);
    expect(overview.totalOre).toBe(54_000);
  });

  it("prices add-ons on top of the discounted room", () => {
    const overview = bookingPriceOverview(
      input({
        addOnSelection: {
          participantCount: 8,
          quantities: undefined,
          selectedIds: ["screen"],
        },
        discountPercent: 25,
        viewer: companyViewer(),
      })
    );
    expect(overview.addOnsOre).toBe(10_000);
    expect(overview.totalOre).toBe(64_000);
  });

  it("rounds the room total at the live derivation (805 øre/h × 0.5 h)", () => {
    // 402.5 øre rounds half up to 403; the member price 362.7 rounds to 363
    // and the savings to 40 — the same numbers the frozen snapshot gets.
    const overview = bookingPriceOverview(
      input({ discountPercent: 10, hours: 0.5, roomHourlyPriceOre: 805 })
    );
    expect(overview.roomNormalTotalOre).toBe(403);
    expect(overview.roomMemberTotalOre).toBe(363);
    expect(overview.savingsOre).toBe(40);
    expect(overview.totalOre).toBe(363);
  });

  it("hides the savings banner for a company without a discount", () => {
    const overview = bookingPriceOverview(input({ discountPercent: 0 }));
    expect(overview.showSavings).toBe(false);
    expect(overview.savingsOre).toBe(0);
    expect(overview.roomMemberTotalOre).toBe(overview.roomNormalTotalOre);
  });
});

describe("bookingPriceOverview — add-on line resolution", () => {
  it("prices a fixed add-on once whatever the quantities say", () => {
    const overview = bookingPriceOverview(
      input({
        addOnSelection: {
          participantCount: 8,
          quantities: { screen: 5 },
          selectedIds: ["screen"],
        },
        viewer: companyViewer(),
      })
    );
    expect(overview.addOnsOre).toBe(10_000);
  });

  it("prices a per-participant add-on at the chosen quantity", () => {
    const overview = bookingPriceOverview(
      input({
        addOnSelection: {
          participantCount: 8,
          quantities: { lunch: 4 },
          selectedIds: ["lunch"],
        },
        viewer: companyViewer(),
      })
    );
    expect(overview.addOnsOre).toBe(90_000);
  });

  it("falls back to the headcount when the booker left the stepper untouched", () => {
    const overview = bookingPriceOverview(
      input({
        addOnSelection: {
          participantCount: 8,
          quantities: undefined,
          selectedIds: ["lunch"],
        },
        viewer: companyViewer(),
      })
    );
    expect(overview.addOnsOre).toBe(180_000);
  });

  it("prices an empty booking when the dialog passes 0 before the form mounts", () => {
    const overview = bookingPriceOverview(
      input({
        addOnSelection: {
          participantCount: 0,
          quantities: undefined,
          selectedIds: ["lunch"],
        },
        viewer: companyViewer(),
      })
    );
    expect(overview.addOnsOre).toBe(0);
  });

  it("drops another room's add-on from the priced lines", () => {
    const overview = bookingPriceOverview(
      input({
        addOnSelection: {
          participantCount: 8,
          quantities: undefined,
          selectedIds: ["ghost", "lunch"],
        },
        viewer: companyViewer(),
      })
    );
    expect(overview.addOnsOre).toBe(180_000);
  });
});

describe("bookingPriceOverview — admin override", () => {
  it("replaces the computed total with the admin's explicit total", () => {
    const overview = bookingPriceOverview(
      input({
        addOnSelection: {
          participantCount: 8,
          quantities: undefined,
          selectedIds: ["screen"],
        },
        viewer: adminViewer(10_000),
      })
    );
    expect(overview.roomNormalTotalOre).toBe(72_000);
    expect(overview.addOnsOre).toBe(10_000);
    expect(overview.totalOre).toBe(10_000);
  });

  it("keeps the computed total when an admin types no override", () => {
    const overview = bookingPriceOverview(input({ viewer: adminViewer() }));
    expect(overview.totalOre).toBe(72_000);
  });

  it("falls back to the computed total on a non-finite override (NaN)", () => {
    const overview = bookingPriceOverview(
      input({ viewer: adminViewer(Number.NaN) })
    );
    expect(overview.totalOre).toBe(72_000);
  });
});
