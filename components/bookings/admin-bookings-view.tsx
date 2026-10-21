"use client";

import { CalendarIcon, ListIcon } from "lucide-react";
// Bookinger (admin), the shell around the two views (#9, DESIGN.md
// "Bookinger (admin)"): the filter row, the view toggle and the list or
// the calendar. Every control writes its change to the URL, so the two
// views share one state and a switch keeps the filters; the server re-reads
// the set (use-view-params.ts). The list's sorting, selection and bulk mark
// live with the table (admin-bookings-table.tsx); the calendar's month
// grid and its stepper are admin-calendar-grid.tsx; the filter row is
// filter-row.tsx, shared with the member Bookinger page.
import { useCallback } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { AdminCalendarCell } from "@/lib/bookings/admin-calendar";
import type { AdminFilterOptions } from "@/lib/bookings/admin-data";
import {
  type AdminViewParams,
  adminViewHref,
  windowAround,
} from "@/lib/bookings/admin-view-params";
import type { AdminBookingRow } from "@/lib/domain/admin-bookings";
import { formatMonthYear } from "@/lib/format";
import { messages } from "@/messages/da";
import { AdminBookingsTable } from "./admin-bookings-table";
import { AdminCalendarGrid } from "./admin-calendar-grid";
import { BookingFilterRow } from "./filter-row";
import { useViewParams } from "./use-view-params";

const copy = messages.bookings.admin;

/** What the server built for the calendar: the month's compact cells. */
export interface AdminCalendarModel {
  cells: AdminCalendarCell[];
}

export function AdminBookingsView({
  calendar,
  calendarRows,
  options,
  params,
  rows,
  today,
}: {
  // Null in the list view; a day grid or a compact grid otherwise.
  calendar: AdminCalendarModel | null;
  // The rows behind the calendar's entries: the month view's sheet is the
  // table's own detail sheet, fed with the same AdminBookingRow.
  calendarRows: AdminBookingRow[];
  options: AdminFilterOptions;
  params: AdminViewParams;
  rows: AdminBookingRow[];
  today: string;
}) {
  // Every control reads `view`, the params with the writes still on their
  // way merged in, and writes through `update` (use-view-params.ts).
  const { loading, replace, update, view } = useViewParams(
    params,
    adminViewHref
  );

  const resetFilters = useCallback(() => {
    replace({
      ...params,
      bookingStates: [],
      companyIds: [],
      invoicingStatuses: [],
      memberships: [],
      periodFrom: undefined,
      periodTo: undefined,
      roomIds: [],
      worklist: false,
      ...windowAround(today),
    });
  }, [params, replace, today]);

  const onViewChange = useCallback(
    (values: string[]) => {
      // A click on the active segment empties the group; the view stays.
      const value = values.at(-1);
      if (value !== undefined) {
        update({ view: value as AdminViewParams["view"] });
      }
    },
    [update]
  );

  return (
    <>
      <BookingFilterRow
        companies={options.companies}
        listTools={view.view === "list"}
        onChange={update}
        onReset={resetFilters}
        rooms={options.rooms}
        value={view}
      >
        <ToggleGroup
          onValueChange={onViewChange}
          spacing={0}
          value={[view.view]}
          variant="outline"
        >
          <ToggleGroupItem value="list">
            <ListIcon aria-hidden="true" />
            {copy.view.list}
          </ToggleGroupItem>
          <ToggleGroupItem value="month">
            <CalendarIcon aria-hidden="true" />
            {copy.view.month}
          </ToggleGroupItem>
        </ToggleGroup>
      </BookingFilterRow>
      {/* The branch reads the overlay's view, not the props: a toggle flips
          view.view at once while calendar/rows stay stale for the round
          trip, and the pending surface must be the one being switched TO —
          cell skeletons for the month, row skeletons for the list. */}
      {view.view === "month" ? (
        <AdminCalendarGrid
          calendar={calendar}
          loading={loading}
          // The grid is built from the focus date; a custom Fra/Til
          // period can span months, so the title reads the focus date,
          // not the period's first day.
          monthLabel={formatMonthYear(view.focusDate)}
          onPeriodChange={update}
          params={view}
          rows={calendarRows}
          today={today}
        />
      ) : (
        <AdminBookingsTable
          loading={loading}
          onParamChange={update}
          params={view}
          rows={rows}
        />
      )}
    </>
  );
}
