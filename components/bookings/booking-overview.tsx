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
import type {
  BookingInvoicingStatus,
  BookingOverviewLists,
  BookingOverviewRow,
  BookingOverviewStatus,
} from "@/lib/domain/booking-overview";
import { formatDateTime, formatOre } from "@/lib/format";
import { slicePage } from "@/lib/pagination";
import { messages } from "@/messages/da";

const copy = messages.bookings;

function dateAndTime(instant: string): { date: string; time: string } {
  const [date, time] = formatDateTime(instant).split(" ");
  return { date: date ?? "", time: time ?? "" };
}

function BookingStatusBadge({ status }: { status: BookingOverviewStatus }) {
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

function BookingDateCells({ booking }: { booking: BookingOverviewRow }) {
  const start = dateAndTime(booking.bookingStartAt);
  const end = dateAndTime(booking.endAt);

  return (
    <>
      <TableCell>
        <span className="block tabular-nums">{start.date}</span>
      </TableCell>
      <TableCell className="tabular-nums">
        {start.time} - {end.time}
      </TableCell>
    </>
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

function BookingAddOnsCell({ booking }: { booking: BookingOverviewRow }) {
  if (booking.addOns.length === 0) {
    return <TableCell>{copy.noAddOns}</TableCell>;
  }

  return (
    <TableCell>
      <div className="flex min-w-40 flex-col gap-1">
        {booking.addOns.map((addOn) => (
          <div className="flex justify-between gap-3" key={addOn.addonId}>
            <span className="max-w-44 truncate">
              {addOn.name ?? copy.inactiveAddOn}
              {addOn.quantity > 1 ? ` (${copy.quantity(addOn.quantity)})` : ""}
            </span>
            <span className="shrink-0 tabular-nums">
              {formatOre(addOn.totalOre)}
            </span>
          </div>
        ))}
      </div>
    </TableCell>
  );
}

function BookingStatusCell({ booking }: { booking: BookingOverviewRow }) {
  return (
    <TableCell>
      <div className="flex min-w-36 flex-wrap gap-1">
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
// keeps the sticky booking-number column. Rows and columns are both
// separated by 1px lines in the border token, the near-white hairline
// every other line uses. The header row sits on the table-header ground
// (the panel is already muted, so muted would not read as a header), and
// every title is left-aligned, numeric columns included (2026-09-26 in
// #81).
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
      <Table className="min-w-[78rem] [&_tr]:divide-x">
        <TableCaption className="sr-only">{copy.tableCaption}</TableCaption>
        <TableHeader className="bg-table-header">
          <TableRow>
            <TableHead className="sticky left-0 z-10 w-36 bg-table-header">
              {copy.columns.bookingNumber}
            </TableHead>
            <TableHead>{copy.columns.room}</TableHead>
            <TableHead>{copy.columns.date}</TableHead>
            <TableHead>{copy.columns.time}</TableHead>
            <TableHead>{copy.columns.booker}</TableHead>
            <TableHead>{copy.columns.price}</TableHead>
            <TableHead>{copy.columns.discount}</TableHead>
            <TableHead>{copy.columns.addOns}</TableHead>
            <TableHead>{copy.columns.cancellationFee}</TableHead>
            <TableHead>{copy.columns.status}</TableHead>
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
              <TableCell className="font-medium">{booking.roomName}</TableCell>
              <BookingDateCells booking={booking} />
              <TableCell>{booking.bookerName}</TableCell>
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
      <CardFooter className="flex flex-wrap items-center justify-between gap-2 py-2">
        <TablePagination paged={paged} totalItems={bookings.length} />
        <p className="text-muted-foreground text-xs">{copy.allPricesExclVat}</p>
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
      <Tabs
        className="w-full"
        defaultValue="all"
        onValueChange={handleTabChange}
      >
        <TabsList className="w-full">
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
