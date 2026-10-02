"use client";

import { useCallback, useState } from "react";
import { BookingSheet } from "@/components/bookings/booking-sheet";
import { TablePagination } from "@/components/pagination/table-pagination";
import {
  resetPaginationPage,
  useTablePagination,
} from "@/components/pagination/use-table-pagination";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  addOnsTotalOre,
  type BookingInvoicingStatus,
  type BookingOverviewLists,
  type BookingOverviewRow,
  type BookingOverviewStatus,
} from "@/lib/domain/booking-overview";
import { formatDateTime, formatOre } from "@/lib/format";
import { slicePage } from "@/lib/pagination";
import { messages } from "@/messages/da";

const copy = messages.bookings;

function dateAndTime(instant: string): { date: string; time: string } {
  const [date, time] = formatDateTime(instant).split(" ");
  return { date: date ?? "", time: time ?? "" };
}

// The booking status badge, shared with the admin Bookinger table.
export function BookingStatusBadge({
  status,
}: {
  status: BookingOverviewStatus;
}) {
  if (status === "cancelled") {
    return <Badge variant="destructive">{copy.status.cancelled}</Badge>;
  }
  if (status === "pending_verification") {
    return <Badge variant="warning">{copy.status.pendingVerification}</Badge>;
  }
  return <Badge variant="success">{copy.status.confirmed}</Badge>;
}

function InvoicingStatusBadge({ status }: { status: BookingInvoicingStatus }) {
  if (status === "invoiced") {
    return <Badge variant="success">{copy.invoicing.invoiced}</Badge>;
  }
  if (status === "not_invoicable") {
    return (
      <Badge className="bg-muted text-muted-foreground" variant="outline">
        {copy.invoicing.notInvoicable}
      </Badge>
    );
  }
  return <Badge variant="warning">{copy.invoicing.notInvoiced}</Badge>;
}

// The count chip on a tab (and the sidebar's): a tint, not a solid, reading
// on both the white active tab and the secondary list ground; hidden at
// zero, where it would only say nothing (DESIGN.md "Badges").
function CountBadge({ count }: { count: number }) {
  if (count === 0) {
    return null;
  }
  return (
    <Badge
      className="min-w-5 justify-center bg-muted px-1.5 tabular-nums"
      variant="outline"
    >
      {count}
    </Badge>
  );
}

// One column, two lines (changed with #16 from the separate date and time
// columns): the date, and the time range muted under it — the admin
// bookings table's rendering.
function BookingDateCells({ booking }: { booking: BookingOverviewRow }) {
  const start = dateAndTime(booking.bookingStartAt);
  const end = dateAndTime(booking.endAt);

  return (
    <TableCell className="tabular-nums">
      <span className="block">{start.date}</span>
      <span className="block text-muted-foreground text-xs">
        {start.time} - {end.time}
      </span>
    </TableCell>
  );
}

// One value per cell, in the table's one text size: the total, and the
// discount as its percentage (decided 2026-09-23 while reviewing #81).
function BookingPriceCell({ booking }: { booking: BookingOverviewRow }) {
  return (
    <TableCell className="text-right tabular-nums">
      {formatOre(booking.price.totalOre)}
    </TableCell>
  );
}

function BookingDiscountCell({ booking }: { booking: BookingOverviewRow }) {
  return (
    <TableCell className="text-right tabular-nums">
      {booking.price.showSavings
        ? `${booking.price.discountPercent} %`
        : copy.noDiscount}
    </TableCell>
  );
}

// One value per cell, in the table's one text size: the add-ons total
// (not each add-on as its own row, 2026-09-29), the discount as its
// percentage (decided 2026-09-23 while reviewing #81).
function BookingAddOnsCell({ booking }: { booking: BookingOverviewRow }) {
  return (
    <TableCell className="text-right tabular-nums">
      {booking.addOns.length === 0
        ? copy.noAddOns
        : formatOre(addOnsTotalOre(booking.addOns))}
    </TableCell>
  );
}

// The two badges stack vertically (2026-09-29): the row keeps its height,
// and neither badge pushes the other wide. The column is the table's last,
// which always sits right-aligned (DESIGN.md "Components", 2026-10-02).
function BookingStatusCell({ booking }: { booking: BookingOverviewRow }) {
  return (
    <TableCell>
      <div className="flex flex-col items-end gap-1">
        <BookingStatusBadge status={booking.bookingStatus} />
        <InvoicingStatusBadge status={booking.invoicingStatus} />
      </div>
    </TableCell>
  );
}

// The card is as tall as its content (changed 2026-09-29 from the #81
// fill-the-panel scroll): with pagination the rows fit the page, and a
// list taller than the panel scrolls the panel as before. The vertical
// sticky header is gone with the internal scroll; the horizontal scroll
// keeps the sticky booking-number column. Rows are separated by 1px
// lines in the border token, the near-white hairline every other line
// uses — no vertical lines (2026-09-29). The header row sits on the
// muted/50 ground like every table (2026-09-29), and every title aligns
// with its values — the numeric titles right, over their right-aligned
// amounts (2026-09-29; was left-aligned, 2026-09-26 in #81).
// A row opens the booking sheet (DESIGN.md "Bookinger (member)"): click and
// keyboard both work, the booking number doubles as the accessible label.
function openBookingWith(
  booking: BookingOverviewRow,
  open: (booking: BookingOverviewRow) => void
): {
  onClick: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
} {
  return {
    onClick: () => open(booking),
    onKeyDown: (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open(booking);
      }
    },
  };
}

