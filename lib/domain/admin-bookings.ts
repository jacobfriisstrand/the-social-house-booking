// The admin booking overview (#9, DESIGN.md "Bookinger (admin)"): every
// booking as a row and a calendar, the monthly invoice basis, and the
// invoicing statuses. The row's numbers are read from the price snapshot
// frozen at confirmation (ADR-0005); the room rent after discount applies
// the discount to room rental only (ADR-0007). A cancelled booking was
// never served: its row shows the payable cancellation fee alone
// (ADR-0006) as its whole basis, and its snapshot parts count nothing in
// the totals. House Events are not bookings and never enter the basis
// (CONTEXT.md "House Event"); they appear in the views as "Ikke
// fakturerbar". All amounts integer øre, excl. VAT (ADR-0019, ADR-0020).
import type {
  BookingInvoicingStatus,
  BookingOverviewStatus,
  ManualAmountEntry,
} from "./booking-overview";
import { payableCancellationFeeOre } from "./cancellation";
import { memberPriceOre } from "./pricing";

export type AdminMembership = "external" | "member";

/** One booking's row in the admin overview, from its frozen snapshot. */
export interface AdminBookingRow {
  addonTotalOre: number;
  bookingId: string;
  bookingNumber: string;
  bookingStatus: BookingOverviewStatus;
  cancellationFeeOre: number | null;
  cancellationFeeWaived: boolean;
  companyId: string;
  companyName: string;
  discountPercent: number;
  endAt: string;
  invoiceDate: string | null;
  invoiceNumber: string | null;
  invoicingStatus: BookingInvoicingStatus;
  // The manual amounts (ADR-0010) behind the sum, for the row's edit
  // sheet; the totals read the sum only.
  manualAmounts: ManualAmountEntry[];
  manualAmountsOre: number;
  membershipStatus: AdminMembership;
  roomId: string;
  roomName: string;
  roomPriceOre: number;
  startAt: string;
}

/** One House Event's row: blocks rooms, never part of the invoice basis. */
export interface AdminHouseEventRow {
  description: string | null;
  endAt: string;
  houseEventId: string;
  roomNames: string[];
  startAt: string;
  title: string | null;
}

export type AdminOverviewRow =
  | { kind: "booking"; row: AdminBookingRow }
  | { kind: "house_event"; row: AdminHouseEventRow };

/** What one booking contributes to its row and to the totals. */
export interface AdminRowParts {
  addOnsOre: number | null;
  // The whole invoicing basis the row stands for.
  basisOre: number;
  feeOre: number;
  manualAmountsOre: number | null;
  // The room rent after discount (ADR-0007) — null on a cancelled booking.
  memberPriceOre: number | null;
  // Booked minutes, buffer excluded (the end time is the end).
  minutes: number | null;
  roomPriceOre: number | null;
}

export function adminRowParts(row: AdminBookingRow): AdminRowParts {
  if (row.bookingStatus === "cancelled") {
    const feeOre = payableCancellationFeeOre(
      row.cancellationFeeOre,
      row.cancellationFeeWaived
    );
    return {
      addOnsOre: null,
      basisOre: feeOre ?? 0,
      feeOre: feeOre ?? 0,
      manualAmountsOre: null,
      memberPriceOre: null,
      minutes: null,
      roomPriceOre: null,
    };
  }
  const memberPrice = memberPriceOre(row.roomPriceOre, row.discountPercent);
  return {
    addOnsOre: row.addonTotalOre,
    basisOre: memberPrice + row.addonTotalOre + row.manualAmountsOre,
    feeOre: 0,
    manualAmountsOre: row.manualAmountsOre,
    memberPriceOre: memberPrice,
    minutes: Math.round(
      (new Date(row.endAt).getTime() - new Date(row.startAt).getTime()) / 60_000
    ),
    roomPriceOre: row.roomPriceOre,
  };
}

/** The column values the totals footer and the breakdowns sum. */
export interface AdminTotals {
  addOnsOre: number;
  basisOre: number;
  bookingCount: number;
  feeOre: number;
  manualAmountsOre: number;
  memberPriceOre: number;
  minutes: number;
  roomPriceOre: number;
}

const EMPTY_TOTALS: AdminTotals = {
  addOnsOre: 0,
  basisOre: 0,
  bookingCount: 0,
  feeOre: 0,
  manualAmountsOre: 0,
  memberPriceOre: 0,
  minutes: 0,
  roomPriceOre: 0,
};

function addRow(totals: AdminTotals, row: AdminBookingRow): AdminTotals {
  const parts = adminRowParts(row);
  return {
    addOnsOre: totals.addOnsOre + (parts.addOnsOre ?? 0),
    basisOre: totals.basisOre + parts.basisOre,
    bookingCount: totals.bookingCount + 1,
    feeOre: totals.feeOre + parts.feeOre,
    manualAmountsOre: totals.manualAmountsOre + (parts.manualAmountsOre ?? 0),
    memberPriceOre: totals.memberPriceOre + (parts.memberPriceOre ?? 0),
    minutes: totals.minutes + (parts.minutes ?? 0),
    roomPriceOre: totals.roomPriceOre + (parts.roomPriceOre ?? 0),
  };
}

/** The totals of the filtered set: every column sums down its rows. */
export function adminTotals(rows: readonly AdminOverviewRow[]): AdminTotals {
  return rows.reduce(
    (totals, entry) =>
      entry.kind === "booking" ? addRow(totals, entry.row) : totals,
    { ...EMPTY_TOTALS }
  );
}

