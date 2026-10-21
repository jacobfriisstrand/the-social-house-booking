// The admin booking overview (#9, DESIGN.md "Bookinger (admin)"): every
// booking as a row and a calendar, the monthly invoice basis, and the
// invoicing statuses. The row's numbers are read from the price snapshot
// frozen at confirmation (ADR-0005); the room rent after discount applies
// the discount to room rental only (ADR-0007). A cancelled booking was
// never served: its row shows the payable cancellation fee alone
// (ADR-0006) as its whole basis, and its snapshot parts count nothing in
// the totals. All amounts integer øre, excl. VAT (ADR-0019, ADR-0020).

import { invoiceBasisParts, invoiceBasisTotalOre } from "./booking-invoicing";
import type {
  BookingAddonOverview,
  BookingInvoicingStatus,
  BookingOverviewStatus,
  ManualAmountEntry,
} from "./booking-overview";
import { memberPriceOre } from "./pricing";

export type AdminMembership = "external" | "member";

/** The booking-state buckets the admin overview's filter selects: the
 * cancelled bookings, or a confirmed booking that has (not) finished. The
 * cut is the END instant — "afsluttede" means ended, so a booking that
 * started but runs tonight is still kommende. The member page's filter
 * cuts the same way. */
export type AdminBookingState = "cancelled" | "finished" | "upcoming";

