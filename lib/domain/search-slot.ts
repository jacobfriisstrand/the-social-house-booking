// Where the "Book lokale" search starts (DESIGN.md "Book lokale"): the next
// whole or half hour still ahead today, for one hour. When that hour no
// longer fits the day grid, tomorrow from the grid's start. A start at or
// before now is in the past (bookingWindowOutcome's in_past).
import { GRID_END_MINUTES, GRID_START_MINUTES } from "./availability";
import { SLOT_MINUTES } from "./booking-window";
import { cphDate } from "./opening-hours";
import { cphToUtc, cphWallClock } from "./time";

export interface SearchSlot {
  date: string;
  from: string;
  to: string;
}

const DEFAULT_LENGTH_MINUTES = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

const clock = (minutes: number): string =>
  [Math.floor(minutes / MINUTES_PER_HOUR), minutes % MINUTES_PER_HOUR]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");

const slotFrom = (date: string, start: number): SearchSlot => ({
  date,
  from: clock(start),
  to: clock(start + DEFAULT_LENGTH_MINUTES),
});

// "2026-10-31" → "2026-11-01", in calendar terms.
function nextDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1))
    .toISOString()
    .slice(0, 10);
}

// The first whole or half hour after now, in Copenhagen minutes.
function nextSlotMinutes(now: Date): number {
  const { hour, minute } = cphWallClock(now);
  // Some engines print midnight as "24"; the modulo keeps it at 0.
  const minutes = (hour % HOURS_PER_DAY) * MINUTES_PER_HOUR + minute;
  return (Math.floor(minutes / SLOT_MINUTES) + 1) * SLOT_MINUTES;
}

// The search on a chosen date: today from the next slot still ahead, a
// later day from the grid's start. A day whose hour no longer fits keeps
// the grid's start, which is then in the past.
export function searchSlotOn(date: string, now: Date): SearchSlot {
  const start =
    date === cphDate(now)
      ? Math.max(nextSlotMinutes(now), GRID_START_MINUTES)
      : GRID_START_MINUTES;
  const fits = start + DEFAULT_LENGTH_MINUTES <= GRID_END_MINUTES;
  return slotFrom(date, fits ? start : GRID_START_MINUTES);
}

// Where the dialog opens: today, or tomorrow once today's hour has passed.
export function defaultSearchSlot(now: Date): SearchSlot {
  const today = searchSlotOn(cphDate(now), now);
  return startsInPast(today.date, today.from, now)
    ? searchSlotOn(nextDate(today.date), now)
    : today;
}

export function startsInPast(date: string, from: string, now: Date): boolean {
  return cphToUtc(date, from) <= now;
}
