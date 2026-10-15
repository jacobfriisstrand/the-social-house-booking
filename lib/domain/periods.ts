// Period windows for the admin booking overview (#9), on Copenhagen dates
// (ADR-0021). A period is a pair of inclusive "yyyy-mm-dd" dates; the
// instant window it covers runs from 00:00 on the first date to 00:00 the
// day after the last, so every booking that starts on a date in the period
// is inside it. Calendar math is whole-day UTC arithmetic — a date string
// is a calendar day, never an instant; instants come from cphToUtc.
import { addDays } from "@/lib/calendar-date";
import { cphToUtc } from "./time";

/** "2026-10" from "2026-10-02". */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** The month's first and last date, inclusive. */
export function monthWindow(month: string): {
  fromDate: string;
  toDate: string;
} {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!(year && monthNumber)) {
    throw new Error(`not a month: ${month}`);
  }
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const pad = (value: number): string => String(value).padStart(2, "0");
  return {
    fromDate: `${month}-01`,
    toDate: `${month}-${pad(lastDay)}`,
  };
}

/** The month moved by whole months: "2026-10" + 1 → "2026-11". */
export function moveMonth(month: string, months: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!(year && monthNumber)) {
    throw new Error(`not a month: ${month}`);
  }
  const moved = new Date(Date.UTC(year, monthNumber - 1 + months, 1));
  return `${moved.getUTCFullYear()}-${String(moved.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** 0 = Monday … 6 = Sunday (Danish weeks start on Monday). */
export function weekdayIndexMondayFirst(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  const utcDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (utcDay + 6) % 7;
}

/** The seven dates Monday–Sunday of the week that holds the date. */
export function weekDates(date: string): string[] {
  const monday = addDays(date, -weekdayIndexMondayFirst(date));
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

/**
 * The 42-date month grid (six weeks, Monday first) the month calendar
 * renders: the Monday on or before the 1st through six whole weeks.
 */
export function monthDates(month: string): string[] {
  const { fromDate } = monthWindow(month);
  const gridStart = addDays(fromDate, -weekdayIndexMondayFirst(fromDate));
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

/** The dates a calendar view shows: one, seven, or the month's 42. */
export type CalendarViewKind = "day" | "month" | "week";

export function calendarDates(
  kind: CalendarViewKind,
  focusDate: string
): string[] {
  if (kind === "day") {
    return [focusDate];
  }
  if (kind === "week") {
    return weekDates(focusDate);
  }
  return monthDates(monthOf(focusDate));
}

/** The inclusive date window a calendar view covers. */
export function calendarWindow(
  kind: CalendarViewKind,
  focusDate: string
): { fromDate: string; toDate: string } {
  const dates = calendarDates(kind, focusDate);
  // The dates are contiguous: the window is the first date plus the whole
  // span, whatever the view.
  return {
    fromDate: dates[0],
    toDate: addDays(dates[0], dates.length - 1),
  };
}

/**
 * The instant window a period covers for SQL: bookings that START on a date
 * in the period are inside it (booking_start_at >= start and < end).
 * DST-safe through cphToUtc: "00:00" on the day after the last date is the
 * first instant outside the period.
 */
export function periodUtcWindow(
  fromDate: string,
  toDate: string
): { endUtc: Date; startUtc: Date } {
  return {
    endUtc: cphToUtc(addDays(toDate, 1), "00:00"),
    startUtc: cphToUtc(fromDate, "00:00"),
  };
}

/** The focus date clamped into the period: outside it, the period's start. */
export function clampDate(
  date: string,
  fromDate: string,
  toDate: string
): string {
  if (date < fromDate) {
    return fromDate;
  }
  if (date > toDate) {
    return toDate;
  }
  return date;
}
