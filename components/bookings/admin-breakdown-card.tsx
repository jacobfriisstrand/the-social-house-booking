// The per-company and per-room breakdowns (#9): one line per company and
// per room with the bookings, the hours and the total of the admin's set.
// Fed by the same overview rows the booking list reads — the whole set,
// no period. Not mounted for now (2026-10-09); it lived on the home page
// and is parked here until wanted again.
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type AdminBookingRow,
  type AdminBreakdownEntry,
  breakdownAdminRows,
} from "@/lib/domain/admin-bookings";
import { formatHours, formatMonthYear, formatOre } from "@/lib/format";
import { messages } from "@/messages/da";

const copy = messages.bookings.admin;

function Breakdown({
  entries,
  title,
}: {
  entries: AdminBreakdownEntry[];
  title: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <h3 className="font-medium text-sm">{title}</h3>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-2/5" />
            <TableHead className="text-right">
              {copy.breakdown.bookings}
            </TableHead>
            <TableHead className="text-right">{copy.breakdown.hours}</TableHead>
            <TableHead className="text-right">{copy.breakdown.total}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.label}>
              <TableCell className="truncate">{entry.label}</TableCell>
              <TableCell className="text-right tabular-nums">
                {entry.bookingCount}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatHours(entry.minutes)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatOre(entry.basisOre)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function AdminBreakdownCard({
  month,
  rows,
}: {
  // yyyy-mm-dd — the card titles itself with the month the set covers.
  month: string;
  rows: AdminBookingRow[];
}) {
  const byCompany = breakdownAdminRows(rows, "company");
  const byRoom = breakdownAdminRows(rows, "room");
  return (
    <Card className="gap-4 p-4">
      <CardHeader className="p-0">
        <CardTitle className="text-base">
          {copy.breakdown.title} · {formatMonthYear(month)}
        </CardTitle>
      </CardHeader>
      <div className="flex flex-col gap-6 md:flex-row">
        <Breakdown entries={byCompany} title={copy.breakdown.byCompany} />
        <Breakdown entries={byRoom} title={copy.breakdown.byRoom} />
      </div>
    </Card>
  );
}
