import { describe, expect, it } from "vitest";
import {
  type BookingAddonEmbedRow,
  bookingAddonOverviewLines,
  type ManualAmountEmbedRow,
  manualAmountEntries,
} from "./rows";

const addonLine = (
  overrides?: Partial<BookingAddonEmbedRow>
): BookingAddonEmbedRow => ({
  addons: {
    addon_description: "Opsætning og afvikling",
    addon_name: "Room reset",
  },
  booking_addon_addon_id: "00000000-0000-0000-0000-0000000000a1",
  booking_addon_quantity: 1,
  booking_addon_total_ore: 50_000,
  ...overrides,
});

const manualAmount = (
  overrides?: Partial<ManualAmountEmbedRow>
): ManualAmountEmbedRow => ({
  manual_amount_amount_ore: 25_000,
  manual_amount_created_at: "2026-10-01T10:00:00.000Z",
  manual_amount_created_by: "00000000-0000-0000-0000-0000000000u1",
  manual_amount_id: "00000000-0000-0000-0000-0000000000m1",
  manual_amount_note: "Ekstra strøm",
  ...overrides,
});

describe("bookingAddonOverviewLines", () => {
  it("maps the frozen quantity and line total with the catalogue name and description", () => {
    const lines = bookingAddonOverviewLines([
      addonLine({
        booking_addon_quantity: 8,
        booking_addon_total_ore: 400_000,
      }),
    ]);
    expect(lines).toEqual([
      {
        addonId: "00000000-0000-0000-0000-0000000000a1",
        description: "Opsætning og afvikling",
        name: "Room reset",
        quantity: 8,
        totalOre: 400_000,
      },
    ]);
  });

  it("an add-on without a description carries none", () => {
    const lines = bookingAddonOverviewLines([
      addonLine({
        addons: { addon_description: null, addon_name: "Catering" },
      }),
    ]);
    expect(lines[0]?.name).toBe("Catering");
    expect(lines[0]?.description).toBeNull();
  });

  it("a missing join row reads as null name and description, quantity and total intact", () => {
    const lines = bookingAddonOverviewLines([addonLine({ addons: null })]);
    expect(lines).toEqual([
      {
        addonId: "00000000-0000-0000-0000-0000000000a1",
        description: null,
        name: null,
        quantity: 1,
        totalOre: 50_000,
      },
    ]);
  });

  it("no add-on lines is an empty list, null included", () => {
    expect(bookingAddonOverviewLines([])).toEqual([]);
    expect(bookingAddonOverviewLines(null)).toEqual([]);
  });

  it("keeps the query's add-on order", () => {
    const lines = bookingAddonOverviewLines([
      addonLine({
        booking_addon_addon_id: "00000000-0000-0000-0000-0000000000b2",
      }),
      addonLine({
        booking_addon_addon_id: "00000000-0000-0000-0000-0000000000a1",
      }),
    ]);
    expect(lines.map((line) => line.addonId)).toEqual([
      "00000000-0000-0000-0000-0000000000b2",
      "00000000-0000-0000-0000-0000000000a1",
    ]);
  });
});

describe("manualAmountEntries", () => {
  it("no manual amounts is an empty list, null included", () => {
    expect(manualAmountEntries([])).toEqual([]);
    expect(manualAmountEntries(null)).toEqual([]);
  });

  it("resolves the creating admin's display name", () => {
    const names = new Map([
      ["00000000-0000-0000-0000-0000000000u1", "Jacob Friis Strand"],
    ]);
    expect(manualAmountEntries([manualAmount()], names)).toEqual([
      {
        amountOre: 25_000,
        createdAt: "2026-10-01T10:00:00.000Z",
        createdByName: "Jacob Friis Strand",
        manualAmountId: "00000000-0000-0000-0000-0000000000m1",
        note: "Ekstra strøm",
      },
    ]);
  });

  it("a gone admin row reads as no name", () => {
    expect(manualAmountEntries([manualAmount()], new Map())).toEqual([
      {
        amountOre: 25_000,
        createdAt: "2026-10-01T10:00:00.000Z",
        createdByName: null,
        manualAmountId: "00000000-0000-0000-0000-0000000000m1",
        note: "Ekstra strøm",
      },
    ]);
  });

  it("a member read carries no created-by column: no name", () => {
    const [entry] = manualAmountEntries([
      manualAmount({ manual_amount_created_by: undefined }),
    ]);
    expect(entry?.createdByName).toBeNull();
  });

  it("keeps the query's order", () => {
    const entries = manualAmountEntries([
      manualAmount({
        manual_amount_id: "00000000-0000-0000-0000-0000000000m2",
      }),
      manualAmount({
        manual_amount_id: "00000000-0000-0000-0000-0000000000m1",
      }),
    ]);
    expect(entries.map((entry) => entry.manualAmountId)).toEqual([
      "00000000-0000-0000-0000-0000000000m2",
      "00000000-0000-0000-0000-0000000000m1",
    ]);
  });
});
