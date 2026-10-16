// The Bookinger list as a CSV or PDF download (#123): the list view's
// filtered and sorted rows — the URL's filters ride along, the download
// link forwards the page's search — from the same listAdminBookings read,
// under the admin session's RLS. Route handlers run outside the (admin)
// layout, so the admin check happens here (docs/agents/auth.md); the POST
// takes the ticked selection, whose ids ride into the read as a filter.
import { requireAdminApi } from "@/lib/auth/require-admin";
import {
  listAdminBookings,
  listAdminFilterOptions,
} from "@/lib/bookings/admin-data";
import {
  bookingsPeriod,
  bookingsTable,
  bookingsTitle,
  bookingsTotal,
} from "@/lib/bookings/admin-export";
import {
  adminOverviewFilter,
  parseAdminViewParams,
} from "@/lib/bookings/admin-view-params";
import type { SearchParams } from "@/lib/bookings/view-params";
import { sortAdminRows } from "@/lib/domain/admin-bookings";
import { cphDate } from "@/lib/domain/opening-hours";
import {
  exportResponse,
  exportSchemas,
  readExportSelection,
} from "@/lib/export/response";
import { createClient } from "@/lib/supabase/server";
import { messages } from "@/messages/da";

// The URL's search as the record parseAdminViewParams reads; the
// multi-selects repeat their key.
function searchParamsRecord(url: URL): SearchParams {
  const record: SearchParams = {};
  url.searchParams.forEach((value, key) => {
    const current = record[key];
    if (current === undefined) {
      record[key] = value;
      return;
    }
    record[key] = Array.isArray(current)
      ? [...current, value]
      : [current, value];
  });
  return record;
}

// The shared PDF options: the wide page carries the nine columns; the
// note repeats the page's own price line.
function pdfOptions(today: string) {
  return {
    base: "bookinger",
    landscape: true,
    note: messages.bookings.allPricesExclVat,
    title: messages.shell.bookings,
    today,
  };
}

export async function GET(request: Request): Promise<Response> {
  const denied = await requireAdminApi();
  if (denied) {
    return denied;
  }
  const now = new Date();
  const url = new URL(request.url);
  const params = parseAdminViewParams(searchParamsRecord(url), cphDate(now));
  const supabase = await createClient();
  const options = await listAdminFilterOptions(supabase);
  const rows = await listAdminBookings(supabase, {
    ...adminOverviewFilter(params, now),
    options,
  });
  const exportedRows = sortAdminRows(rows, params.sort, params.sortDir);
  const today = cphDate(now);
  return exportResponse(bookingsTable(exportedRows), {
    ...pdfOptions(today),
    format: url.searchParams.get("format") === "pdf" ? "pdf" : "csv",
    period: bookingsPeriod(exportedRows),
    title: bookingsTitle(exportedRows),
    total: bookingsTotal(exportedRows),
  });
}

// The ticked rows' export (#123): the ids arrive in the order the table
// displayed them, and the export keeps that order — the read itself
// returns start order, so the ids pick the sequence. RLS still bounds
// every row, and a posted id the read cannot see drops out.
export async function POST(request: Request): Promise<Response> {
  const selection = await readExportSelection(request, exportSchemas.bookings);
  if (selection instanceof Response) {
    return selection;
  }
  const supabase = await createClient();
  const options = await listAdminFilterOptions(supabase);
  const rows = await listAdminBookings(supabase, {
    bookingIds: selection.bookingIds,
    bookingStates: [],
    companyIds: [],
    invoicingStatuses: [],
    memberships: [],
    now: new Date(),
    options,
    roomIds: [],
    worklist: false,
  });
  const byId = new Map(rows.map((row) => [row.bookingId, row]));
  const ordered = selection.bookingIds
    .map((id) => byId.get(id))
    .filter((row) => row !== undefined);
  return exportResponse(bookingsTable(ordered), {
    ...pdfOptions(cphDate(new Date())),
    format: selection.format,
    period: bookingsPeriod(ordered),
    title: bookingsTitle(ordered),
    total: bookingsTotal(ordered),
  });
}
