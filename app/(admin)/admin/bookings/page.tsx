import type { SupabaseClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import {
  AdminBookingsView,
  type AdminCalendarModel,
} from "@/components/bookings/admin-bookings-view";
import { ExportMenu } from "@/components/export-menu";
import { PageHeader, PagePanel } from "@/components/shell/page";
import { requireSession } from "@/lib/auth/require-session";
import { buildAdminCalendarCells } from "@/lib/bookings/admin-calendar";
import {
  type AdminFilterOptions,
  type AdminOverviewFilter,
  listAdminBookings,
  listAdminCalendarEntries,
  listAdminFilterOptions,
} from "@/lib/bookings/admin-data";
import {
  type AdminViewParams,
  adminExportHref,
  adminOverviewFilter,
  parseAdminViewParams,
} from "@/lib/bookings/admin-view-params";
import { cphDate } from "@/lib/domain/opening-hours";
import { calendarDates, calendarWindow } from "@/lib/domain/periods";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { messages } from "@/messages/da";

export const metadata: Metadata = {
  title: messages.shell.bookings,
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// The month view's server branch (#9): the calendar's cells and the rows
// its detail sheet reads — the table's own sheet, so a click in the grid
// opens what the list opens.
async function AdminBookingsMonth({
  filter,
  options,
  params,
  supabase,
  today,
  view,
}: {
  filter: AdminOverviewFilter;
  options: AdminFilterOptions;
  params: AdminViewParams;
  supabase: SupabaseClient<Database>;
  today: string;
  // The month branch only serves this view; the narrow type is what the
  // calendar helpers take.
  view: "month";
}) {
  // The calendar shows its own visible range — the month the focus date
  // sits in — so the arrows move the whole period and the list follows
  // (the period filter is shared, #9).
  const window = calendarWindow(view, params.focusDate);
  const { entries, rows } = await listAdminCalendarEntries(supabase, {
    ...filter,
    fromDate: window.fromDate,
    options,
    toDate: window.toDate,
  });
  const calendar: AdminCalendarModel = {
    cells: buildAdminCalendarCells({
      dates: calendarDates(view, params.focusDate),
      entries,
    }),
  };
  return (
    <PagePanel>
      <AdminBookingsView
        calendar={calendar}
        calendarRows={rows}
        options={options}
        params={params}
        rows={[]}
        today={today}
      />
    </PagePanel>
  );
}

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
  const search = await rawParams;
  const params = parseAdminViewParams(search, today);
  const supabase = await createClient();
  const exportHref = adminExportHref(search);

  const filter: AdminOverviewFilter = adminOverviewFilter(params, now);

  const options = await listAdminFilterOptions(supabase);

  if (params.view !== "list") {
    // The export is the list's export: no button in the month view, where
    // the calendar's own window is what shows — the list filters would not
    // match what the admin is looking at.
    return (
      <>
        <PageHeader title={messages.shell.bookings} />
        <AdminBookingsMonth
          filter={filter}
          options={options}
          params={params}
          supabase={supabase}
          today={today}
          view={params.view}
        />
      </>
    );
  }

  const rows = await listAdminBookings(supabase, {
    ...filter,
    options,
  });

  return (
    <>
      <PageHeader title={messages.shell.bookings}>
        <ExportMenu href={exportHref} />
      </PageHeader>
      <PagePanel>
        <AdminBookingsView
          calendar={null}
          calendarRows={[]}
          options={options}
          params={params}
          rows={rows}
          today={today}
        />
      </PagePanel>
    </>
  );
}
