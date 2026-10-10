// The monthly booking economy (ADR-0014, #10, DESIGN.md "Statistik"):
// one month's totals across every company, the month before for
// comparison, and the selected year month by month. A booking belongs to
// the month its meeting starts in, in Copenhagen (ADR-0021). Only
// finished bookings count — the end time has passed, the same line the
// invoicing worklist draws (lib/bookings/filters.ts); the rest of the
// month is "expected" and never enters the invoicing basis. A booking
// marked not invoicable stays in the booking counts and out of every
// amount. Amounts integer øre, excl. VAT (ADR-0019, ADR-0020).

import type { BookingInvoicingStatus } from "./booking-overview";
import { payableCancellationFeeOre } from "./cancellation";
import { cphDate } from "./opening-hours";
import { cphToUtc } from "./time";

export interface StatisticsBooking {
  addonTotalOre: number;
  cancellationFeeOre: number | null;
  cancellationFeeWaived: boolean;
  endAt: string;
  expectedTotalOre: number;
  invoicingStatus: BookingInvoicingStatus;
  manualAmountsOre: number;
  membership: "external" | "member";
  startAt: string;
  status: "cancelled" | "confirmed";
}

// The four parts of the invoicing basis; they always add up to it.
interface BasisParts {
  addonsOre: number;
  cancellationFeesOre: number;
  manualAmountsOre: number;
  roomRentOre: number;
}

export interface MonthStatistics extends BasisParts {
  basisOre: number;
  bookings: number;
  cancellations: number;
  expectedBookings: number;
  expectedOre: number;
  externalBasisOre: number;
  memberBasisOre: number;
  roomMinutes: number;
}

export interface YearPoint {
  basisOre: number | null;
  bookings: number | null;
  cancellations: number | null;
  month: string;
}

export interface StatisticsOverview {
  current: MonthStatistics;
  previous: MonthStatistics;
  // January to December of the selected month's year; months after the
  // current one have no data yet and read as null.
  year: YearPoint[];
}

const MS_PER_MINUTE = 60_000;
const MONTHS_PER_YEAR = 12;

const emptyMonth = (): MonthStatistics => ({
  addonsOre: 0,
  basisOre: 0,
  bookings: 0,
  cancellationFeesOre: 0,
  cancellations: 0,
  expectedBookings: 0,
  expectedOre: 0,
  externalBasisOre: 0,
  manualAmountsOre: 0,
  memberBasisOre: 0,
  roomMinutes: 0,
  roomRentOre: 0,
});

// "2026-09": the Copenhagen calendar month of an instant.
export function monthOf(instant: Date): string {
  return cphDate(instant).slice(0, 7);
}

// "2026-01" moved by whole months: -1 gives "2025-12".
export function shiftMonth(month: string, by: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const index = year * MONTHS_PER_YEAR + monthNumber - 1 + by;
  const shiftedYear = Math.floor(index / MONTHS_PER_YEAR);
  const shiftedMonth = (index % MONTHS_PER_YEAR) + 1;
  return `${shiftedYear}-${String(shiftedMonth).padStart(2, "0")}`;
}

// The bookings the overview needs: the selected month's whole year plus
// the December before it, which January compares against. Start instants
// in [from, to).
export function statisticsWindow(month: string): { from: Date; to: Date } {
  const year = Number(month.slice(0, 4));
  return {
    from: cphToUtc(`${year - 1}-12-01`, "00:00"),
    to: cphToUtc(`${year + 1}-01-01`, "00:00"),
  };
}

// The change from last month as a fraction (0.1 is +10 %), or null when
// last month had nothing to compare against.
export function percentChange(
  current: number,
  previous: number
): number | null {
  if (previous === 0) {
    return null;
  }
  return (current - previous) / previous;
}

