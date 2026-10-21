// Who used the house in a month (DESIGN.md "Statistik" 4): the month's
// finished bookings per room and per company, under the monthly booking
// economy's rules (lib/domain/statistics.ts). A held meeting counts as a
// booking with its hours, a cancellation as a cancellation, and both add
// their basis unless marked not invoicable, so the rows add up to the
// month's stat cards. Occupancy (booket af åbningstiden) is a room's held hours against
// its opening hours in the month up to now.

import { invoiceBasisOre } from "./booking-invoicing";
import {
  openingHoursOn,
  type SpecialClosingDay,
  type WeeklyOpeningHour,
} from "./opening-hours";
import { monthOf, type StatisticsBooking } from "./statistics";
import { cphToUtc } from "./time";

export interface StatisticsRoom {
  isActive: boolean;
  name: string;
  roomId: string;
  specialDays: SpecialClosingDay[];
  weekly: WeeklyOpeningHour[];
}

interface Usage {
  basisOre: number;
  bookings: number;
  cancellations: number;
  minutes: number;
  name: string;
}

export interface RoomUsage extends Usage {
  openMinutes: number;
  roomId: string;
}

export interface CompanyUsage extends Usage {
  averageParticipants: number | null;
  companyId: string;
  membership: StatisticsBooking["membership"];
}

const MS_PER_MINUTE = 60_000;

const emptyUsage = (name: string): Usage => ({
  basisOre: 0,
  bookings: 0,
  cancellations: 0,
  minutes: 0,
  name,
});

function heldInMonth(
  bookings: readonly StatisticsBooking[],
  month: string,
  now: Date
): StatisticsBooking[] {
  return bookings.filter(
    (booking) =>
      monthOf(new Date(booking.startAt)) === month &&
      Date.parse(booking.endAt) < now.getTime()
  );
}

function addUsage(usage: Usage, booking: StatisticsBooking): void {
  usage.basisOre += invoiceBasisOre(booking);
  if (booking.status === "cancelled") {
    usage.cancellations += 1;
    return;
  }
  usage.bookings += 1;
  usage.minutes +=
    (Date.parse(booking.endAt) - Date.parse(booking.startAt)) / MS_PER_MINUTE;
}

// "2026-02" → "2026-02-01" … "2026-02-28".
function datesOf(month: string): string[] {
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Array.from(
    { length: days },
    (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`
  );
}

// A room's opening time in the month that has passed by now, in minutes:
// today counts up to now, later days not at all.
export function openMinutesInMonth(
  room: Pick<StatisticsRoom, "specialDays" | "weekly">,
  month: string,
  now: Date
): number {
  let total = 0;
  for (const date of datesOf(month)) {
    const hours = openingHoursOn(date, room.weekly, room.specialDays);
    if (hours) {
      const opens = cphToUtc(date, hours.opens).getTime();
      const closes = cphToUtc(date, hours.closes).getTime();
      total += Math.max(0, Math.min(closes, now.getTime()) - opens);
    }
  }
  return total / MS_PER_MINUTE;
}

// Held time as a share of open time, or null before the room has opened.
export function occupancy(minutes: number, openMinutes: number): number | null {
  return openMinutes === 0 ? null : minutes / openMinutes;
}

const byName = (a: Usage, b: Usage): number =>
  a.name.localeCompare(b.name, "da");

// Every active room, plus an inactive one that still had bookings in the
// month; the most booked hours first.
export function roomUsage(
  bookings: readonly StatisticsBooking[],
  rooms: readonly StatisticsRoom[],
  month: string,
  now: Date
): RoomUsage[] {
  const usage = new Map<string, Usage>();
  for (const booking of heldInMonth(bookings, month, now)) {
    const row = usage.get(booking.roomId) ?? emptyUsage("");
    addUsage(row, booking);
    usage.set(booking.roomId, row);
  }
  return rooms
    .filter((room) => room.isActive || usage.has(room.roomId))
    .map((room) => ({
      ...(usage.get(room.roomId) ?? emptyUsage("")),
      name: room.name,
      openMinutes: openMinutesInMonth(room, month, now),
      roomId: room.roomId,
    }))
    .sort((a, b) => b.minutes - a.minutes || byName(a, b));
}

// Every company with a held or cancelled booking in the month; the most
// bookings first. The guests average counts held meetings only — a
// cancellation never happened, so it brings no guests (#118).
export function companyUsage(
  bookings: readonly StatisticsBooking[],
  month: string,
  now: Date
): CompanyUsage[] {
  const usage = new Map<string, CompanyUsage>();
  const heldParticipants = new Map<string, number>();
  for (const booking of heldInMonth(bookings, month, now)) {
    const row = usage.get(booking.companyId) ?? {
      ...emptyUsage(booking.companyName),
      averageParticipants: null,
      companyId: booking.companyId,
      membership: booking.membership,
    };
    addUsage(row, booking);
    usage.set(booking.companyId, row);
    if (booking.status !== "cancelled") {
      heldParticipants.set(
        booking.companyId,
        (heldParticipants.get(booking.companyId) ?? 0) + booking.participants
      );
    }
  }
  return [...usage.values()]
    .map((row) => ({
      ...row,
      averageParticipants:
        row.bookings === 0
          ? null
          : (heldParticipants.get(row.companyId) ?? 0) / row.bookings,
    }))
    .sort(
      (a, b) => b.bookings - a.bookings || b.minutes - a.minutes || byName(a, b)
    );
}
