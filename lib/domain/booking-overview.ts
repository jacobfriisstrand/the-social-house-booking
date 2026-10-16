import {
  type SortDirection,
  type SortValue,
  sortByColumn,
} from "@/lib/table-sort";
import { periodUtcWindow } from "./periods";
import type { PriceOverviewModel } from "./price-overview";

export type BookingOverviewStatus =
  | "cancelled"
  | "confirmed"
  | "expired"
  | "pending_verification";

export type BookingInvoicingStatus =
  | "invoiced"
  | "not_invoiced"
  | "not_invoicable";

export interface BookingOverviewEntry {
  bookingHoldExpiresAt: string | null;
  bookingId: string;
  bookingStartAt: string;
  bookingStatus: BookingOverviewStatus;
  endAt: string;
  invoicingStatus: BookingInvoicingStatus;
  roomId: string;
}

export interface BookingAddonOverview {
  addonId: string;
  // The catalogue description, when the read carries it — the price
  // overview's info hover shows it; the email surfaces don't and omit it.
  description?: string | null;
  name: string | null;
  quantity: number;
  totalOre: number;
}

// One manual amount (ADR-0010): an extra charge admin added after the
// meeting, with its note and its audit (who/when). `who` is the admin's
// display name, or null when the admin row is gone — only the admin
// worklist shows it; the member's price rows carry just the amount and
// the note.
export interface ManualAmountEntry {
  amountOre: number;
  createdAt: string;
  createdByName: string | null;
  manualAmountId: string;
  note: string;
}

export interface BookingOverviewRow extends BookingOverviewEntry {
  addOns: BookingAddonOverview[];
  bookerName: string;
  bookingNumber: string;
  cancellationFeeOre: number | null;
  // The instant the cancellation flow froze (null on a live booking); the
  // detail sheet shows it on a cancelled row.
  cancelledAt: string | null;
  // The fee as it stands at load, for the cancel flow (#5): set only for a
  // confirmed booking whose start has not passed. The confirm recomputes
  // the fee server-side at the exact moment; this is the number the
  // destructive confirm states.
  liveCancellationFeeOre: number | null;
  price: PriceOverviewModel;
  roomName: string;
}

// The add-ons total for one row's tilkøb cell: the whole point of the
// column (DESIGN.md "Bookinger (member)") — one value per cell, the sum,
// not each add-on as its own row. Amounts integer øre, excl. VAT
// (ADR-0019, ADR-0020).
export function addOnsTotalOre(
  addOns: readonly BookingAddonOverview[]
): number {
  return addOns.reduce((total, addOn) => total + addOn.totalOre, 0);
}

/** The booking-state buckets both Bookinger pages filter on (#9): the
 * cancelled bookings, or a booking that has (not) finished. The cut is the
 * END instant — "afsluttede" means ended, so a meeting that started but
 * runs tonight is still kommende. The admin overview's AdminBookingState
 * is the same three buckets. */
export type BookingStateBucket = "cancelled" | "finished" | "upcoming";

// An expired hold never became a booking, and a pending verification
// stops being one when its hold runs out: the overview lists neither.
function isListed(booking: BookingOverviewEntry, nowMs: number): boolean {
  if (booking.bookingStatus === "expired") {
    return false;
  }
  return !(
    booking.bookingStatus === "pending_verification" &&
    booking.bookingHoldExpiresAt !== null &&
    Date.parse(booking.bookingHoldExpiresAt) <= nowMs
  );
}

/** The bucket a listed booking falls in; null for one the overview never
 * lists. A standing hold is kommende like a confirmed booking ahead. */
export function bookingStateBucket(
  booking: BookingOverviewEntry,
  now: Date
): BookingStateBucket | null {
  const nowMs = now.getTime();
  if (!isListed(booking, nowMs)) {
    return null;
  }
  if (booking.bookingStatus === "cancelled") {
    return "cancelled";
  }
  return Date.parse(booking.endAt) >= nowMs ? "upcoming" : "finished";
}

/** The member overview's filter row (DESIGN.md "Bookinger (member)"): the
 * admin overview's room, invoicing-status, booking-state and date-range
 * filters. An empty selection is no filter; the range is Copenhagen dates
 * (ADR-0021). */
export interface BookingOverviewFilter {
  bookingStates: readonly BookingStateBucket[];
  invoicingStatuses: readonly BookingInvoicingStatus[];
  periodFrom?: string;
  periodTo?: string;
  roomIds: readonly string[];
}

const selects = <T>(selected: readonly T[], value: T): boolean =>
  selected.length === 0 || selected.includes(value);

function startsWithin(
  booking: BookingOverviewEntry,
  range: { endUtc: Date; startUtc: Date } | null
): boolean {
  if (range === null) {
    return true;
  }
  const start = Date.parse(booking.bookingStartAt);
  return start >= range.startUtc.getTime() && start < range.endUtc.getTime();
}

/** The listed bookings the filter row keeps: in a ticked bucket, invoicing
 * status and room, starting within the date range — the admin list's rules, in memory, as a
 * company's own bookings are few. */
export function filterBookingOverview<T extends BookingOverviewEntry>(
  bookings: readonly T[],
  filter: BookingOverviewFilter,
  now: Date
): T[] {
  const range =
    filter.periodFrom && filter.periodTo
      ? periodUtcWindow(filter.periodFrom, filter.periodTo)
      : null;
  return bookings.filter((booking) => {
    const bucket = bookingStateBucket(booking, now);
    return (
      bucket !== null &&
      selects(filter.bookingStates, bucket) &&
      selects(filter.invoicingStatuses, booking.invoicingStatus) &&
      selects(filter.roomIds, booking.roomId) &&
      startsWithin(booking, range)
    );
  });
}

/** The member table's sortable columns, one per column (#9's sorting). */
export type BookingOverviewSortKey =
  | "addOns"
  | "booker"
  | "bookingNumber"
  | "date"
  | "discount"
  | "fee"
  | "price"
  | "room"
  | "status";

const startMs = (row: BookingOverviewRow): number =>
  Date.parse(row.bookingStartAt);

// Each column sorts by the value its cell shows; a cell showing "-",
// "Ingen" or "Ingen tilkøb" is null and sorts last.
const overviewSortValue: Record<
  BookingOverviewSortKey,
  (row: BookingOverviewRow) => SortValue
> = {
  addOns: (row) =>
    row.addOns.length === 0 ? null : addOnsTotalOre(row.addOns),
  booker: (row) => row.bookerName,
  bookingNumber: (row) => row.bookingNumber,
  date: startMs,
  discount: (row) => (row.price.showSavings ? row.price.discountPercent : null),
  fee: (row) => row.cancellationFeeOre,
  price: (row) => row.price.totalOre,
  room: (row) => row.roomName,
  status: (row) => row.bookingStatus,
};

/** The member list sorted by a column, by date ascending by default. */
export function sortBookingOverview(
  rows: readonly BookingOverviewRow[],
  sort: BookingOverviewSortKey,
  direction: SortDirection
): BookingOverviewRow[] {
  return sortByColumn(rows, overviewSortValue[sort], direction, startMs);
}
