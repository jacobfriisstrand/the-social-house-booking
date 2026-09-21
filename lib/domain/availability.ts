// Availability (#4): computed, never stored, from live bookings and House
// Events plus the 30-minute buffer (ADR-0002) and the room's opening hours.
// Postgres enforces the same no-overlap rule on write; this module lets the
// dialog and the search show only what the database would accept.

import { SLOT_MINUTES } from "./booking-window";
import { bufferEndAt } from "./buffer";
import {
  bookingWithinOpeningHours,
  type SpecialClosingDay,
  type WeeklyOpeningHour,
} from "./opening-hours";
import { cphToUtc, timeOptions } from "./time";

const MS_PER_MINUTE = 60_000;
const SLOT_MS = SLOT_MINUTES * MS_PER_MINUTE;

// The day grid and the start-time list run 09:00 to 22:00 (DESIGN.md).
export const GRID_START_MINUTES = 9 * 60;
export const GRID_END_MINUTES = 22 * 60;

/** A booking's or House Event's own period; the buffer is applied here. */
export interface Period {
  endAt: Date;
  startAt: Date;
}

interface OpeningContext {
  blocked: Period[];
  specialDays: SpecialClosingDay[];
  weekly: WeeklyOpeningHour[];
}

// Same rule as the bookings_no_overlap constraint: the half-open ranges
// [start, end + buffer) must be disjoint.
export function periodsCollide(a: Period, b: Period): boolean {
  return a.startAt < bufferEndAt(b.endAt) && b.startAt < bufferEndAt(a.endAt);
}

export function periodIsFree(
  startAt: Date,
  endAt: Date,
  blocked: Period[]
): boolean {
  const period = { endAt, startAt };
  return !blocked.some((other) => periodsCollide(period, other));
}

// Free, and the booking plus its buffer fits the opening hours (issue #4:
// the whole [start, end + 30 min] lies within the room's hours).
export function periodIsBookable({
  blocked,
  endAt,
  specialDays,
  startAt,
  weekly,
}: OpeningContext & Period): boolean {
  return (
    bookingWithinOpeningHours(
      startAt,
      bufferEndAt(endAt),
      weekly,
      specialDays
    ) && periodIsFree(startAt, endAt, blocked)
  );
}

export type StartSlotStatus = "available" | "blocked" | "closed" | "past";

export interface StartSlot {
  label: string;
  startAt: Date;
  status: StartSlotStatus;
}

function slotStatus(
  startAt: Date,
  now: Date,
  context: OpeningContext
): StartSlotStatus {
  const endAt = new Date(startAt.getTime() + SLOT_MS);
  if (startAt <= now) {
    return "past";
  }
  if (
    !bookingWithinOpeningHours(
      startAt,
      bufferEndAt(endAt),
      context.weekly,
      context.specialDays
    )
  ) {
    return "closed";
  }
  return periodIsFree(startAt, endAt, context.blocked)
    ? "available"
    : "blocked";
}

// One row per 30-minute slot of the Copenhagen date: available for at least
// the minimum booking, or why not.
export function startSlots({
  date,
  now,
  ...context
}: OpeningContext & { date: string; now: Date }): StartSlot[] {
  return timeOptions(
    SLOT_MINUTES,
    GRID_START_MINUTES,
    GRID_END_MINUTES - SLOT_MINUTES
  ).map((label) => {
    const startAt = cphToUtc(date, label);
    return { label, startAt, status: slotStatus(startAt, now, context) };
  });
}

// End times for a chosen start: consecutive 30-minute steps while the
// booking stays bookable. Stops at the first step that does not fit, so
// the list never skips over a block.
export function endOptions({
  startAt,
  ...context
}: OpeningContext & { startAt: Date }): Date[] {
  const ends: Date[] = [];
  let endAt = new Date(startAt.getTime() + SLOT_MS);
  while (periodIsBookable({ ...context, endAt, startAt })) {
    ends.push(endAt);
    endAt = new Date(endAt.getTime() + SLOT_MS);
  }
  return ends;
}
