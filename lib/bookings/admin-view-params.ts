// The admin booking overview's URL state (#9): every filter, the view, and
// the list's sort travel in the search params so the two views share one
// state and a view switch keeps the filters. Parsing is pure and today is
// injected, so the defaults are testable.

import type {
  AdminMembership,
  AdminSortKey,
} from "@/lib/domain/admin-bookings";
import type { BookingInvoicingStatus } from "@/lib/domain/booking-overview";
import { clampDate, monthOf, monthWindow } from "@/lib/domain/periods";

export type AdminViewKind = "list" | "month";

export type InvoicingStatusParam = BookingInvoicingStatus;

export type MembershipParam = AdminMembership;

export type AdminSortDir = "asc" | "desc";

export interface AdminViewParams {
  companyIds: string[];
  focusDate: string;
  fromDate: string;
  includeHouseEvents: boolean;
  invoicingStatuses: InvoicingStatusParam[];
  memberships: MembershipParam[];
  roomIds: string[];
  sort: AdminSortKey;
  sortDir: AdminSortDir;
  toDate: string;
  view: AdminViewKind;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
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

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

// A repeated URL param is a multi-select's selection: ?company=a&company=b.
// An absent param selects everything.
const multi = (value: string | string[] | undefined): string[] => {
  if (value === undefined) {
    return [];
  }
  const list = Array.isArray(value) ? value : [value];
  return list.filter((entry) => entry !== "");
};

const STATUSES: readonly InvoicingStatusParam[] = [
  "invoiced",
  "not_invoiced",
  "not_invoicable",
];
const MEMBERSHIPS: readonly MembershipParam[] = ["member", "external"];

// A filter list keeps only the values the filter knows; a typo'd value is
// no filter at all, not a filter that matches nothing.
const knownValues = <T extends string>(
  values: readonly string[],
  known: readonly T[]
): T[] =>
  values.filter((value): value is T =>
    (known as readonly string[]).includes(value)
  );

const isoDate = (value: string | string[] | undefined): string | undefined => {
  const raw = first(value);
  return raw && ISO_DATE.test(raw) ? raw : undefined;
};

// A month param selects that month's window; a bad value falls back to
// today's month.
const monthParam = (
  value: string | string[] | undefined
): { fromDate: string; toDate: string } | undefined => {
  const raw = first(value);
  return raw && MONTH.test(raw) ? monthWindow(raw) : undefined;
};

export function parseAdminViewParams(
  searchParams: Record<string, string | string[] | undefined>,
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

  const sortParam = first(searchParams.sort);
  const sort: AdminSortKey = ADMIN_SORT_KEYS.includes(sortParam as AdminSortKey)
    ? (sortParam as AdminSortKey)
    : "date";
  const sortDir: AdminSortDir =
    first(searchParams.dir) === "desc" ? "desc" : "asc";

  // The calendar's focus sits in the period, so a month picked for the
  // list opens the calendar in that month.
  const focusDate = clampDate(
    isoDate(searchParams.date) ?? today,
    fromDate,
    toDate
  );

  return {
    companyIds: multi(searchParams.company),
    focusDate,
    fromDate,
    // The House Events filter hides them; they show by default (DESIGN.md
    // "Bookinger (admin)").
    includeHouseEvents: first(searchParams.houseEvents) !== "hide",
    invoicingStatuses: knownValues(multi(searchParams.status), STATUSES),
    memberships: knownValues(multi(searchParams.membership), MEMBERSHIPS),
    roomIds: multi(searchParams.room),
    sort,
    sortDir,
    toDate,
    view,
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
  // A multi-select's ids repeat: ?company=a&company=b (URLSearchParams).
  for (const companyId of next.companyIds) {
    search.append("company", companyId);
  }
  for (const roomId of next.roomIds) {
    search.append("room", roomId);
  }
  for (const status of next.invoicingStatuses) {
    search.append("status", status);
  }
  for (const membership of next.memberships) {
    search.append("membership", membership);
  }
  if (!next.includeHouseEvents) {
    search.set("houseEvents", "hide");
  }
  if (next.sort !== "date") {
    search.set("sort", next.sort);
  }
  if (next.sortDir !== "asc") {
    search.set("dir", next.sortDir);
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
  const [year, month] = params.fromDate.split("-").map(Number);
  const moved = new Date(Date.UTC(year, month - 1 + steps, 1));
  const window = monthWindow(
    `${moved.getUTCFullYear()}-${String(moved.getUTCMonth() + 1).padStart(2, "0")}`
  );
  return {
    focusDate: clampDate(params.focusDate, window.fromDate, window.toDate),
    fromDate: window.fromDate,
    toDate: window.toDate,
  };
}