function BookingTable({
  bookings,
  onOpen,
}: {
  bookings: BookingOverviewRow[];
  onOpen: (booking: BookingOverviewRow) => void;
}) {
  const paged = useTablePagination(bookings.length);
  const rows = slicePage(bookings, paged.page, paged.pageSize);

  return (
    <Card className="min-w-0 gap-0 py-0">
      {/* table-fixed: the columns between the first and the last share the
          remaining width evenly, and the min-width keeps the table wide
          enough for its nowrap headers — the card scrolls it sideways when
          the screen narrows (DESIGN.md "Components"). */}
      <Table className="min-w-[88rem] table-fixed">
        <TableCaption className="sr-only">{copy.tableCaption}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 w-36">
              {copy.columns.bookingNumber}
            </TableHead>
            <TableHead>{copy.columns.room}</TableHead>
            <TableHead>{copy.columns.dateTime}</TableHead>
            <TableHead>{copy.columns.booker}</TableHead>
            <TableHead className="text-right">{copy.columns.price}</TableHead>
            <TableHead className="text-right">
              {copy.columns.discount}
            </TableHead>
            <TableHead className="text-right">{copy.columns.addOns}</TableHead>
            <TableHead className="text-right">
              {copy.columns.cancellationFee}
            </TableHead>
            <TableHead className="text-right">{copy.columns.status}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((booking) => (
            <TableRow
              className="cursor-pointer"
              key={booking.bookingId}
              tabIndex={0}
              {...openBookingWith(booking, onOpen)}
            >
              <TableCell className="sticky left-0 z-10 bg-card font-mono">
                {booking.bookingNumber}
              </TableCell>
              <TableCell className="truncate font-medium">
                {booking.roomName}
              </TableCell>
              <BookingDateCells booking={booking} />
              <TableCell className="truncate">{booking.bookerName}</TableCell>
              <BookingPriceCell booking={booking} />
              <BookingDiscountCell booking={booking} />
              <BookingAddOnsCell booking={booking} />
              <TableCell className="text-right tabular-nums">
                {booking.cancellationFeeOre === null
                  ? copy.noCancellationFee
                  : formatOre(booking.cancellationFeeOre)}
              </TableCell>
              <BookingStatusCell booking={booking} />
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <CardFooter className="px-2 py-1">
        {/* The "ekskl. moms" line sits directly above the pagination arrows,
            inside the pagination block, so the row hugs the table
            (2026-09-29). */}
        <TablePagination
          note={copy.allPricesExclVat}
          paged={paged}
          totalItems={bookings.length}
        />
      </CardFooter>
    </Card>
  );
}

function BookingEmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <Card className="py-0">
      <Empty className="border-0 py-16">
        <EmptyHeader>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Card>
  );
}

function BookingPanel({
  bookings,
  emptyDescription,
  emptyTitle,
  onOpen,
}: {
  bookings: BookingOverviewRow[];
  emptyDescription: string;
  emptyTitle: string;
  onOpen: (booking: BookingOverviewRow) => void;
}) {
  return bookings.length > 0 ? (
    <BookingTable bookings={bookings} onOpen={onOpen} />
  ) : (
    <BookingEmptyState description={emptyDescription} title={emptyTitle} />
  );
}

// One sheet for the whole overview: the row a click or keyboard landed on.
// After a cancel the row re-reads on refresh, so the sheet closes to a
// fresh table.
export function BookingOverview({
  bookings,
}: {
  bookings: BookingOverviewLists<BookingOverviewRow>;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<BookingOverviewRow | null>(null);
  const openBooking = useCallback((booking: BookingOverviewRow) => {
    setSelected(booking);
    setOpen(true);
  }, []);
  const closeSheet = useCallback(() => setOpen(false), []);

  // A new tab is a new view of the same table: it starts on its first page;
  // the chosen page size carries over.
  const handleTabChange = useCallback(() => {
    resetPaginationPage();
  }, []);

  return (
    <>
      <Tabs defaultValue="all" onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="all">
            {copy.tabs.all}
            <CountBadge count={bookings.all.length} />
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            {copy.tabs.upcoming}
            <CountBadge count={bookings.upcoming.length} />
          </TabsTrigger>
          <TabsTrigger value="past">
            {copy.tabs.past}
            <CountBadge count={bookings.past.length} />
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            {copy.tabs.cancelled}
            <CountBadge count={bookings.cancelled.length} />
          </TabsTrigger>
        </TabsList>
        <TabsContent className="pt-4" value="all">
          <BookingPanel
            bookings={bookings.all}
            emptyDescription={copy.empty.allDescription}
            emptyTitle={copy.empty.allTitle}
            onOpen={openBooking}
          />
        </TabsContent>
        <TabsContent className="pt-4" value="upcoming">
          <BookingPanel
            bookings={bookings.upcoming}
            emptyDescription={copy.empty.upcomingDescription}
            emptyTitle={copy.empty.upcomingTitle}
            onOpen={openBooking}
          />
        </TabsContent>
        <TabsContent className="pt-4" value="past">
          <BookingPanel
            bookings={bookings.past}
            emptyDescription={copy.empty.pastDescription}
            emptyTitle={copy.empty.pastTitle}
            onOpen={openBooking}
          />
        </TabsContent>
        <TabsContent className="pt-4" value="cancelled">
          <BookingPanel
            bookings={bookings.cancelled}
            emptyDescription={copy.empty.cancelledDescription}
            emptyTitle={copy.empty.cancelledTitle}
            onOpen={openBooking}
          />
        </TabsContent>
      </Tabs>
      <BookingSheet booking={selected} onClose={closeSheet} open={open} />
    </>
  );
}
