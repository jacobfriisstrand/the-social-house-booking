import type { Metadata } from "next";
import {
  AdminBookingsView,
  type AdminCalendarModel,
} from "@/components/bookings/admin-bookings-view";
import { PageHeader, PagePanel } from "@/components/shell/page";
import { requireSession } from "@/lib/auth/require-session";
import { buildAdminCalendarCells } from "@/lib/bookings/admin-calendar";
import {
  type AdminOverviewFilter,
  listAdminBookingDetails,
  listAdminBookings,
  listAdminCalendarEntries,
  listAdminFilterOptions,
} from "@/lib/bookings/admin-data";
import { parseAdminViewParams } from "@/lib/bookings/admin-view-params";
import { cphDate } from "@/lib/domain/opening-hours";
import { calendarDates, calendarWindow } from "@/lib/domain/periods";
import { createClient } from "@/lib/supabase/server";
import { messages } from "@/messages/da";

export const metadata: Metadata = {
  title: messages.shell.bookings,
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Bookinger (admin) — the invoicing view (#9, DESIGN.md "Bookinger
// (admin)"): every booking as a list and as a calendar on one page, with
// filters, sorting, totals and the bulk mark. The state travels in the URL
// (lib/bookings/admin-view-params.ts), so the two views share it and a
// switch keeps the filters. The layout guards the route
// (app_role = 'admin', docs/agents/auth.md); the reads run under that
// session and RLS.
export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [rawParams] = await Promise.all([searchParams, requireSession()]);
  const now = new Date();
  const today = cphDate(now);
  const params = parseAdminViewParams(await rawParams, today);
  const supabase = await createClient();

  const filter: AdminOverviewFilter = {
    bookingStates: params.bookingStates,
    companyIds: params.companyIds,
    invoicingStatuses: params.invoicingStatuses,
    memberships: params.memberships,
    now,
    periodFrom: params.periodFrom,
    periodTo: params.periodTo,
    roomIds: params.roomIds,
    worklist: params.worklist,
  };

  const options = await listAdminFilterOptions(supabase);

  // The calendar shows its own visible range — the month the focus date
  // sits in — so the arrows move the whole period and the list follows
  // (the period filter is shared, #9).
  if (params.view !== "list") {
    const window = calendarWindow(params.view, params.focusDate);
    const calendarFilter = {
      ...filter,
      fromDate: window.fromDate,
      toDate: window.toDate,
    };
    const [entries, details] = await Promise.all([
      listAdminCalendarEntries(supabase, { ...calendarFilter, options }),
      listAdminBookingDetails(supabase, window.fromDate, window.toDate),
    ]);

    const calendar: AdminCalendarModel = {
      cells: buildAdminCalendarCells({
        dates: calendarDates(params.view, params.focusDate),
        details,
        entries,
      }),
    };

    return (
      <>
        <PageHeader title={messages.shell.bookings} />
        <PagePanel>
          <AdminBookingsView
            calendar={calendar}
            options={options}
            params={params}
            rows={[]}
            today={today}
          />
        </PagePanel>
      </>
    );
  }

  const rows = await listAdminBookings(supabase, {
    ...filter,
    options,
  });

  return (
    <>
      <PageHeader title={messages.shell.bookings} />
      <PagePanel>
        <AdminBookingsView
          calendar={null}
          options={options}
          params={params}
          rows={rows}
          today={today}
        />
      </PagePanel>
    </>
  );
}