// What one booking adds to the invoicing basis, part by part: a held
// meeting its frozen room rent after discount (ADR-0005), add-ons and
// manual amounts (#16); a cancellation only its payable fee (ADR-0006).
// The sum equals the worklist's outstandingInvoiceBasisOre.
function basisParts(booking: StatisticsBooking): BasisParts {
  if (booking.status === "cancelled") {
    return {
      addonsOre: 0,
      cancellationFeesOre:
        payableCancellationFeeOre(
          booking.cancellationFeeOre,
          booking.cancellationFeeWaived
        ) ?? 0,
      manualAmountsOre: 0,
      roomRentOre: 0,
    };
  }
  return {
    addonsOre: booking.addonTotalOre,
    cancellationFeesOre: 0,
    manualAmountsOre: booking.manualAmountsOre,
    roomRentOre: booking.expectedTotalOre - booking.addonTotalOre,
  };
}

const partsTotal = (parts: BasisParts): number =>
  parts.roomRentOre +
  parts.addonsOre +
  parts.cancellationFeesOre +
  parts.manualAmountsOre;

function addAmounts(
  stats: MonthStatistics,
  booking: StatisticsBooking,
  parts: BasisParts
): void {
  const total = partsTotal(parts);
  stats.roomRentOre += parts.roomRentOre;
  stats.addonsOre += parts.addonsOre;
  stats.cancellationFeesOre += parts.cancellationFeesOre;
  stats.manualAmountsOre += parts.manualAmountsOre;
  stats.basisOre += total;
  if (booking.membership === "member") {
    stats.memberBasisOre += total;
  } else {
    stats.externalBasisOre += total;
  }
}

function addCounts(stats: MonthStatistics, booking: StatisticsBooking): void {
  if (booking.status === "cancelled") {
    stats.cancellations += 1;
    return;
  }
  stats.bookings += 1;
  stats.roomMinutes +=
    (Date.parse(booking.endAt) - Date.parse(booking.startAt)) / MS_PER_MINUTE;
}

// A meeting not yet over is expected value: a confirmed booking with its
// whole basis, a cancellation with its payable fee.
function addExpected(stats: MonthStatistics, booking: StatisticsBooking): void {
  stats.expectedOre += partsTotal(basisParts(booking));
  if (booking.status === "confirmed") {
    stats.expectedBookings += 1;
  }
}

function tally(
  stats: MonthStatistics,
  booking: StatisticsBooking,
  now: Date
): void {
  if (Date.parse(booking.endAt) >= now.getTime()) {
    addExpected(stats, booking);
    return;
  }
  addCounts(stats, booking);
  if (booking.invoicingStatus !== "not_invoicable") {
    addAmounts(stats, booking, basisParts(booking));
  }
}

function statisticsByMonth(
  bookings: readonly StatisticsBooking[],
  now: Date
): Map<string, MonthStatistics> {
  const months = new Map<string, MonthStatistics>();
  for (const booking of bookings) {
    const month = monthOf(new Date(booking.startAt));
    const stats = months.get(month) ?? emptyMonth();
    tally(stats, booking, now);
    months.set(month, stats);
  }
  return months;
}

function yearPoint(
  month: string,
  stats: MonthStatistics | undefined,
  hasData: boolean
): YearPoint {
  if (!hasData) {
    return { basisOre: null, bookings: null, cancellations: null, month };
  }
  const { basisOre, bookings, cancellations } = stats ?? emptyMonth();
  return { basisOre, bookings, cancellations, month };
}

export function statisticsOverview(
  bookings: readonly StatisticsBooking[],
  month: string,
  now: Date
): StatisticsOverview {
  const months = statisticsByMonth(bookings, now);
  const currentMonth = monthOf(now);
  const january = `${month.slice(0, 4)}-01`;
  const year = Array.from({ length: MONTHS_PER_YEAR }, (_, index) => {
    const key = shiftMonth(january, index);
    return yearPoint(key, months.get(key), key <= currentMonth);
  });

  return {
    current: months.get(month) ?? emptyMonth(),
    previous: months.get(shiftMonth(month, -1)) ?? emptyMonth(),
    year,
  };
}