/** One line of the per-company or per-room breakdown (#9). */
export interface AdminBreakdownEntry extends AdminTotals {
  key: string;
  label: string;
}

export function breakdownAdminRows(
  rows: readonly AdminOverviewRow[],
  by: "company" | "room"
): AdminBreakdownEntry[] {
  const groups = new Map<string, { label: string; totals: AdminTotals }>();
  for (const entry of rows) {
    if (entry.kind !== "booking") {
      continue;
    }
    const { row } = entry;
    const key = by === "company" ? row.companyId : row.roomId;
    const label = by === "company" ? row.companyName : row.roomName;
    const group = groups.get(key) ?? { label, totals: { ...EMPTY_TOTALS } };
    groups.set(key, { label, totals: addRow(group.totals, row) });
  }
  return [...groups.entries()]
    .map(([key, { label, totals }]) => ({ key, label, ...totals }))
    .sort((left, right) => left.label.localeCompare(right.label, "da"));
}

export type AdminSortKey =
  | "addOns"
  | "bookingNumber"
  | "company"
  | "date"
  | "discount"
  | "fee"
  | "hours"
  | "manualAmounts"
  | "memberPrice"
  | "room"
  | "roomPrice"
  | "status"
  | "total";

/** The text a company cell shows: the company's name, or none for a House
 * Event — the display name for the house itself lives in the copy. */
export function rowCompanyLabel(entry: AdminOverviewRow): string {
  return entry.kind === "booking" ? entry.row.companyName : "";
}

/** The text a room cell shows: the room, or every room an event blocks. */
export function rowRoomLabel(entry: AdminOverviewRow): string {
  return entry.kind === "booking"
    ? entry.row.roomName
    : entry.row.roomNames.join(", ");
}

const sortText: Record<
  "company" | "room" | "bookingNumber" | "status",
  (entry: AdminOverviewRow) => string
> = {
  bookingNumber: (entry) =>
    entry.kind === "booking" ? entry.row.bookingNumber : "",
  company: rowCompanyLabel,
  room: rowRoomLabel,
  status: (entry) =>
    entry.kind === "booking" ? entry.row.invoicingStatus : "not_invoicable",
};

const sortNumber: Partial<
  Record<AdminSortKey, (entry: AdminOverviewRow) => number | null>
> = {
  addOns: (entry) =>
    entry.kind === "booking" ? adminRowParts(entry.row).addOnsOre : null,
  discount: (entry) =>
    entry.kind === "booking" && entry.row.bookingStatus !== "cancelled"
      ? entry.row.discountPercent
      : null,
  fee: (entry) =>
    entry.kind === "booking" ? adminRowParts(entry.row).feeOre : null,
  hours: (entry) =>
    entry.kind === "booking" ? adminRowParts(entry.row).minutes : null,
  manualAmounts: (entry) =>
    entry.kind === "booking" ? adminRowParts(entry.row).manualAmountsOre : null,
  memberPrice: (entry) =>
    entry.kind === "booking" ? adminRowParts(entry.row).memberPriceOre : null,
  roomPrice: (entry) =>
    entry.kind === "booking" ? adminRowParts(entry.row).roomPriceOre : null,
  total: (entry) =>
    entry.kind === "booking" ? adminRowParts(entry.row).basisOre : null,
};

const startMs = (entry: AdminOverviewRow): number =>
  new Date(entry.row.startAt).getTime();

/** Nulls sort last in both directions, so "–" cells never jump around. */
function compareNullable(
  left: number | null,
  right: number | null,
  direction: 1 | -1
): number {
  if (left === null && right === null) {
    return 0;
  }
  if (left === null) {
    return 1;
  }
  if (right === null) {
    return -1;
  }
  return (left - right) * direction;
}

function compareText(left: string, right: string, direction: 1 | -1): number {
  return left.localeCompare(right, "da") * direction;
}

/** The list sorted by its columns, by date ascending by default (#9). */
export function sortAdminRows(
  rows: readonly AdminOverviewRow[],
  sort: AdminSortKey,
  direction: "asc" | "desc"
): AdminOverviewRow[] {
  const sign: 1 | -1 = direction === "asc" ? 1 : -1;
  const compare = (
    key: AdminSortKey,
    left: AdminOverviewRow,
    right: AdminOverviewRow
  ): number => {
    if (key === "date") {
      return (startMs(left) - startMs(right)) * sign;
    }
    const text = sortText[key as keyof typeof sortText];
    if (text) {
      return compareText(text(left), text(right), sign);
    }
    const number = sortNumber[key];
    if (number) {
      return compareNullable(number(left), number(right), sign);
    }
    return 0;
  };

  return rows.toSorted((left, right) => {
    const primary = compare(sort, left, right);
    // Ties read in start order, so equal keys never shuffle the list.
    return primary === 0 ? startMs(left) - startMs(right) : primary;
  });
}

/** Why the row's checkbox is off: it is already invoiced/not invoicable, or
 * the booking ends in the future. Null means it can be marked now. The
 * status guard runs first so the future branch only sees "not_invoiced". */
export function bookingNotInvoicableReason(
  row: Pick<AdminBookingRow, "endAt" | "invoicingStatus">,
  now: Date
): Exclude<BookingInvoicingStatus, "not_invoiced"> | "future" | null {
  if (row.invoicingStatus !== "not_invoiced") {
    return row.invoicingStatus;
  }
  return new Date(row.endAt).getTime() <= now.getTime() ? null : "future";
}

export const bookingIsInvoicable = (
  row: Pick<AdminBookingRow, "endAt" | "invoicingStatus">,
  now: Date
): boolean => bookingNotInvoicableReason(row, now) === null;
