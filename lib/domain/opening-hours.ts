// Opening-hours fit (Bilag 1 "Åbningstider og bookingperiode", #3/#4):
// every booking must fit within the room's opening hours. Hours are
// Copenhagen wall clock (ADR-0021); the booking's instants convert to
// Copenhagen local time before the comparison. Postgres stores the rows;
// this module computes the fit (#4 availability check).

import { cphWallClock } from "./time";

/** One weekly row per weekday. 0 = Monday … 6 = Sunday. */
export interface WeeklyOpeningHour {
  closes: string;
  dayOfWeek: number;
  isClosed: boolean;
  /** "HH:mm" — ignored when isClosed is true. */
  opens: string;
}

/** The seven weekday rows of one room. */
export type WeeklyOpeningHours = WeeklyOpeningHour[];

/** One per date; a closed day carries no times. The glossary's special
 * closing day (lukkedag). */
export interface SpecialClosingDay {
  closes: string | null;
  date: string; // "yyyy-mm-dd" in Europe/Copenhagen
  isClosed: boolean;
  opens: string | null;
}

const CPH_TIMEZONE = "Europe/Copenhagen";

// en-CA writes ISO-like yyyy-mm-dd, matching the Postgres `date` text form.
const cphDateFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: CPH_TIMEZONE,
  year: "numeric",
});

const cphWeekdayFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: CPH_TIMEZONE,
  weekday: "short",
});

// Day-of-week convention 0 = Monday … 6 = Sunday (room_opening_hours).
const weekdayNumbers: Record<string, number> = {
  Fri: 4,
  Mon: 0,
  Sat: 5,
  Sun: 6,
  Thu: 3,
  Tue: 1,
  Wed: 2,
};

// Copenhagen wall-clock date of an instant: "2026-09-14".
export function cphDate(instant: Date): string {
  return cphDateFormatter.format(instant);
}

export function dayOfWeek(instant: Date): number {
  return weekdayNumbers[cphWeekdayFormatter.format(instant)] ?? 0;
}

function minutes(value: string): number {
  const [hour, minute] = value.split(":");
  return Number(hour) * 60 + Number(minute);
}

// Wall clock exactly at midnight ("24:00" of the previous date). hour 24 is
// tolerated because some ICU builds render midnight as 24 under h24.
function isMidnight(instant: Date): boolean {
  const clock = cphWallClock(instant);
  return (clock.hour === 0 || clock.hour === 24) && clock.minute === 0;
}

// Every booking must fit within opening hours (Bilag 1): both endpoints on
// the same Copenhagen date and between that date's opens and closes. The
// end may equal the closes time — including a 24:00 close, whose end
// instant lands on the next date at exactly 00:00. A special closing day
// replaces the weekly row for its date; a missing weekly row means the room
// is closed that day.
export function bookingWithinOpeningHours(
  startAt: Date,
  endAt: Date,
  weekly: WeeklyOpeningHour[],
  specialDays: SpecialClosingDay[] = []
): boolean {
  const startDate = cphDate(startAt);
  const endDate = cphDate(endAt);
  const endsAtMidnight = endDate !== startDate && isMidnight(endAt);
  if (endDate !== startDate && !endsAtMidnight) {
    return false; // spans two Copenhagen dates — outside any day's hours
  }

  const specialDay = specialDays.find((day) => day.date === startDate);
  if (specialDay) {
    if (specialDay.isClosed || !specialDay.opens || !specialDay.closes) {
      return false;
    }
    return fitsWithin(
      startAt,
      endAt,
      minutes(specialDay.opens),
      minutes(specialDay.closes),
      endsAtMidnight
    );
  }

  const weeklyRow = weekly.find((h) => h.dayOfWeek === dayOfWeek(startAt));
  if (!weeklyRow || weeklyRow.isClosed) {
    return false;
  }
  return fitsWithin(
    startAt,
    endAt,
    minutes(weeklyRow.opens),
    minutes(weeklyRow.closes),
    endsAtMidnight
  );
}

function fitsWithin(
  startAt: Date,
  endAt: Date,
  opens: number,
  closes: number,
  endsAtMidnight: boolean
): boolean {
  const start = cphWallClock(startAt);
  const end = cphWallClock(endAt);
  const startMinutes = start.hour * 60 + start.minute;
  // Midnight of the next date counts as 24:00 (1440) of the start date.
  const endMinutes = endsAtMidnight ? 1440 : end.hour * 60 + end.minute;
  return startMinutes >= opens && endMinutes <= closes;
}
