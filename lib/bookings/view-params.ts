// The URL state both Bookinger pages share (#9 and the member overview):
// the filter row's room, invoicing-status and booking-state multi-selects,
// its date range, and the list's sort, under the same keys on both pages. Parsing is pure
// and forgiving — an unknown value is no filter, not a filter that
// matches nothing — and the writers carry only what deviates from the
// defaults. Each page's own params module adds what only it has.
import type {
  BookingInvoicingStatus,
  BookingStateBucket,
} from "@/lib/domain/booking-overview";
import type { SortDirection } from "@/lib/table-sort";

export type SearchParams = Record<string, string | string[] | undefined>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const first = (
  value: string | string[] | undefined
): string | undefined => (Array.isArray(value) ? value[0] : value);

// A repeated URL param is a multi-select's selection: ?room=a&room=b.
// An absent param selects everything.
export const multi = (value: string | string[] | undefined): string[] => {
  if (value === undefined) {
    return [];
  }
  const list = Array.isArray(value) ? value : [value];
  return list.filter((entry) => entry !== "");
};

// A filter list keeps only the values the filter knows; a typo'd value is
// no filter at all, not a filter that matches nothing.
export const knownValues = <T extends string>(
  values: readonly string[],
  known: readonly T[]
): T[] =>
  values.filter((value): value is T =>
    (known as readonly string[]).includes(value)
  );

export const isoDate = (
  value: string | string[] | undefined
): string | undefined => {
  const raw = first(value);
  return raw && ISO_DATE.test(raw) ? raw : undefined;
};

const STATES: readonly BookingStateBucket[] = [
  "cancelled",
  "finished",
  "upcoming",
];
const STATUSES: readonly BookingInvoicingStatus[] = [
  "invoiced",
  "not_invoiced",
  "not_invoicable",
];

/** The filter row both pages have: rooms, invoicing statuses, booking-state
 * buckets, and the date range — absent when no range is picked, the
 * bookings' start dates the row set narrows to otherwise. */
export interface ListFilterParams {
  bookingStates: BookingStateBucket[];
  invoicingStatuses: BookingInvoicingStatus[];
  periodFrom?: string;
  periodTo?: string;
  roomIds: string[];
}

// The date range: both ends, or one standing for the single day; reversed
// ends swap. Absent means no date filter — the default row set is every
// booking.
function parsePeriodRange(searchParams: SearchParams): {
  periodFrom?: string;
  periodTo?: string;
} {
  const to = isoDate(searchParams.periodTo);
  const from = isoDate(searchParams.periodFrom) ?? to;
  if (from === undefined) {
    return { periodFrom: undefined, periodTo: undefined };
  }
  // ISO dates sort as text: the earlier end comes first.
  const [periodFrom, periodTo] = [from, to ?? from].toSorted();
  return { periodFrom, periodTo };
}

export function parseListFilters(searchParams: SearchParams): ListFilterParams {
  return {
    bookingStates: knownValues(multi(searchParams.state), STATES),
    invoicingStatuses: knownValues(multi(searchParams.status), STATUSES),
    ...parsePeriodRange(searchParams),
    roomIds: multi(searchParams.room),
  };
}

/** Whether any filter narrows the list, so an empty list can say why. */
export function hasListFilters(filters: ListFilterParams): boolean {
  return (
    filters.roomIds.length > 0 ||
    filters.invoicingStatuses.length > 0 ||
    filters.bookingStates.length > 0 ||
    filters.periodFrom !== undefined
  );
}

/** The list's sort: a known column, ascending unless ?dir=desc. */
export function parseSort<K extends string>(
  searchParams: SearchParams,
  keys: readonly K[],
  fallback: K
): { sort: K; sortDir: SortDirection } {
  const sort = first(searchParams.sort);
  return {
    sort: keys.find((key) => key === sort) ?? fallback,
    sortDir: first(searchParams.dir) === "desc" ? "desc" : "asc",
  };
}

/** A multi-select's ids repeat: ?room=a&room=b (URLSearchParams). */
export function appendValues(
  search: URLSearchParams,
  key: string,
  values: readonly string[]
): void {
  for (const value of values) {
    search.append(key, value);
  }
}

/** The date range rides only when picked; a clear (the values undefined)
 * drops the params and the row set goes back to every booking. */
export function setPeriodRange(
  search: URLSearchParams,
  { periodFrom, periodTo }: { periodFrom?: string; periodTo?: string }
): void {
  if (periodFrom !== undefined) {
    search.set("periodFrom", periodFrom);
  }
  if (periodTo !== undefined) {
    search.set("periodTo", periodTo);
  }
}

/** The sort rides only when it deviates from the default column, the
 * direction only when it is descending. */
export function setSort(
  search: URLSearchParams,
  { sort, sortDir }: { sort: string; sortDir: SortDirection },
  defaultSort: string
): void {
  if (sort !== defaultSort) {
    search.set("sort", sort);
  }
  if (sortDir !== "asc") {
    search.set("dir", sortDir);
  }
}
