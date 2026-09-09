import { roundHalfUp } from "./money";

export function cancellationPercent(hoursBefore: number): number {
  if (hoursBefore > 72) {
    return 0;
  }
  if (hoursBefore >= 24) {
    return 50;
  }
  return 100;
}

export function cancellationFeeOre(
  memberPriceOre: number,
  hoursBefore: number
): number {
  const pct = cancellationPercent(hoursBefore);
  return roundHalfUp((memberPriceOre * pct) / 100);
}
