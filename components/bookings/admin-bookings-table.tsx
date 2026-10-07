"use client";

// Bookinger (admin), the invoicing list (#9, DESIGN.md "Bookinger
// (admin)"): one booking per row with its snapshot numbers, House Events
// as "Ikke fakturerbar" rows, a totals row for the filtered set, sortable
// columns, and the bulk mark — "Markér som faktureret" with the invoice
// date and number, or "Ikke fakturerbar". Only ended, still un-invoiced
// rows enable the bulk actions; the server and the database re-check.
// Amounts integer øre, excl. VAT (ADR-0019, ADR-0020).
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { BookingEditSheet } from "@/components/bookings/booking-edit-sheet";
import {
  BookingStatusBadge,
  InvoicingStatusBadge,
} from "@/components/bookings/booking-overview";
import { MarkInvoicedDialog } from "@/components/bookings/mark-invoiced-dialog";
import { TablePagination } from "@/components/pagination/table-pagination";
import { useTablePagination } from "@/components/pagination/use-table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type AdminViewParams,
  adminViewHref,
} from "@/lib/bookings/admin-view-params";
import { markBookingsNotInvoicable } from "@/lib/bookings/invoicing-actions";
import {
  type AdminOverviewRow,
  type AdminSortKey,
  adminRowParts,
  adminTotals,
  bookingIsInvoicable,
  bookingNotInvoicableReason,
  breakdownAdminRows,
  sortAdminRows,
} from "@/lib/domain/admin-bookings";
import {
  formatDate,
  formatDateString,
  formatHours,
  formatOre,
  formatTime,
} from "@/lib/format";
import { slicePage } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { messages } from "@/messages/da";

const copy = messages.bookings.admin;
const bookingsCopy = messages.bookings;

const NONE = "-";

interface ColumnDef {
  align?: "right";
  key: AdminSortKey;
  label: string;
}

// The columns between the first and the last share the width evenly
// (table-fixed); every money column is right-aligned (DESIGN.md
// "Components").
const COLUMNS: ColumnDef[] = [
  { key: "bookingNumber", label: bookingsCopy.columns.bookingNumber },
  { key: "company", label: copy.columns.company },
  { key: "room", label: bookingsCopy.columns.room },
  { key: "date", label: bookingsCopy.columns.dateTime },
  { align: "right", key: "hours", label: copy.columns.hours },
  { align: "right", key: "roomPrice", label: copy.columns.roomRent },
  { align: "right", key: "discount", label: copy.columns.discount },
  {
    align: "right",
    key: "memberPrice",
    label: copy.columns.roomRentAfterDiscount,
  },
  { align: "right", key: "addOns", label: bookingsCopy.columns.addOns },
  {
    align: "right",
    key: "fee",
    label: bookingsCopy.columns.cancellationFee,
  },
  { align: "right", key: "manualAmounts", label: copy.columns.manualAmounts },
  { align: "right", key: "total", label: copy.columns.total },
  { key: "status", label: bookingsCopy.columns.status },
];

