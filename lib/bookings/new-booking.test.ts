// The frozen snapshot round trip (#5, ADR-0005): what newBookingRow writes
// into booking_room_price_ore must be what the sheet, the table, the hold
// preview and the cancellation fee read back — the room's total price for
// the booked hours, before discount. Regression for the pricing that "did
// not add up": the writer used to freeze the hourly price, and every
// hand-written row (seed, fixtures) carries the total, so the readers
// multiplied the room line by the hours a second time.
import { describe, expect, it } from "vitest";
import type { CancellationBasis } from "@/lib/domain/cancellation";
import { memberPriceOreForBooking } from "@/lib/domain/cancellation";
import { bookingPriceOverview, newBookingRow } from "./new-booking";

// The reported booking: Room of Power, 4 h, House Service + Lunch for 8,
// Rituals (50 %). Room 3.200 kr, add-ons 2.300 kr, discount 1.600 kr —
// the total must be 3.900 kr and the panel must add up.
const FOUR_HOURS = {
  endAt: "2026-10-05T14:00:00Z",
  startAt: "2026-10-05T10:00:00Z",
};

const holdInput = {
  addOnIds: [],
  bookerEmail: "peter@rituals.dk",
  bookerName: "Peter Pedersen",
  bookerPhone: "+45 2010 2030",
  cateringAccepted: true,
  participantCount: 8,
  roomId: "00000000-0000-0000-0000-0000000000c1",
  termsAccepted: true,
  ...FOUR_HOURS,
};

const ADD_ON_LINES_ORE = 230_000;

describe("the frozen room price is the room's total for the booked hours", () => {
  it("newBookingRow freezes the room rental, not the hourly price", () => {
    const row = newBookingRow(holdInput, 50, 80_000);
    expect(row.booking_room_price_ore).toBe(320_000);
    // The row starts at the member price; the add-on lines are moved on
    // top of it by booking_addons_sync_totals.
    expect(row.booking_expected_total_ore).toBe(160_000);
  });

  it("the sheet's overview reads the frozen total back as it was shown", () => {
    const row = newBookingRow(holdInput, 50, 80_000);
    // booking_addons_sync_totals moves the two totals by the line sum.
    const stored = {
      ...row,
      booking_addon_total_ore: ADD_ON_LINES_ORE,
      booking_discount_percent: row.booking_discount_percent ?? 0,
      booking_expected_total_ore:
        (row.booking_expected_total_ore ?? 0) + ADD_ON_LINES_ORE,
    };
    const model = bookingPriceOverview(stored);
    expect(model.roomNormalTotalOre).toBe(320_000);
    expect(model.savingsOre).toBe(160_000);
    expect(model.roomMemberTotalOre).toBe(160_000);
    expect(model.totalOre).toBe(390_000);
  });

  it("the cancellation fee is the member price of the frozen room rental", () => {
    const row = newBookingRow(holdInput, 50, 80_000);
    const basis: CancellationBasis = {
      bookingDiscountPercent: row.booking_discount_percent ?? 0,
      bookingEndAt: new Date(row.booking_end_at),
      bookingRoomPriceOre: row.booking_room_price_ore ?? 0,
      bookingStartAt: new Date(row.booking_start_at),
    };
    expect(memberPriceOreForBooking(basis)).toBe(160_000);
  });

  it("a hand-written total (seeded rows) reads back without a second multiply", () => {
    // The seeded invoiced workshop (e1): Room of Power 2 h, stored room
    // total 1.600 kr, add-ons 2.300 kr, frozen total 3.100 kr. Before the
    // fix this read back as room 3.200 kr and a −1.600 kr discount that
    // made the panel stop adding up.
    const stored = {
      booking_addon_total_ore: 230_000,
      booking_discount_percent: 50,
      booking_end_at: FOUR_HOURS.endAt.replace("14:00", "12:00"),
      booking_expected_total_ore: 310_000,
      booking_room_price_ore: 160_000,
      booking_start_at: FOUR_HOURS.startAt,
    };
    const model = bookingPriceOverview(stored);
    expect(model.roomNormalTotalOre).toBe(160_000);
    expect(model.savingsOre).toBe(80_000);
    expect(model.totalOre).toBe(310_000);
    expect(model.roomNormalTotalOre - model.savingsOre + model.addOnsOre).toBe(
      model.totalOre
    );
  });
});
