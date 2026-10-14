// The admin booking overview's URL state (#9): every filter, the view, and
// the list's sort travel in the search params so the two views share one
// state and a view switch keeps the filters. Parsing is pure and today is
// injected, so the defaults are testable. The room, invoicing-status,
// booking-state, date-range and sort params are the member overview's too
// (lib/bookings/view-params.ts); the rest are admin tools.

import type {
  AdminBookingState,
  AdminMembership,
  AdminSortKey,
} from "@/lib/domain/admin-bookings";
import type { BookingInvoicingStatus } from "@/lib/domain/booking-overview";
import {
  clampDate,
  monthOf,
  monthWindow,
  moveMonth,
} from "@/lib/domain/periods";
import type { SortDirection } from "@/lib/table-sort";
import {
  appendValues,
  first,
  isoDate,
  knownValues,
  multi,
  parseListFilters,
  parseSort,
  type SearchParams,
  setPeriodRange,
  setSort,
} from "./view-params";

export type AdminViewKind = "list" | "month";

export type InvoicingStatusParam = BookingInvoicingStatus;

export type MembershipParam = AdminMembership;

export type BookingStateParam = AdminBookingState;

export type AdminSortDir = SortDirection;

export interface AdminViewParams {
  bookingStates: BookingStateParam[];
  companyIds: string[];
  focusDate: string;
  fromDate: string;
  invoicingStatuses: InvoicingStatusParam[];
  memberships: MembershipParam[];
  // The filter row's date range, absent when no range is picked — the
  // bookings' start dates the row set narrows to.
  periodFrom?: string;
  periodTo?: string;
  roomIds: string[];
  sort: AdminSortKey;
  sortDir: AdminSortDir;
  toDate: string;
  view: AdminViewKind;
  // The sidebar badge's worklist (?worklist=1): presence-only, the value
  // is not read. A list tool — the calendar applies nothing.
  worklist: boolean;
}

const MONTH = /^\d{4}-\d{2}$/;

export const ADMIN_VIEWS: AdminViewKind[] = ["list", "month"];

export const ADMIN_SORT_KEYS: AdminSortKey[] = [
  "addOns",
  "bookingNumber",
  "company",
  "date",
  "discount",
  "fee",
  "hours",
  "manualAmounts",
  "memberPrice",
  "room",
  "roomPrice",
  "status",
  "total",
];

const MEMBERSHIPS: readonly MembershipParam[] = ["member", "external"];

// A month param selects that month's window; a bad value falls back to
// today's month.
const monthParam = (
  value: string | string[] | undefined
): { fromDate: string; toDate: string } | undefined => {
  const raw = first(value);
  return raw && MONTH.test(raw) ? monthWindow(raw) : undefined;
};

export function parseAdminViewParams(
  searchParams: SearchParams,
  today: string
): AdminViewParams {
  const month = monthParam(searchParams.month) ?? monthWindow(monthOf(today));

  let fromDate = isoDate(searchParams.from) ?? month.fromDate;
  let toDate = isoDate(searchParams.to) ?? month.toDate;
  // A reversed period would match nothing forever; the dates swap so a
  // fat-fingered "Fra/Til" still shows the bookings between them.
  if (fromDate > toDate) {
    [fromDate, toDate] = [toDate, fromDate];
  }

  const viewParam = first(searchParams.view);
  const view: AdminViewKind = ADMIN_VIEWS.includes(viewParam as AdminViewKind)
    ? (viewParam as AdminViewKind)
    : "list";

  // The calendar's focus sits in the period, so a month picked for the
  // list opens the calendar in that month.
  const focusDate = clampDate(
    isoDate(searchParams.date) ?? today,
    fromDate,
    toDate
  );

  return {
    // The filter row's room, invoicing-status, booking-state and date-range
    // filters, and the sort: the params the member overview shares.
    ...parseListFilters(searchParams),
    ...parseSort(searchParams, ADMIN_SORT_KEYS, "date"),
    companyIds: multi(searchParams.company),
    focusDate,
    fromDate,
    memberships: knownValues(multi(searchParams.membership), MEMBERSHIPS),
    toDate,
    view,
    // Presence-only: ?worklist=1 or a bare ?worklist both turn it on.
    worklist: searchParams.worklist !== undefined,
  };
}

/** The overview's URL for the params, with the given keys changed. */
export function adminViewHref(
  params: AdminViewParams,
  changes: Partial<AdminViewParams> = {}
): string {
  const next = { ...params, ...changes };
  const search = new URLSearchParams();
  // The period wins over the month shortcut: both may be set, the dates
  // are what the queries read.
  search.set("from", next.fromDate);
  search.set("to", next.toDate);
  search.set("view", next.view);
  search.set("date", next.focusDate);
  appendValues(search, "company", next.companyIds);
  appendValues(search, "room", next.roomIds);
  appendValues(search, "status", next.invoicingStatuses);
  appendValues(search, "membership", next.memberships);
  appendValues(search, "state", next.bookingStates);
  setPeriodRange(search, next);
  setSort(search, next, "date");
  if (next.worklist) {
    search.set("worklist", "1");
  }
  return `/admin/bookings?${search.toString()}`;
}

/** The period a picked date opens: that date's month, the focus clamped
 * into it — the list and the month view share the month's window. */
export function windowAround(date: string): {
  focusDate: string;
  fromDate: string;
  toDate: string;
} {
  const window = monthWindow(monthOf(date));
  return {
    focusDate: clampDate(date, window.fromDate, window.toDate),
    fromDate: window.fromDate,
    toDate: window.toDate,
  };
}

/** The period moved by whole months (the arrows), whatever the view: a
 * month's step moves from the first of one month to the next, however
 * long the months are. */
export function movedPeriod(
  params: AdminViewParams,
  steps: number
): { focusDate: string; fromDate: string; toDate: string } {
  const window = monthWindow(moveMonth(monthOf(params.fromDate), steps));
  return {
    focusDate: clampDate(params.focusDate, window.fromDate, window.toDate),
    fromDate: window.fromDate,
    toDate: window.toDate,
  };
}
