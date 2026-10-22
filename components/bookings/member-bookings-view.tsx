"use client";

// Bookinger (member, #8; DESIGN.md "Bookinger (member)"): the company's own
// bookings under the admin overview's filter row and column sorting (#9),
// without the admin's own filters — a member sees only their own company.
// Every control writes its change to the URL and the server re-reads the
// set (use-view-params.ts); the rows sort here, as on the admin list.
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  BookingStatusBadge,
  InvoicingStatusBadge,
} from "@/components/bookings/booking-overview";
import { BookingSheet } from "@/components/bookings/booking-sheet";
import { BookingFilterRow } from "@/components/bookings/filter-row";
import { useViewParams } from "@/components/bookings/use-view-params";
import { TablePagination } from "@/components/pagination/table-pagination";
import { useTablePagination } from "@/components/pagination/use-table-pagination";
import { Card, CardFooter } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type MemberViewParams,
  memberViewHref,
} from "@/lib/bookings/member-view-params";
import type { RoomOption } from "@/lib/bookings/room-options";
import { hasListFilters } from "@/lib/bookings/view-params";
import {
  addOnsTotalOre,
  type BookingOverviewRow,
  type BookingOverviewSortKey,
  sortBookingOverview,
} from "@/lib/domain/booking-overview";
import { formatDateTime, formatOre } from "@/lib/format";
import { slicePage } from "@/lib/pagination";
import { columnSortState, type SortDirection } from "@/lib/table-sort";
import { cn } from "@/lib/utils";
import { messages } from "@/messages/da";

const copy = messages.bookings;

function dateAndTime(instant: string): { date: string; time: string } {
  const [date, time] = formatDateTime(instant).split(" ");
  return { date: date ?? "", time: time ?? "" };
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
// and neither badge pushes the other wide. The column leads the table
// (2026-10-16) and sticks while the table scrolls sideways, where the
// booking number used to.
function BookingStatusCell({ booking }: { booking: BookingOverviewRow }) {
  return (
    <TableCell className="sticky left-0 z-10 bg-card">
      <div className="flex flex-col items-start gap-1">
        <BookingStatusBadge status={booking.bookingStatus} />
        <InvoicingStatusBadge status={booking.invoicingStatus} />
      </div>
    </TableCell>
  );
}

// The card is as tall as its content (changed 2026-09-29 from the #81
// fill-the-panel scroll): with pagination the rows fit the page, and a
// list taller than the panel scrolls the panel as before. The table
// region caps at 70vh and scrolls within itself, so the header row stays
// visible while the rows scroll (2026-10-16); the horizontal scroll keeps
// the sticky status column. Rows are separated by 1px
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

interface ColumnDef {
  align?: "right";
  className?: string;
  key: BookingOverviewSortKey;
  label: string;
}

// Every column sorts, as on the admin list; the status badges stay put
// when the table scrolls sideways (2026-10-16: the status column moved
// first and took over the sticky lead from the booking number).
const COLUMNS: ColumnDef[] = [
  {
    // Both axes: the header cell rides the stuck header row's top while its
    // own left-0 holds the column's edge when the table scrolls sideways.
    // Its own muted ground keeps the neighbours' titles from showing
    // through — the thead's background scrolls with the table.
    className: "sticky left-0 top-0 z-10 w-40 bg-muted",
    key: "status",
    label: copy.columns.status,
  },
  { key: "bookingNumber", label: copy.columns.bookingNumber },
  // #112: the extra left padding keeps the room title clear of the
  // booking number; the header and the cells carry the same class so
  // they stay aligned.
  { className: "pl-6", key: "room", label: copy.columns.room },
  { key: "date", label: copy.columns.dateTime },
  { key: "booker", label: copy.columns.booker },
  { align: "right", key: "price", label: copy.columns.price },
  { align: "right", key: "discount", label: copy.columns.discount },
  { align: "right", key: "addOns", label: copy.columns.addOns },
  { align: "right", key: "fee", label: copy.columns.cancellationFee },
];

const SORT_ICONS = {
  asc: ArrowUpIcon,
  desc: ArrowDownIcon,
  none: ArrowUpDownIcon,
} as const;

type SortChange = (sort: BookingOverviewSortKey, dir: SortDirection) => void;

// A column title is the sort button, drawn like the admin list's: the
// arrows show the direction, an idle column sorts ascending first.
function SortableHead({
  column,
  onSort,
  params,
}: {
  column: ColumnDef;
  onSort: SortChange;
  params: MemberViewParams;
}) {
  const state = columnSortState(params.sort === column.key, params.sortDir);
  const Icon = SORT_ICONS[state.direction ?? "none"];
  const toggle = useCallback(
    () => onSort(column.key, state.nextDirection),
    [onSort, column.key, state.nextDirection]
  );

  return (
    <TableHead
      aria-sort={state.ariaSort}
      className={cn(column.className, column.align === "right" && "text-right")}
    >
      <button
        className={cn(
          "inline-flex cursor-pointer items-center gap-1 hover:text-foreground",
          state.direction === null && "text-muted-foreground"
        )}
        onClick={toggle}
        type="button"
      >
        {column.label}
        <Icon aria-hidden="true" className="size-3" />
      </button>
    </TableHead>
  );
}

function BookingRow({
  booking,
  onOpen,
}: {
  booking: BookingOverviewRow;
  onOpen: (booking: BookingOverviewRow) => void;
}) {
  return (
    <TableRow
      className="cursor-pointer"
      tabIndex={0}
      {...openBookingWith(booking, onOpen)}
    >
      <BookingStatusCell booking={booking} />
      <TableCell className="font-mono">{booking.bookingNumber}</TableCell>
      <TableCell className="truncate pl-6 font-medium">
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
    </TableRow>
  );
}

// While the rows re-read, the table keeps its shape, as the admin list
// does: one skeleton row per row on the stale page, at least four, so an
// empty set still shows movement.
function SkeletonRows({ count }: { count: number }) {
  const keys = Array.from(
    { length: Math.max(count, 4) },
    (_, index) => `skeleton-${index}`
  );
  return keys.map((key) => (
    <TableRow className="h-12" key={key}>
      {COLUMNS.map((column) => (
        <TableCell key={column.key}>
          <Skeleton
            className={cn("h-4 w-3/4", column.align === "right" && "ml-auto")}
          />
        </TableCell>
      ))}
    </TableRow>
  ));
}

function BookingTableBody({
  loading,
  onOpen,
  rows,
}: {
  loading: boolean;
  onOpen: (booking: BookingOverviewRow) => void;
  rows: BookingOverviewRow[];
}) {
  return (
    <TableBody>
      {loading ? (
        <SkeletonRows count={rows.length} />
      ) : (
        rows.map((booking) => (
          <BookingRow
            booking={booking}
            key={booking.bookingId}
            onOpen={onOpen}
          />
        ))
      )}
    </TableBody>
  );
}

function BookingTable({
  bookings,
  loading,
  onOpen,
  onSort,
  params,
}: {
  bookings: BookingOverviewRow[];
  loading: boolean;
  onOpen: (booking: BookingOverviewRow) => void;
  onSort: SortChange;
  params: MemberViewParams;
}) {
  const paged = useTablePagination(bookings.length);
  const sorted = useMemo(
    () => sortBookingOverview(bookings, params.sort, params.sortDir),
    [bookings, params.sort, params.sortDir]
  );
  const rows = slicePage(sorted, paged.page, paged.pageSize);

  return (
    <Card className="min-w-0 gap-0 py-0">
      {/* table-fixed: the columns between the first and the last share the
          remaining width evenly, and the min-width keeps the table wide
          enough for its nowrap headers — the card scrolls it sideways when
          the screen narrows (DESIGN.md "Components"). */}
      <Table aria-busy={loading} className="min-w-[88rem] table-fixed" sticky>
        <TableCaption className="sr-only">{copy.tableCaption}</TableCaption>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => (
              <SortableHead
                column={column}
                key={column.key}
                onSort={onSort}
                params={params}
              />
            ))}
          </TableRow>
        </TableHeader>
        <BookingTableBody loading={loading} onOpen={onOpen} rows={rows} />
      </Table>
      <CardFooter className="px-2 py-1">
        {/* The note owns its own line flush right above the footer line
            (2026-10-16); the footer spreads the rows-per-page field and the
            pager. */}
        <TablePagination
          note={copy.allPricesExclVat}
          paged={paged}
          totalItems={bookings.length}
        />
      </CardFooter>
    </Card>
  );
}

