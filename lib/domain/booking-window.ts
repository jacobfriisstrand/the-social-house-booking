// Booking window (Bilag 1 "Åbningstider og bookingperiode", #4): 30-minute
// intervals, at least 30 minutes, same day if the start is still ahead, at
// most 12 months ahead. Opening hours and collisions are availability.ts.
import { addMonths } from "./time";

export const SLOT_MINUTES = 30;
export const MIN_BOOKING_MINUTES = 30;
export const BOOKING_HORIZON_MONTHS = 12;

const MS_PER_MINUTE = 60_000;
const SLOT_MS = SLOT_MINUTES * MS_PER_MINUTE;

export type BookingWindowOutcome =
  | { kind: "ok" }
  | { kind: "off_grid" }
  | { kind: "too_short" }
  | { kind: "in_past" }
  | { kind: "beyond_horizon" };

// Copenhagen is a whole number of hours from UTC, so the 30-minute grid is
// the same in both.
export function isOnSlotGrid(instant: Date): boolean {
  return instant.getTime() % SLOT_MS === 0;
}

export function bookingHorizonEnd(now: Date): Date {
  return addMonths(now, BOOKING_HORIZON_MONTHS);
}

export function bookingWindowOutcome({
  endAt,
  now,
  startAt,
}: {
  endAt: Date;
  now: Date;
  startAt: Date;
}): BookingWindowOutcome {
  if (!(isOnSlotGrid(startAt) && isOnSlotGrid(endAt))) {
    return { kind: "off_grid" };
  }
  if (
    endAt.getTime() - startAt.getTime() <
    MIN_BOOKING_MINUTES * MS_PER_MINUTE
  ) {
    return { kind: "too_short" };
  }
  if (startAt <= now) {
    return { kind: "in_past" };
  }
  if (endAt > bookingHorizonEnd(now)) {
    return { kind: "beyond_horizon" };
  }
  return { kind: "ok" };
}
