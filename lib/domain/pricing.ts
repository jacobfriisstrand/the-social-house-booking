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
