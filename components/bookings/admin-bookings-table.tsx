"use client";

// Bookinger (admin) — the invoicing worklist's minimal version
// (2026-09-29): ended bookings without an invoice, newest ended first,
// sliced by the URL pagination. Filters, the totals row and the bulk
// "Markér som faktureret" action follow with the full invoicing view
// (DESIGN.md "Bookinger (admin)"); until then the page is read-only.
// Amounts integer øre, excl. VAT (ADR-0019, ADR-0020).
import { BookingStatusBadge } from "@/components/bookings/booking-overview";
import { TablePagination } from "@/components/pagination/table-pagination";
import { useTablePagination } from "@/components/pagination/use-table-pagination";
import { Card, CardFooter } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OutstandingInvoiceRow } from "@/lib/domain/booking-invoicing";
import { formatDate, formatOre, formatTime } from "@/lib/format";
import { slicePage } from "@/lib/pagination";
import { messages } from "@/messages/da";

const copy = messages.bookings.admin;
const bookingsCopy = messages.bookings;

export function AdminBookingsTable({
  rows,
}: {
  rows: OutstandingInvoiceRow[];
}) {
  const paged = useTablePagination(rows.length);
  const visible = slicePage(rows, paged.page, paged.pageSize);

  if (rows.length === 0) {
    return (
      <Card className="py-0">
        <Empty className="border-0 py-16">
          <EmptyHeader>
            <EmptyTitle>{copy.emptyTitle}</EmptyTitle>
            <EmptyDescription>{copy.emptyDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </Card>
    );
  }

  return (
    <Card className="min-w-0 gap-0 py-0">
      <Table className="min-w-[60rem]">
        <TableCaption className="sr-only">{copy.tableCaption}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 w-40">
              {bookingsCopy.columns.bookingNumber}
            </TableHead>
            <TableHead>{copy.columns.company}</TableHead>
            <TableHead>{bookingsCopy.columns.room}</TableHead>
            <TableHead>{bookingsCopy.columns.date}</TableHead>
            <TableHead className="text-right">{copy.columns.total}</TableHead>
            <TableHead>{bookingsCopy.columns.status}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((row) => (
            <TableRow key={row.bookingId}>
              <TableCell className="sticky left-0 z-10 bg-card font-mono">
                {row.bookingNumber}
              </TableCell>
              <TableCell className="font-medium">{row.companyName}</TableCell>
              <TableCell>{row.roomName}</TableCell>
              <TableCell className="tabular-nums">
                <span className="block">{formatDate(row.bookingStartAt)}</span>
                <span className="block text-muted-foreground text-xs">
                  {formatTime(row.bookingStartAt)} -{" "}
                  {formatTime(row.bookingEndAt)}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatOre(row.basisOre)}
              </TableCell>
              <TableCell>
                <BookingStatusBadge status={row.bookingStatus} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <CardFooter className="px-2 py-1">
        <TablePagination paged={paged} totalItems={rows.length} />
      </CardFooter>
    </Card>
  );
}