// Nothing to list: the company has no bookings yet, or the filter row
// narrowed the list to nothing.
function BookingEmptyState({ filtered }: { filtered: boolean }) {
  return (
    <Card className="py-0">
      <Empty className="border-0 py-16">
        <EmptyHeader>
          <EmptyTitle>{copy.empty.allTitle}</EmptyTitle>
          <EmptyDescription>
            {filtered
              ? copy.empty.filteredDescription
              : copy.empty.allDescription}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Card>
  );
}

// One sheet for the whole overview: the row a click or keyboard landed on,
// or on arrival the row the mail link names (#88) — an id that is not one
// of the listed rows opens nothing. After a cancel the row re-reads on
// refresh, so the sheet closes to a fresh table. While a filter or sort
// re-reads, the table shows skeletons and the empty state waits.
export function BookingOverview({
  bookings,
  initialBookingId,
  params,
  rooms,
}: {
  bookings: BookingOverviewRow[];
  initialBookingId?: string;
  params: MemberViewParams;
  rooms: RoomOption[];
}) {
  const { loading, replace, update, view } = useViewParams(
    params,
    memberViewHref
  );
  const [selected, setSelected] = useState<BookingOverviewRow | null>(
    () =>
      bookings.find((booking) => booking.bookingId === initialBookingId) ?? null
  );
  const [open, setOpen] = useState(() => selected !== null);
  const openBooking = useCallback((booking: BookingOverviewRow) => {
    setSelected(booking);
    setOpen(true);
  }, []);
  const closeSheet = useCallback(() => setOpen(false), []);

  // The reset clears the filters and keeps the sort, as on the admin page.
  const resetFilters = useCallback(() => {
    replace({
      ...params,
      bookingStates: [],
      invoicingStatuses: [],
      periodFrom: undefined,
      periodTo: undefined,
      roomIds: [],
    });
  }, [params, replace]);
  const sortBy = useCallback<SortChange>(
    (sort, sortDir) => update({ sort, sortDir }),
    [update]
  );

  return (
    <>
      <BookingFilterRow
        onChange={update}
        onReset={resetFilters}
        rooms={rooms}
        value={view}
      />
      {bookings.length === 0 && !loading ? (
        <BookingEmptyState filtered={hasListFilters(view)} />
      ) : (
        <BookingTable
          bookings={bookings}
          loading={loading}
          onOpen={openBooking}
          onSort={sortBy}
          params={view}
        />
      )}
      <BookingSheet booking={selected} onClose={closeSheet} open={open} />
    </>
  );
}