function SortHead({
  column,
  params,
}: {
  column: ColumnDef;
  params: AdminViewParams;
}) {
  const router = useRouter();
  const active = params.sort === column.key;
  const nextDir = active && params.sortDir === "asc" ? "desc" : "asc";
  const toggle = useCallback(() => {
    router.push(adminViewHref(params, { sort: column.key, sortDir: nextDir }));
  }, [router, params, column.key, nextDir]);
  let Icon = ArrowUpDownIcon;
  if (active) {
    Icon = params.sortDir === "asc" ? ArrowUpIcon : ArrowDownIcon;
  }
  let ariaSort: "ascending" | "descending" | undefined;
  if (active) {
    ariaSort = params.sortDir === "asc" ? "ascending" : "descending";
  }

  return (
    <TableHead
      aria-sort={ariaSort}
      className={cn(column.align === "right" && "text-right")}
    >
      <button
        className={cn(
          "inline-flex cursor-pointer items-center gap-1 hover:text-foreground",
          !active && "text-muted-foreground"
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

function HouseEventRow({
  entry,
}: {
  entry: AdminOverviewRow & { kind: "house_event" };
}) {
  const { row } = entry;
  return (
    <TableRow>
      <TableCell>
        <span className="text-muted-foreground">{NONE}</span>
      </TableCell>
      <TableCell className="truncate font-medium">
        {copy.houseEventRow.company}
      </TableCell>
      <TableCell className="truncate">{row.roomNames.join(", ")}</TableCell>
      <TableCell className="tabular-nums">
        <span className="block">{formatDate(row.startAt)}</span>
        <span className="block text-muted-foreground text-xs">
          {formatTime(row.startAt)} - {formatTime(row.endAt)}
        </span>
      </TableCell>
      {COLUMNS.slice(4, 12).map((column) => (
        <TableCell className="text-right tabular-nums" key={column.key}>
          <span className="text-muted-foreground">{NONE}</span>
        </TableCell>
      ))}
      <TableCell>
        <div className="flex flex-col items-start gap-1">
          <Badge variant="info">
            {row.title ?? messages.home.houseEventBadge}
          </Badge>
          <InvoicingStatusBadge status="not_invoicable" />
        </div>
      </TableCell>
      <TableCell />
    </TableRow>
  );
}

function BookingRow({
  entry,
  now,
  selected,
  toggle,
}: {
  entry: AdminOverviewRow & { kind: "booking" };
  now: Date;
  selected: boolean;
  toggle: (bookingId: string) => void;
}) {
  const { row } = entry;
  const parts = adminRowParts(row);
  // Why the row cannot be picked: already invoiced/not invoicable, or the
  // booking has not ended yet — an X with a tooltip instead of a checkbox.
  const reason = bookingNotInvoicableReason(row, now);
  const onToggle = useCallback(
    () => toggle(row.bookingId),
    [toggle, row.bookingId]
  );
  const checkbox = (
    <Checkbox
      aria-label={copy.selection.selectRow(row.bookingNumber)}
      checked={selected}
      onCheckedChange={onToggle}
    />
  );
  const invoicedLine =
    row.invoicingStatus === "invoiced" && row.invoiceDate
      ? `${formatDateString(row.invoiceDate)}${row.invoiceNumber ? ` · ${row.invoiceNumber}` : ""}`
      : null;

  return (
    <TableRow>
      <TableCell>
        {reason === null ? (
          checkbox
        ) : (
          <Tooltip>
            <TooltipTrigger
              aria-label={copy.selection.reasons[reason]}
              render={<span className="inline-flex" role="img" />}
            >
              <XIcon aria-hidden className="size-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>{copy.selection.reasons[reason]}</TooltipContent>
          </Tooltip>
        )}
      </TableCell>
      <TableCell className="font-mono">{row.bookingNumber}</TableCell>
      <TableCell className="truncate font-medium">{row.companyName}</TableCell>
      <TableCell className="truncate">{row.roomName}</TableCell>
      <TableCell className="tabular-nums">
        <span className="block">{formatDate(row.startAt)}</span>
        <span className="block text-muted-foreground text-xs">
          {formatTime(row.startAt)} - {formatTime(row.endAt)}
        </span>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {parts.minutes === null ? NONE : formatHours(parts.minutes)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {parts.roomPriceOre === null ? NONE : formatOre(parts.roomPriceOre)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {row.bookingStatus === "cancelled" || row.discountPercent === 0
          ? bookingsCopy.noDiscount
          : `${row.discountPercent} %`}
      </TableCell>
      <TableCell className="text-right font-medium tabular-nums">
        {parts.memberPriceOre === null ? NONE : formatOre(parts.memberPriceOre)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {parts.addOnsOre === null || parts.addOnsOre === 0
          ? NONE
          : formatOre(parts.addOnsOre)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {parts.feeOre === 0 ? NONE : formatOre(parts.feeOre)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {row.manualAmounts.length === 0
          ? copy.manualAmounts.none
          : formatOre(row.manualAmountsOre)}
      </TableCell>
      <TableCell className="text-right font-medium tabular-nums">
        {formatOre(parts.basisOre)}
      </TableCell>
      <TableCell>
        <div className="flex flex-col items-start gap-1">
          <InvoicingStatusBadge status={row.invoicingStatus} />
          {row.bookingStatus === "cancelled" ? (
            <BookingStatusBadge status={row.bookingStatus} />
          ) : null}
          {invoicedLine ? (
            <span className="text-muted-foreground text-xs">
              {invoicedLine}
            </span>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-right">
        {/* A manual amount documents a held meeting (#16), so a cancelled
            booking — cancelled before it began, its basis the fee alone —
            gets no edit button: the sheet's first setting has nothing to
            offer it. */}
        {row.bookingStatus === "cancelled" ? null : (
          <BookingEditSheet
            bookingId={row.bookingId}
            bookingNumber={row.bookingNumber}
            manualAmounts={row.manualAmounts}
          />
        )}
      </TableCell>
    </TableRow>
  );
}

function Breakdown({
  entries,
  title,
}: {
  entries: Array<{
    bookingCount: number;
    label: string;
    minutes: number;
    basisOre: number;
  }>;
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

export function AdminBookingsTable({
  params,
  rows,
}: {
  params: AdminViewParams;
  rows: AdminOverviewRow[];
}) {
  const router = useRouter();
  const now = useMemo(() => new Date(), []);
  const paged = useTablePagination(rows.length);

  const sorted = useMemo(
    () => sortAdminRows(rows, params.sort, params.sortDir),
    [rows, params.sort, params.sortDir]
  );
  const visible = slicePage(sorted, paged.page, paged.pageSize);
  const totals = useMemo(() => adminTotals(rows), [rows]);
  const byCompany = useMemo(() => breakdownAdminRows(rows, "company"), [rows]);
  const byRoom = useMemo(() => breakdownAdminRows(rows, "room"), [rows]);

  // The selection holds booking ids; a fresh row set (a filter, a mark, a
  // period change) starts a new selection. The trigger is the id list, not
  // the rows identity: a sort re-reads the same rows and must keep the
  // ticks. The reset runs at render time when the key changes — React's
  // documented pattern for resetting state on a prop change.
  const rowKey = rows
    .map((entry) =>
      entry.kind === "booking" ? entry.row.bookingId : entry.row.houseEventId
    )
    .join("\n");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [keyRead, setKeyRead] = useState(rowKey);
  if (rowKey !== keyRead) {
    setKeyRead(rowKey);
    setSelected(new Set());
  }

  // Only rows the action accepts participate: ended and still un-invoiced.
  const selectable = useMemo(
    () =>
      sorted.filter(
        (entry): entry is AdminOverviewRow & { kind: "booking" } =>
          entry.kind === "booking" && bookingIsInvoicable(entry.row, now)
      ),
    [sorted, now]
  );
  const allSelected =
    selectable.length > 0 &&
    selectable.every((entry) => selected.has(entry.row.bookingId));
  const someSelected = selectable.some((entry) =>
    selected.has(entry.row.bookingId)
  );

  const toggle = useCallback((bookingId: string): void => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(bookingId)) {
        next.delete(bookingId);
      } else {
        next.add(bookingId);
      }
      return next;
    });
  }, []);
  const toggleAll = useCallback((): void => {
    setSelected(() =>
      allSelected
        ? new Set()
        : new Set(selectable.map((entry) => entry.row.bookingId))
    );
  }, [allSelected, selectable]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [refusing, startRefusing] = useTransition();
  const refuse = useCallback((): void => {
    startRefusing(async () => {
      const result = await markBookingsNotInvoicable([...selected]);
      if (result.status === "success") {
        toast.add({
          title: copy.markInvoiced.notInvoicableSaved,
          type: "success",
        });
        setSelected(new Set());
        router.refresh();
        return;
      }
      toast.add({ title: result.error, type: "error" });
    });
  }, [router, selected]);
  const openDialog = useCallback((): void => setDialogOpen(true), []);
  const clearSelection = useCallback((): void => setSelected(new Set()), []);

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

  const selectionCount = selected.size;

  return (
    <div className="flex flex-col gap-6">
      {/* The bulk action bar (#9): the page's primary button, enabled when
          every selected row is ended and un-invoiced. */}
      <Card className="flex-row flex-wrap items-center justify-between gap-3 p-3">
        <p className="text-sm">
          {selectionCount === 0
            ? copy.selection.none
            : copy.selection.selected(selectionCount)}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={selectionCount === 0 || refusing}
            onClick={refuse}
            size="sm"
            type="button"
            variant="outline"
          >
            {copy.markInvoiced.notInvoicableButton}
          </Button>
          <Button
            disabled={selectionCount === 0 || refusing}
            onClick={openDialog}
            size="sm"
            type="button"
          >
            {copy.markInvoiced.button}
          </Button>
        </div>
      </Card>

      <Card className="min-w-0 gap-0 py-0">
        <Table className="min-w-[92rem] table-fixed">
          <TableCaption className="sr-only">{copy.tableCaption}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 w-10">
                <Checkbox
                  aria-label={copy.selection.selectAll}
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              {COLUMNS.map((column) => (
                <SortHead column={column} key={column.key} params={params} />
              ))}
              <TableHead className="w-36" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((entry) =>
              entry.kind === "booking" ? (
                <BookingRow
                  entry={entry}
                  key={entry.row.bookingId}
                  now={now}
                  selected={selected.has(entry.row.bookingId)}
                  toggle={toggle}
                />
              ) : (
                <HouseEventRow entry={entry} key={entry.row.houseEventId} />
              )
            )}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-muted/50 font-medium hover:bg-transparent">
              {/* The totals of the filtered set (#9): every column sums
                  down its rows, so the footer is the invoice basis of the
                  period. */}
              <TableCell colSpan={4}>
                {`${copy.totals.basis} (${totals.bookingCount} ${copy.totals.bookings.toLowerCase()})`}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatHours(totals.minutes)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatOre(totals.roomPriceOre)}
              </TableCell>
              <TableCell />
              <TableCell className="text-right tabular-nums">
                {formatOre(totals.memberPriceOre)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {totals.addOnsOre === 0 ? NONE : formatOre(totals.addOnsOre)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {totals.feeOre === 0 ? NONE : formatOre(totals.feeOre)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {totals.manualAmountsOre === 0
                  ? NONE
                  : formatOre(totals.manualAmountsOre)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatOre(totals.basisOre)}
              </TableCell>
              <TableCell
                className="text-right text-muted-foreground text-xs"
                colSpan={2}
              >
                {bookingsCopy.allPricesExclVat}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        <CardFooter className="px-2 py-1">
          <TablePagination
            note={bookingsCopy.allPricesExclVat}
            paged={paged}
            totalItems={rows.length}
          />
        </CardFooter>
      </Card>

      {/* The per-company and per-room breakdowns (#9). */}
      <Card className="gap-4 p-4">
        <CardHeader className="p-0">
          <CardTitle className="text-base">{copy.breakdown.title}</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-6 md:flex-row">
          <Breakdown entries={byCompany} title={copy.breakdown.byCompany} />
          <Breakdown entries={byRoom} title={copy.breakdown.byRoom} />
        </div>
      </Card>

      <MarkInvoicedDialog
        bookingIds={[...selected]}
        onDone={clearSelection}
        onOpenChange={setDialogOpen}
        open={dialogOpen}
      />
    </div>
  );
}
