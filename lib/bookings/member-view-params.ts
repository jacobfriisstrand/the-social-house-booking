// The member Bookinger page's URL state: the admin overview's filter row
// and sort (lib/bookings/admin-view-params.ts) without the admin tools —
// no company, membership, Faktureringsklar or month view. The keys are
// the admin page's, so the two pages read alike.
import type { BookingOverviewSortKey } from "@/lib/domain/booking-overview";
import type { SortDirection } from "@/lib/table-sort";
import {
  appendValues,
  type ListFilterParams,
  parseListFilters,
  parseSort,
  type SearchParams,
  setPeriodRange,
  setSort,
} from "./view-params";

export interface MemberViewParams extends ListFilterParams {
  sort: BookingOverviewSortKey;
  sortDir: SortDirection;
}

const MEMBER_SORT_KEYS: readonly BookingOverviewSortKey[] = [
  "addOns",
  "booker",
  "bookingNumber",
  "date",
  "discount",
  "fee",
  "price",
  "room",
  "status",
];

export function parseMemberViewParams(
  searchParams: SearchParams
): MemberViewParams {
  return {
    ...parseListFilters(searchParams),
    ...parseSort(searchParams, MEMBER_SORT_KEYS, "date"),
  };
}

/** The page's URL for the params; the defaults stay out of it. */
export function memberViewHref(params: MemberViewParams): string {
  const search = new URLSearchParams();
  appendValues(search, "room", params.roomIds);
  appendValues(search, "status", params.invoicingStatuses);
  appendValues(search, "state", params.bookingStates);
  setPeriodRange(search, params);
  setSort(search, params, "date");
  const query = search.toString();
  return query ? `/bookings?${query}` : "/bookings";
}
