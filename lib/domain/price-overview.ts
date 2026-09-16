// The price overview (#6, Bilag 1 "Priser og rabatter"): normal room
// price, company discount, member price, savings, add-ons (never
// discounted, ADR-0007), total expected excl. VAT. A pure view model so
// the component only renders; the savings banner exists only when the
// company has a discount. Post-confirmation every input comes from the
// booking's frozen snapshot columns (ADR-0005) — never live prices.
import { memberPriceOre, roomTotalOre, savingsOre } from "./pricing";

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
  hours: number;
  roomHourlyPriceOre: number;
  // The frozen booking_expected_total_ore. Passed in rather than
  // recomputed so a confirmed booking shows exactly what was frozen.
  totalOre: number;
}

export function priceOverview(input: PriceOverviewInput): PriceOverviewModel {
  const roomNormalTotalOre = roomTotalOre(
    input.roomHourlyPriceOre,
    input.hours
  );
  const roomMemberTotalOre = memberPriceOre(
    roomNormalTotalOre,
    input.discountPercent
  );
  return {
    addOnsOre: input.addOnsOre,
    discountPercent: input.discountPercent,
    roomMemberTotalOre,
    roomNormalTotalOre,
    savingsOre: savingsOre(roomNormalTotalOre, input.discountPercent),
    showSavings: input.discountPercent > 0,
    totalOre: input.totalOre,
  };
}
