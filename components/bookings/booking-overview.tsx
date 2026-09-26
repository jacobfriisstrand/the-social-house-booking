"use client";

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
  return <span className="text-muted-foreground">{copy.status.confirmed}</span>;
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

// The card fills the panel whatever the row count and never outgrows it:
// the rows scroll inside the card, the header row staying at the top and
// the booking number at the left. The "ekskl. moms" line is a card footer
// outside the scrolling table, so it stays on the card's bottom edge and
// never slides off to the right with the columns. The shell and the tabs
// never move (decided 2026-09-23 and 2026-09-26 while reviewing #81).
// Rows and columns are both separated by 1px lines in the border token,
// the near-white hairline every other line uses. The header row sits on
// the table-header ground (the panel is already muted, so muted would
// not read as a header), opaque so nothing shows through it while the
// rows scroll under it, and every title is left-aligned, numeric columns
// included (2026-09-26 in #81).
function BookingTable({ bookings }: { bookings: BookingOverviewRow[] }) {
  return (
    <Card className="min-h-0 min-w-0 flex-1 gap-0 py-0 *:data-[slot=table-container]:grow">
      <Table className="min-w-[78rem] [&_tr]:divide-x">
        <TableCaption className="sr-only">{copy.tableCaption}</TableCaption>
        <TableHeader className="sticky top-0 z-20 bg-table-header">
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
          {bookings.map((booking) => (
            <TableRow key={booking.bookingId}>
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
      <CardFooter className="justify-end py-2 text-muted-foreground text-xs">
        {copy.allPricesExclVat}
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
    <Card className="flex flex-1 flex-col py-0">
      <Empty className="flex-1 border-0 py-16">
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
}: {
  bookings: BookingOverviewRow[];
  emptyDescription: string;
  emptyTitle: string;
}) {
  return bookings.length > 0 ? (
    <BookingTable bookings={bookings} />
  ) : (
    <BookingEmptyState description={emptyDescription} title={emptyTitle} />
  );
}

export function BookingOverview({
  bookings,
}: {
  bookings: BookingOverviewLists<BookingOverviewRow>;
}) {
  return (
    <Tabs className="min-h-0 w-full flex-1" defaultValue="all">
      <TabsList className="w-full">
        <TabsTrigger value="all">{copy.tabs.all}</TabsTrigger>
        <TabsTrigger value="upcoming">{copy.tabs.upcoming}</TabsTrigger>
        <TabsTrigger value="past">{copy.tabs.past}</TabsTrigger>
        <TabsTrigger value="cancelled">{copy.tabs.cancelled}</TabsTrigger>
      </TabsList>
      <TabsContent className="flex min-h-0 flex-col pt-4" value="all">
        <BookingPanel
          bookings={bookings.all}
          emptyDescription={copy.empty.allDescription}
          emptyTitle={copy.empty.allTitle}
        />
      </TabsContent>
      <TabsContent className="flex min-h-0 flex-col pt-4" value="upcoming">
        <BookingPanel
          bookings={bookings.upcoming}
          emptyDescription={copy.empty.upcomingDescription}
          emptyTitle={copy.empty.upcomingTitle}
        />
      </TabsContent>
      <TabsContent className="flex min-h-0 flex-col pt-4" value="past">
        <BookingPanel
          bookings={bookings.past}
          emptyDescription={copy.empty.pastDescription}
          emptyTitle={copy.empty.pastTitle}
        />
      </TabsContent>
      <TabsContent className="flex min-h-0 flex-col pt-4" value="cancelled">
        <BookingPanel
          bookings={bookings.cancelled}
          emptyDescription={copy.empty.cancelledDescription}
          emptyTitle={copy.empty.cancelledTitle}
        />
      </TabsContent>
    </Tabs>
  );
}
