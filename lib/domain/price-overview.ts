// The price overview (#6, Bilag 1 "Priser og rabatter"): normal room
// price, company discount, member price, savings, add-ons (never
// discounted, ADR-0007), total expected excl. VAT. A pure view model so
// the component only renders; the savings banner exists only when the
// company has a discount. Post-confirmation every input comes from the
// booking's frozen snapshot columns (ADR-0005) — never live prices.
import { memberPriceOre, savingsOre } from "./pricing";

export interface PriceOverviewModel {
  addOnsOre: number;
  discountPercent: number;
  roomMemberTotalOre: number;
  roomNormalTotalOre: number;
  savingsOre: number;
  showSavings: boolean;
  totalOre: number;
}

export interface PriceOverviewInput {
  addOnsOre: number;
  discountPercent: number;
  // The room's total for the booked hours, before discount — the frozen
  // booking_room_price_ore for confirmed bookings (ADR-0005). A live
  // preview derives it from the hourly price first, so the rounding lives
  // there, not here.
  roomTotalOre: number;
  totalOre: number;
}

export function priceOverview(input: PriceOverviewInput): PriceOverviewModel {
  const roomMemberTotalOre = memberPriceOre(
    input.roomTotalOre,
    input.discountPercent
  );
  return {
    addOnsOre: input.addOnsOre,
    discountPercent: input.discountPercent,
    roomMemberTotalOre,
    roomNormalTotalOre: input.roomTotalOre,
    savingsOre: savingsOre(input.roomTotalOre, input.discountPercent),
    showSavings: input.discountPercent > 0,
    totalOre: input.totalOre,
  };
}
