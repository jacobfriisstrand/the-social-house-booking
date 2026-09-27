// Cancellation fees (#5, Bilag 1 "Afbooking", ADR-0006): tiers of the
// member price — free more than 72h before, 50 % from 24h to 72h before
// inclusive, 100 % less than 24h before — computed from the booking's
// frozen price snapshot columns (ADR-0005) with the same rounding chain
// the snapshot was built with. Add-ons and catering are never part of the
// fee (ADR-0007); they are invoiced separately. All amounts integer øre,
// excl. VAT (ADR-0019, ADR-0020).
import { roundHalfUp } from "./money";
import { memberPriceOre } from "./pricing";
import { hoursBetween } from "./time";

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
  priceOre: number,
  hoursBefore: number
): number {
  const pct = cancellationPercent(hoursBefore);
  return roundHalfUp((priceOre * pct) / 100);
}

export interface CancellationBasis {
  bookingDiscountPercent: number;
  bookingEndAt: Date;
  bookingRoomPriceOre: number;
  bookingStartAt: Date;
}

export function memberPriceOreForBooking(basis: CancellationBasis): number {
  // booking_room_price_ore is the frozen room rental for the booked hours
  // (ADR-0005) — the fee tier applies to it after discount, never to the
  // hourly price and never to the add-ons (ADR-0007).
  return memberPriceOre(
    basis.bookingRoomPriceOre,
    basis.bookingDiscountPercent
  );
}

// The fee the system registers (ADR-0006): the tier from the cancellation
// time against the booking start, applied to the member price. Hours before
// can be negative (the start has passed); the tiers read that as "less than
// 24 hours before", i.e. 100 %.
export function bookingCancellationFeeOre(
  basis: CancellationBasis,
  cancelledAt: Date
): number {
  return cancellationFeeOre(
    memberPriceOreForBooking(basis),
    hoursBetween(cancelledAt, basis.bookingStartAt)
  );
}

// The fee a screen or mail shows: a waived fee (Bilag 1 "Ombooking og
// fejl") is not charged, so a waived booking displays like no fee at all —
// the computed amount stays on the row for the audit trail.
export function payableCancellationFeeOre(
  feeOre: number | null,
  waived: boolean
): number | null {
  if (waived) {
    return null;
  }
  return feeOre;
}
