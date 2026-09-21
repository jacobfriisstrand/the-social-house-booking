// Pricing arithmetic for the booking price overview (#6, Bilag 1 "Priser
// og rabatter"). All amounts are integer øre, excl. VAT (ADR-0019,
// ADR-0020); every function rounds half up to the nearest øre. The
// discount applies to room rental only (ADR-0007).
import { roundHalfUp } from "./money";

export function roomTotalOre(hourlyPriceOre: number, hours: number): number {
  return roundHalfUp(hourlyPriceOre * hours);
}

export function memberPriceOre(
  roomTotal: number,
  discountPercent: number
): number {
  const discounted = (roomTotal * (100 - discountPercent)) / 100;
  return roundHalfUp(discounted);
}

export function discountAmountOre(
  roomTotal: number,
  discountPercent: number
): number {
  const amount = (roomTotal * discountPercent) / 100;
  return roundHalfUp(amount);
}

// Savings (#6): the normal room price minus the member price, room rental
// only. Defined against the member price — not discountAmountOre — so the
// two always add up: the two independent roundings can differ by one øre
// (e.g. 10005 øre at 10 % discounts 1000.5 øre up to 1001, so the member
// price is 9005 and the savings 1000, not 1001).
export function savingsOre(roomTotal: number, discountPercent: number): number {
  return roomTotal - memberPriceOre(roomTotal, discountPercent);
}
