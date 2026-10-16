// The Bookinger list as a CSV or PDF download (#123): the list view's
// filtered and sorted rows — the URL's filters ride along, the download
// link forwards the page's search — from the same listAdminBookings read,
// under the admin session's RLS. Route handlers run outside the (admin)
// layout, so the admin check happens here (docs/agents/auth.md).

import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/require-admin";
import {
  type AdminOverviewFilter,
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
import { toCsv } from "@/lib/export/csv";
import { renderTablePdf } from "@/lib/export/pdf";
import { fileResponse } from "@/lib/export/response";
import { createClient } from "@/lib/supabase/server";
import { messages } from "@/messages/da";

// The ticked bookings' export: ids the table displayed, at most the
// catalogue the .in() query can carry comfortably.
const exportSelectionSchema = z.object({
  bookingIds: z.array(z.guid()).min(1).max(10_000),
  format: z.enum(["csv", "pdf"]),
});

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

// The ticked rows' export (#123): the ids arrive in the order the table
// displayed them, and the export keeps that order — the read itself
// returns start order, so the ids pick the sequence. The admin guard is
// the same as the GET's; the ids ride into the read as a filter, so RLS
// still bounds every row.
export async function POST(request: Request): Promise<Response> {
  const denied = await requireAdminApi();
  if (denied) {
    return denied;
  }
  const parsed = exportSelectionSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return new Response(messages.common.invalidRequest, { status: 400 });
  }
  const supabase = await createClient();
  const options = await listAdminFilterOptions(supabase);
  const filter: AdminOverviewFilter = {
    bookingIds: parsed.data.bookingIds,
    bookingStates: [],
    companyIds: [],
    invoicingStatuses: [],
    memberships: [],
    now: new Date(),
    roomIds: [],
    worklist: false,
  };
  const rows = await listAdminBookings(supabase, { ...filter, options });
  // The read returns start order; the posted ids restore the display
  // order. A posted id the read cannot see (RLS or a raced delete) drops
  // out instead of failing the whole export.
  const byId = new Map(rows.map((row) => [row.bookingId, row]));
  const ordered = parsed.data.bookingIds
    .map((id) => byId.get(id))
    .filter((row) => row !== undefined);
  const table = bookingsTable(ordered);
  const today = cphDate(new Date());
  if (parsed.data.format === "pdf") {
    return fileResponse(
      await renderTablePdf({
        landscape: true,
        note: messages.bookings.allPricesExclVat,
        period: bookingsPeriod(ordered),
        table,
        title: bookingsTitle(ordered),
        total: bookingsTotal(ordered),
      }),
      `bookinger-${today}.pdf`,
      "application/pdf"
    );
  }
  return fileResponse(
    toCsv(table),
    `bookinger-${today}.csv`,
    "text/csv; charset=utf-8"
  );
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
  const table = bookingsTable(exportedRows);
  const today = cphDate(now);
  if (url.searchParams.get("format") === "pdf") {
    // The wide page carries the nine columns; the note repeats the page's
    // own price line.
    return fileResponse(
      await renderTablePdf({
        landscape: true,
        note: messages.bookings.allPricesExclVat,
        period: bookingsPeriod(exportedRows),
        table,
        title: bookingsTitle(exportedRows),
        total: bookingsTotal(exportedRows),
      }),
      `bookinger-${today}.pdf`,
      "application/pdf"
    );
  }
  return fileResponse(
    toCsv(table),
    `bookinger-${today}.csv`,
    "text/csv; charset=utf-8"
  );
}
