// The price overview (#6, Bilag 1 "Priser og rabatter"): normal room
// price, company discount, member price, savings, add-ons (never
// discounted, ADR-0007), total expected excl. VAT. A pure view model so
// the component only renders; the savings banner exists only when the
// company has a discount. Post-confirmation every input comes from the
// booking's frozen snapshot columns (ADR-0005) — never live prices.
import { memberPriceOre, savingsOre } from "./pricing";

// One manual amount (ADR-0010) as an extra price row in the overview: the
// amount and the note saying what it was for. The id keys the row.
export interface ManualAmountPriceRow {
  amountOre: number;
  manualAmountId: string;
  note: string;
}

export interface PriceOverviewModel {
  addOnsOre: number;
  discountPercent: number;
  // The amounts admin added after the meeting (ADR-0010), oldest first —
  // each an extra price row, never discounted (ADR-0007) and included in
  // the total. Empty for fresh bookings: a manual amount only exists once
  // a meeting has been held.
  manualAmounts: ManualAmountPriceRow[];
  roomMemberTotalOre: number;
  roomNormalTotalOre: number;
  savingsOre: number;
  showSavings: boolean;
  totalOre: number;
}

export interface PriceOverviewInput {
  addOnsOre: number;
  discountPercent: number;
  manualAmounts?: ManualAmountPriceRow[];
  // The room's total for the booked hours, before discount — the frozen
  // booking_room_price_ore for confirmed bookings (ADR-0005). A live
  // preview derives it from the hourly price first, so the rounding lives
  // there, not here.
  roomTotalOre: number;
  // The frozen expected total (ADR-0005); the manual amounts are the
  // post-meeting additions that sit on top of it.
  totalOre: number;
}

export function priceOverview(input: PriceOverviewInput): PriceOverviewModel {
  const roomMemberTotalOre = memberPriceOre(
    input.roomTotalOre,
    input.discountPercent
  );
  const manualAmounts = input.manualAmounts ?? [];
  return {
    addOnsOre: input.addOnsOre,
    discountPercent: input.discountPercent,
    manualAmounts,
    roomMemberTotalOre,
    roomNormalTotalOre: input.roomTotalOre,
    savingsOre: savingsOre(input.roomTotalOre, input.discountPercent),
    showSavings: input.discountPercent > 0,
    totalOre:
      input.totalOre + manualAmounts.reduce((sum, a) => sum + a.amountOre, 0),
  };
}
