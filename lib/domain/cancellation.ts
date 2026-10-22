// Cancellation (#5, Bilag 1 "Afbooking", ADR-0006): the one policy that
// answers "may this booking be cancelled now, and what fee does the screen
// show?" for every surface — the member overview's mapper, the admin
// overview's guard and cancel dialog, and the confirm flow's pre-write
// check (#155).
//
// The fee is tiers of the member price — free more than 72h before, 50 %
// from 24h to 72h before inclusive, 100 % less than 24h before — computed
// from the booking's frozen price snapshot columns (ADR-0005) with the
// same rounding chain the snapshot was built with. Add-ons and catering
// are never part of the fee (ADR-0007); they are invoiced separately. All
// amounts integer øre, excl. VAT (ADR-0019, ADR-0020).
import type { Database } from "@/lib/supabase/database.types";
import { roundHalfUp } from "./money";
import { memberPriceOre } from "./pricing";
import { hoursBetween } from "./time";

/** The booking_status enum, as the policy reads it. */
export type BookingStatus = Database["public"]["Enums"]["booking_status"];

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

// Why a booking cannot be cancelled right now (#5). Each state maps to one
// plain sentence; a row the caller cannot see (RLS on the session path)
// reads as not cancellable, never as someone else's booking.
export type CancellationRefusal =
  | "already_cancelled"
  | "not_cancellable"
  | "start_passed";

// The booking facts the policy reads: the frozen snapshot columns the fee
// tiers apply to (ADR-0005) plus the status and the waived flag (Bilag 1
// "Ombooking og fejl").
export interface CancellationInput {
  discountPercent: number;
  roomPriceOre: number;
  startAt: Date;
  status: BookingStatus;
  waived: boolean;
}

// The one cancellation decision (#155): the screen-time invariant — only a
// confirmed booking whose start has not passed can cancel — and the fee
// the screen states, so the mapper, the admin guard, the admin dialog and
// the confirm flow all read the same answer. `mayCancel` and `refusal`
// cannot disagree: a refusal only rides a "no". The branches carry only
// their own fields, so reading `feeOre` or `refusal` forces narrowing on
// `mayCancel`.
export type CancellationPolicy =
  | {
      // The tier fee at this instant (ADR-0006); 0 when the fee is waived
      // (Bilag 1 "Ombooking og fejl") — a waived fee is not charged, so
      // the screen states no fee.
      feeOre: number;
      mayCancel: true;
    }
  | {
      mayCancel: false;
      refusal: CancellationRefusal;
    };

export function cancellationPolicy(
  input: CancellationInput,
  now: Date
): CancellationPolicy {
  // The write re-checks the same conditions atomically
  // (cancelConfirmedBooking), so a booking that slips past while the
  // screen is open still fails the write, never the rules.
  if (input.status === "cancelled") {
    return { mayCancel: false, refusal: "already_cancelled" };
  }
  if (input.status !== "confirmed") {
    // A hold pending verification and a hold that has expired are not
    // bookings yet — nothing to cancel.
    return { mayCancel: false, refusal: "not_cancellable" };
  }
  if (input.startAt.getTime() <= now.getTime()) {
    return { mayCancel: false, refusal: "start_passed" };
  }
  // The fee the screen states: the tier from this instant against the
  // member price (ADR-0006); a waived fee is not charged, so it states 0.
  return {
    feeOre: input.waived
      ? 0
      : cancellationFeeOre(
          memberPriceOre(input.roomPriceOre, input.discountPercent),
          hoursBetween(now, input.startAt)
        ),
    mayCancel: true,
  };
}