/** One booking's row in the admin overview, from its frozen snapshot. */
export interface AdminBookingRow {
  addOns: BookingAddonOverview[];
  addonTotalOre: number;
  bookerEmail: string | null;
  bookerName: string | null;
  bookerPhone: string | null;
  bookingId: string;
  bookingNumber: string;
  bookingStatus: BookingOverviewStatus;
  cancellationFeeOre: number | null;
  cancellationFeeWaived: boolean;
  // The instant the cancellation flow froze (null on a live booking); the
  // detail sheet shows it on a cancelled row.
  cancelledAt: string | null;
  companyId: string;
  companyName: string;
  discountPercent: number;
  endAt: string;
  // The stored frozen total (#126): an admin's explicit price override
  // lives here, so every basis surface reads it instead of recomputing.
  expectedTotalOre: number;
  invoiceDate: string | null;
  invoiceNumber: string | null;
  invoicingStatus: BookingInvoicingStatus;
  // The manual amounts (ADR-0010) behind the sum, for the row's edit
  // sheet; the totals read the sum only.
  manualAmounts: ManualAmountEntry[];
  manualAmountsOre: number;
  membershipStatus: AdminMembership;
  // The meeting's participant count (the snapshot frozen at confirmation).
  participants: number;
  // The customer's note from the booking flow (#114); null when empty.
  practicalNotes: string | null;
  roomId: string;
  roomName: string;
  roomPriceOre: number;
  startAt: string;
}

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
  // The one invoicing-basis policy (lib/domain/booking-invoicing.ts): the
  // fee column on a cancelled row, the whole basis on every row.
  const basis = invoiceBasisParts({
    addonTotalOre: row.addonTotalOre,
    cancellationFeeOre: row.cancellationFeeOre,
    cancellationFeeWaived: row.cancellationFeeWaived,
    expectedTotalOre: row.expectedTotalOre,
    manualAmountsOre: row.manualAmountsOre,
    status: row.bookingStatus,
  });
  if (row.bookingStatus === "cancelled") {
    const feeOre = basis.cancellationFeesOre;
    return {
      addOnsOre: null,
      basisOre: feeOre,
      feeOre,
      manualAmountsOre: null,
      memberPriceOre: null,
      minutes: null,
      roomPriceOre: null,
    };
  }
  const memberPrice = memberPriceOre(row.roomPriceOre, row.discountPercent);
  return {
    addOnsOre: row.addonTotalOre,
    // #126: the invoicing basis reads the STORED total (the frozen
    // booking_expected_total_ore) — the policy's room rent is the remainder
    // of the expected total, so the parts add up to the stored total and an
    // admin's explicit price wins here, on the detail sheet and in the
    // exports alike.
    basisOre: invoiceBasisTotalOre(basis),
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

// An admin can cancel what a member can (#5): a confirmed booking whose
// start has not passed. The write re-checks it at the confirm moment.
export function canAdminCancel(row: AdminBookingRow, now: Date): boolean {
  return (
    row.bookingStatus === "confirmed" && Date.parse(row.startAt) > now.getTime()
  );
}

/** The totals of the filtered set: every column sums down its rows. */
export function adminTotals(rows: readonly AdminBookingRow[]): AdminTotals {
  return rows.reduce(addRow, { ...EMPTY_TOTALS });
}

/** One line of the per-company or per-room breakdown (#9). */
export interface AdminBreakdownEntry extends AdminTotals {
  key: string;
  label: string;
}

export function breakdownAdminRows(
  rows: readonly AdminBookingRow[],
  by: "company" | "room"
): AdminBreakdownEntry[] {
  const groups = new Map<string, { label: string; totals: AdminTotals }>();
  for (const row of rows) {
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
  | "participants"
  | "room"
  | "roomPrice"
  | "status"
  | "total";

const sortText: Record<
  "company" | "room" | "bookingNumber" | "status",
  (row: AdminBookingRow) => string
> = {
  bookingNumber: (row) => row.bookingNumber,
  company: (row) => row.companyName,
  room: (row) => row.roomName,
  status: (row) => row.invoicingStatus,
};

const sortNumber: Partial<
  Record<AdminSortKey, (row: AdminBookingRow) => number | null>
> = {
  addOns: (row) => adminRowParts(row).addOnsOre,
  discount: (row) =>
    row.bookingStatus === "cancelled" ? null : row.discountPercent,
  fee: (row) => adminRowParts(row).feeOre,
  hours: (row) => adminRowParts(row).minutes,
  manualAmounts: (row) => adminRowParts(row).manualAmountsOre,
  memberPrice: (row) => adminRowParts(row).memberPriceOre,
  participants: (row) => row.participants,
  roomPrice: (row) => adminRowParts(row).roomPriceOre,
  total: (row) => adminRowParts(row).basisOre,
};

const startMs = (row: AdminBookingRow): number =>
  new Date(row.startAt).getTime();

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
  rows: readonly AdminBookingRow[],
  sort: AdminSortKey,
  direction: "asc" | "desc"
): AdminBookingRow[] {
  const sign: 1 | -1 = direction === "asc" ? 1 : -1;
  const compare = (
    key: AdminSortKey,
    left: AdminBookingRow,
    right: AdminBookingRow
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

/** Which invoicing actions a set of bookings allows (#9): marking invoiced
 * needs every booking ended and still open for an invoice (not invoiced or
 * not invoicable); un-invoicing needs every booking invoiced or not
 * invoicable; refusing accepts anything not already refused — a future
 * booking included. Empty allows nothing. */
export interface InvoicingActionAllowance {
  canInvoice: boolean;
  canNotInvoicable: boolean;
  canNotInvoiced: boolean;
}

export function invoicingActionAllowance(
  rows: readonly Pick<AdminBookingRow, "endAt" | "invoicingStatus">[],
  now: Date
): InvoicingActionAllowance {
  if (rows.length === 0) {
    return {
      canInvoice: false,
      canNotInvoicable: false,
      canNotInvoiced: false,
    };
  }
  const ended = (row: Pick<AdminBookingRow, "endAt">): boolean =>
    new Date(row.endAt).getTime() <= now.getTime();
  return {
    canInvoice: rows.every(
      (row) =>
        ended(row) &&
        (row.invoicingStatus === "not_invoiced" ||
          row.invoicingStatus === "not_invoicable")
    ),
    canNotInvoicable: rows.some(
      (row) => row.invoicingStatus !== "not_invoicable"
    ),
    canNotInvoiced: rows.every(
      (row) =>
        row.invoicingStatus === "invoiced" ||
        row.invoicingStatus === "not_invoicable"
    ),
  };
}

/** The invoice-ready end cut (#143), stated once: a booking is
 * invoice-ready only when its meeting end lies strictly before now — the
 * same strict less-than the worklist SQL chains (booking_end_at.lt in
 * listAdminBookings, countOutstandingInvoices), so the cash-flow total
 * and the worklist badge cannot disagree for a booking that ends exactly
 * now. The invoicing actions keep their own inclusive ended rule
 * (invoicingActionAllowance): do not swap the two. */
export function isInvoiceReadyEnd(
  endAt: AdminBookingRow["endAt"],
  now: Date
): boolean {
  return new Date(endAt).getTime() < now.getTime();
}

/** One row's invoice-ready amount (#120, #121): what the booking can
 * still be invoiced for, zero unless its meeting end lies strictly
 * before now (isInvoiceReadyEnd) and it still waits for an invoice — the
 * worklist's set (outstandingInvoicesFilter, countOutstandingInvoices).
 * The amount is the row's whole basis
 * (adminRowParts): the frozen expected total plus manual amounts on
 * a confirmed booking, the payable cancellation fee alone on a cancelled
 * one (ADR-0006). An invoiced or refused row counts nothing — invoiced
 * bookings must not be re-summed as open (the manual-amounts guard,
 * migration 20261002073814) — and so does one whose end is not strictly
 * before now (isInvoiceReadyEnd). The amount is the row's whole basis
 * (adminRowParts) — the invoicing-basis policy
 * (lib/domain/booking-invoicing.ts); expected total and parts agree by
 * construction (lib/domain/snapshot.ts). */
export function invoiceReadyOre(row: AdminBookingRow, now: Date): number {
  if (row.invoicingStatus !== "not_invoiced") {
    return 0;
  }
  if (!isInvoiceReadyEnd(row.endAt, now)) {
    return 0;
  }
  return adminRowParts(row).basisOre;
}

/** The invoice-ready amount of a set: the table header's total over the
 * filtered rows, or over the ticked rows alone (#121). */
export function invoiceReadyTotalOre(
  rows: readonly AdminBookingRow[],
  now: Date
): number {
  return rows.reduce((sum, row) => sum + invoiceReadyOre(row, now), 0);
}

/** One company's line of the cash flow (#120): its invoice-ready bookings
 * and what they sum to. */
export interface CompanyCashFlow {
  bookingCount: number;
  companyId: string;
  companyName: string;
  totalOre: number;
}

/** The cash flow per company for the filtered set's invoice-ready
 * bookings (#120): the biggest amount first, ties by company name.
 * A company with nothing invoice-ready — a cancelled booking without
 * a fee counts zero — has no line. */
export function companyCashFlow(
  rows: readonly AdminBookingRow[],
  now: Date
): CompanyCashFlow[] {
  const groups = new Map<string, CompanyCashFlow>();
  for (const row of rows) {
    const amountOre = invoiceReadyOre(row, now);
    if (amountOre === 0) {
      continue;
    }
    const group = groups.get(row.companyId) ?? {
      bookingCount: 0,
      companyId: row.companyId,
      companyName: row.companyName,
      totalOre: 0,
    };
    group.bookingCount += 1;
    group.totalOre += amountOre;
    groups.set(row.companyId, group);
  }
  return [...groups.values()].sort(
    (left, right) =>
      right.totalOre - left.totalOre ||
      left.companyName.localeCompare(right.companyName, "da")
  );
}

/** The ids a shift-click adds to the selection: the rows from the last
 * clicked row (the anchor) to the clicked one, in the order the page
 * renders them — 1 through 5 for a shift from the first to the fifth.
 * Null when the anchor is missing or not on this page: the click reads as
 * a plain toggle. */
export function shiftRangeIds(
  visibleIds: readonly string[],
  anchorId: string | null,
  clickedId: string
): string[] | null {
  if (anchorId === null || anchorId === clickedId) {
    return null;
  }
  const from = visibleIds.indexOf(anchorId);
  const to = visibleIds.indexOf(clickedId);
  if (from === -1 || to === -1) {
    return null;
  }
  return visibleIds.slice(Math.min(from, to), Math.max(from, to) + 1);
}
