// The bookings table's exports (#123): the same columns the admin
// Bookinger table shows, rendered from the one shared definition
// (ADMIN_COLUMNS in lib/bookings/admin-columns.ts) the table renders
// from too (#157). One ExportTable feeds both formats: the CSV
// (Excel/Numbers) and the PDF. Amounts are integer øre (ADR-0019)
// exported as kroner with comma decimals, still excl. VAT (ADR-0020);
// the " kr" unit stays out of the cells so Excel can sum the column.
// The table's "-" placeholder carries over.

import { ADMIN_COLUMNS } from "@/lib/bookings/admin-columns";
import type { AdminBookingRow } from "@/lib/domain/admin-bookings";
import { adminRowTotalOre } from "@/lib/domain/admin-bookings";
import type { ExportTable } from "@/lib/export/table";
import { formatDate, formatOre } from "@/lib/format";
import { messages } from "@/messages/da";

/** The bookings table both formats render: the header row, one row per
 * booking. */
export function bookingsTable(rows: readonly AdminBookingRow[]): ExportTable {
  return {
    headers: ADMIN_COLUMNS.flatMap((column) => column.csvHeaders),
    rows: rows.map((row) =>
      ADMIN_COLUMNS.flatMap((column) => column.csvCells(row))
    ),
  };
}

// The PDF's title (#123): "Bookinger" for a mixed export, "Bookinger for
// X" when every exported booking belongs to the one company.
export function bookingsTitle(rows: readonly AdminBookingRow[]): string {
  const company = rows[0]?.companyName;
  if (
    company !== undefined &&
    rows.every((row) => row.companyName === company)
  ) {
    return messages.bookings.admin.exportTitle(company);
  }
  return messages.shell.bookings;
}

// The PDF's period line (#123): the first booking's start date through the
// last booking's end date, among the exported rows — the rows the user
// selected on the POST, the filtered set on the GET. One date when both
// fall on the same day.
export function bookingsPeriod(
  rows: readonly AdminBookingRow[]
): string | undefined {
  if (rows.length === 0) {
    return undefined;
  }
  const startedBefore = (a: AdminBookingRow, b: AdminBookingRow): boolean =>
    new Date(a.startAt).getTime() < new Date(b.startAt).getTime();
  const endedAfter = (a: AdminBookingRow, b: AdminBookingRow): boolean =>
    new Date(a.endAt).getTime() > new Date(b.endAt).getTime();
  const first = rows.reduce(
    (earliest, row) => (startedBefore(row, earliest) ? row : earliest),
    rows[0]
  );
  const last = rows.reduce(
    (latest, row) => (endedAfter(row, latest) ? row : latest),
    rows[0]
  );
  const from = formatDate(first.startAt);
  const to = formatDate(last.endAt);
  const range = from === to ? from : `${from} - ${to}`;
  return `${messages.common.periodLabel}: ${range}`;
}

// The PDF's total line (#123): the sum of the exported rows' total column
// — the room rent after discount, the cancellation fee on a cancelled
// booking (ADR-0006) — the number the column itself sums to. A display
// line, so the " kr" unit and the thousands dots come back.
export function bookingsTotal(
  rows: readonly AdminBookingRow[]
): string | undefined {
  if (rows.length === 0) {
    return undefined;
  }
  const sumOre = rows.reduce(
    (sum, row) => sum + (adminRowTotalOre(row) ?? 0),
    0
  );
  return `${messages.common.totalLabel}: ${formatOre(sumOre)}`;
}
