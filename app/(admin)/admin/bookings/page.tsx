import {
  AdminBookingsView,
  type AdminCalendarModel,
} from "@/components/bookings/admin-bookings-view";
import { ExportMenu } from "@/components/export-menu";
import { PageHeader, PagePanel } from "@/components/shell/page";
import { requireSession } from "@/lib/auth/require-session";
import { buildAdminCalendarCells } from "@/lib/bookings/admin-calendar";
import {
  type AdminOverviewFilter,
  listAdminBookings,
  listAdminCalendarEntries,
  listAdminFilterOptions,
} from "@/lib/bookings/admin-data";
import {
  adminOverviewFilter,
  parseAdminViewParams,
} from "@/lib/bookings/admin-view-params";
import { cphDate } from "@/lib/domain/opening-hours";
import { calendarDates, calendarWindow } from "@/lib/domain/periods";
import { createClient } from "@/lib/supabase/server";
import { messages } from "@/messages/da";

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
  const search = await rawParams;
  const params = parseAdminViewParams(search, today);
  const supabase = await createClient();

  // The export takes the URL's own filters: the download link forwards
  // the page's search, so the CSV carries the same rows the list shows.
  const exportSearch = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (typeof value === "string") {
      exportSearch.set(key, value);
    } else if (Array.isArray(value)) {
      for (const entry of value) {
        exportSearch.append(key, entry);
      }
    }
  }
  const exportQuery = exportSearch.toString();
  const exportHref = `/admin/bookings/export${exportQuery ? `?${exportQuery}` : ""}`;

  const filter: AdminOverviewFilter = adminOverviewFilter(params, now);

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
    const { entries, rows: calendarRows } = await listAdminCalendarEntries(
      supabase,
      { ...calendarFilter, options }
    );

    const calendar: AdminCalendarModel = {
      cells: buildAdminCalendarCells({
        dates: calendarDates(params.view, params.focusDate),
        entries,
      }),
    };

    // The export is the list's export: no button in the month view, where
    // the calendar's own window is what shows — the list filters would not
    // match what the admin is looking at.
    return (
      <>
        <PageHeader title={messages.shell.bookings} />
        <PagePanel>
          <AdminBookingsView
            calendar={calendar}
            calendarRows={calendarRows}
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
