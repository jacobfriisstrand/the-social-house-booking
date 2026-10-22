"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
// The admin calendar (#9): the month grid — one cell per date, each
// holding its blocks in start order with their company, room and
// timeslot, a booking in primary. A block opens the same detail sheet the
// table opens. The stepper and the month name live in the header above
// the grid.
import { useCallback, useState } from "react";
import { useAdminBookingOverlay } from "@/components/bookings/admin-booking-overlay";
import { AdminCancelDialog } from "@/components/bookings/admin-cancel-dialog";
import { BookingDetailSheet } from "@/components/bookings/booking-detail-sheet";
import { Card } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AdminCalendarCell } from "@/lib/bookings/admin-calendar";
import {
  type AdminViewParams,
  movedPeriod,
  windowAround,
} from "@/lib/bookings/admin-view-params";
import type { AdminBookingRow } from "@/lib/domain/admin-bookings";
import { weekdayIndexMondayFirst } from "@/lib/domain/periods";
import { formatDateString } from "@/lib/format";
import type { GridEntryView } from "@/lib/notice-board/view";
import { cn } from "@/lib/utils";
import { messages } from "@/messages/da";
import type { AdminCalendarModel } from "./admin-bookings-view";

const copy = messages.bookings.admin;

// The loading month's static placeholders: six skeleton rows of seven,
// stable string keys, never reordered.
const SKELETON_ROWS = Array.from(
  { length: 6 },
  (_, index) => `skeleton-row-${index}`
);
const SKELETON_COLUMNS = Array.from(
  { length: 7 },
  (_, index) => `skeleton-column-${index}`
);

const BLOCK_CLASS =
  "flex w-full shrink-0 cursor-pointer justify-between items-start overflow-hidden rounded-md border px-1.5 py-1 text-left";
const BLOCK_BOOKING = "border-chart-2 bg-primary text-primary-foreground";
// The skeleton month renders without a model: a switch from the list
// arrives with no cells.
const NO_CELLS: AdminCalendarCell[] = [];

function EntryButton({
  block,
  onOpen,
}: {
  block: { key: string; view: GridEntryView };
  onOpen: (view: GridEntryView) => void;
}) {
  const open = useCallback(() => onOpen(block.view), [block.view, onOpen]);
  return (
    // Room and time only; the tooltip carries the company's name and the
    // full text is the accessible label and the entry sheet.
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            aria-label={block.view.ariaLabel}
            className={cn(BLOCK_CLASS, BLOCK_BOOKING)}
            onClick={open}
            type="button"
          >
            <span className="truncate text-xs">{block.view.roomName}</span>
            <span className="truncate text-xs tabular-nums">
              {block.view.time}
            </span>
          </button>
        }
      />
      <TooltipContent>{block.view.name}</TooltipContent>
    </Tooltip>
  );
}

const WEEKDAY_LABELS = messages.rooms.weekdays;

function CellHead({ date }: { date: string }) {
  // The month grid starts on a Monday, so every column is one weekday;
  // its short form ("ma", "ti" …) is the column header.
  const weekday = WEEKDAY_LABELS[weekdayIndexMondayFirst(date)];
  return (
    <span className="block font-medium">
      {weekday.slice(0, 2).toLowerCase()}
    </span>
  );
}

// The fixed-height block area shows the day's first five entries; the
// "+N flere" expander opens exactly the entries the cell does not show —
// the remainder, in start order — and every row opens the same entry
// sheet a block would.
const BLOCKS_SHOWN = 5;

// The "+N flere" expander under a full cell.
function DayEntriesPopover({
  cell,
  onOpen,
}: {
  cell: AdminCalendarCell;
  onOpen: (view: GridEntryView) => void;
}) {
  const [open, setOpen] = useState(false);
  const hidden = cell.blocks.slice(BLOCKS_SHOWN);
  const openEntry = useCallback(
    (view: GridEntryView): void => {
      setOpen(false);
      onOpen(view);
    },
    [onOpen]
  );
  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <button
            aria-label={copy.calendar.showHiddenOn(formatDateString(cell.date))}
            className="flex w-full cursor-pointer items-center justify-center rounded-md px-1 py-0.5 text-muted-foreground text-xs hover:bg-accent hover:text-foreground"
            type="button"
          />
        }
      >
        +{copy.calendar.more(hidden.length)}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <p className="border-b px-3 py-2 font-medium text-sm">
          {formatDateString(cell.date)}
        </p>
        <div className="flex max-h-80 flex-col gap-1 overflow-y-auto p-1">
          {hidden.map((block) => (
            <EntryButton block={block} key={block.key} onOpen={openEntry} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// The compact grid: the six-week month grid. A table so screen readers
// move through it by date, like the day grid. While the month re-reads,
// the body is six skeleton rows of seven — the same cell shape, no stale
// blocks; the weekday header stays.
function CompactGrid({
  cells,
  loading,
  onOpen,
  today,
}: {
  cells: AdminCalendarCell[];
  loading: boolean;
  onOpen: (view: GridEntryView) => void;
  today: string;
}) {
  return (
    <Table aria-busy={loading} className="table-fixed">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {/* The month grid starts on a Monday, so its first seven columns
              are one weekday each. While the month re-reads — a switch
              from the list arrives with no cells at all — the seven
              headers are static. */}
          {loading
            ? WEEKDAY_LABELS.map((weekday) => (
                <TableHead
                  className="h-12 border-l text-center font-normal first:border-l-0"
                  key={weekday}
                  scope="col"
                >
                  <span className="block font-medium">
                    {weekday.slice(0, 2).toLowerCase()}
                  </span>
                </TableHead>
              ))
            : cells.slice(0, 7).map((cell) => (
                <TableHead
                  className="h-12 border-l text-center font-normal first:border-l-0"
                  key={cell.date}
                  scope="col"
                >
                  <CellHead date={cell.date} />
                </TableHead>
              ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading
          ? // The month re-reads: six skeleton rows of seven, no stale
            // blocks. Static placeholders — stable string keys, never
            // reordered.
            SKELETON_ROWS.map((rowKey) => (
              <TableRow className="align-top hover:bg-transparent" key={rowKey}>
                {SKELETON_COLUMNS.map((columnKey) => (
                  <TableCell
                    className="border-l p-1 align-top first:border-l-0"
                    key={columnKey}
                  >
                    <Skeleton className="mb-1 h-3 w-6" />
                    <div className="flex h-[10rem] flex-col gap-1">
                      <Skeleton className="h-8" />
                      <Skeleton className="h-8" />
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))
          : // The month grid flows its 42 cells into six rows of seven,
            // keyed by the row's first date.
            Array.from({ length: 6 }, (_, row) => (
              <TableRow
                className="align-top hover:bg-transparent"
                key={cells.at(row * 7)?.date ?? row}
              >
                {cells.slice(row * 7, row * 7 + 7).map((cell) => (
                  <TableCell
                    className={cn(
                      "border-l p-1 align-top first:border-l-0",
                      cell.date === today && "bg-primary/50"
                    )}
                    key={cell.date}
                  >
                    <span className="block px-1 pb-1 text-muted-foreground text-xs tabular-nums">
                      {Number(cell.date.slice(-2))}
                    </span>
                    {/* The fixed-height block area keeps every cell the same size and
                      shows the day's first five entries; the expander below
                      opens the whole day, so nothing behind the clip is
                      unreachable. */}
                    <div className="flex h-[10rem] flex-col gap-1 overflow-hidden">
                      {cell.blocks.slice(0, BLOCKS_SHOWN).map((block) => (
                        <EntryButton
                          block={block}
                          key={block.key}
                          onOpen={onOpen}
                        />
                      ))}
                    </div>
                    {cell.blocks.length > BLOCKS_SHOWN ? (
                      <DayEntriesPopover cell={cell} onOpen={onOpen} />
                    ) : null}
                  </TableCell>
                ))}
              </TableRow>
            ))}
      </TableBody>
    </Table>
  );
}

// The stepper the calendar header hosts: forrige / denne måned / næste,
// momentary actions, never a latched selection (the group stays empty on
// purpose). It writes its move to the URL through the view's transition,
// so the grid shows skeleton cells while the server re-reads the month.
function PeriodControl({
  onPeriodChange,
  params,
  today,
}: {
  onPeriodChange: (changes: Partial<AdminViewParams>) => void;
  params: AdminViewParams;
  today: string;
}) {
  const move = useCallback(
    (steps: number) => {
      onPeriodChange(movedPeriod(params, steps));
    },
    [onPeriodChange, params]
  );

  const goToday = useCallback(() => {
    onPeriodChange(windowAround(today));
  }, [onPeriodChange, today]);

  const moveBack = useCallback(() => move(-1), [move]);
  const moveForward = useCallback(() => move(1), [move]);

  return (
    <ToggleGroup spacing={0} value={[]} variant="outline">
      <ToggleGroupItem
        aria-label={copy.filters.previous}
        onClick={moveBack}
        value="previous"
      >
        <ChevronLeftIcon aria-hidden="true" />
      </ToggleGroupItem>
      <ToggleGroupItem onClick={goToday} value="today">
        {copy.filters.thisMonth}
      </ToggleGroupItem>
      <ToggleGroupItem
        aria-label={copy.filters.next}
        onClick={moveForward}
        value="next"
      >
        <ChevronRightIcon aria-hidden="true" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

export function AdminCalendarGrid({
  calendar,
  loading,
  monthLabel,
  onPeriodChange,
  params,
  rows,
  today,
}: {
  // Null while a switch from the list is still loading — the skeleton
  // body and the static weekday headers render without it.
  calendar: AdminCalendarModel | null;
  // True while a filter or period change re-reads the month: the grid's
  // body shows skeleton cells instead of the stale month.
  loading: boolean;
  // The month the period control drives, shown beside the stepper.
  monthLabel: string;
  // The view's URL write: one transition for the whole overview, so the
  // skeletons and the accumulated params live in one place.
  onPeriodChange: (changes: Partial<AdminViewParams>) => void;
  params: AdminViewParams;
  // The rows behind the month's entries: a click opens the same detail
  // sheet the table opens, fed with the same AdminBookingRow.
  rows: AdminBookingRow[];
  today: string;
}) {
  // The sheet pair reads the rows through the shared hook (#153): which
  // sheet is open for which Booking, the row behind it, the cancel
  // confirm picked from the sheet's foot. A close keeps the picked row
  // so the exit animation plays over it — the table's own overlay
  // pattern.
  const {
    cancelRow,
    closeCancel,
    closeOverlay,
    detailOpen,
    detailRow,
    openCancel,
    openDetail,
  } = useAdminBookingOverlay(rows);
  const onOpen = useCallback(
    (view: GridEntryView) => openDetail(view.id),
    [openDetail]
  );

  return (
    <>
      {/* The calendar's controls in one card, like the filter row: the
          stepper beside the month title; shrink-0 so the panel scrolls
          around the card instead of squeezing the controls. */}
      <Card className="w-fit shrink-0 flex-row flex-wrap items-center gap-3 p-3">
        <div className="flex shrink-0 items-center gap-3">
          <PeriodControl
            onPeriodChange={onPeriodChange}
            params={params}
            today={today}
          />
          <span className="font-medium text-sm">{monthLabel}</span>
        </div>
      </Card>
      {/* shrink-0: the panel is a fixed-height scrolling column; a short
          viewport scrolls the whole grid inside it, the card never
          compacts. */}
      <Card className="shrink-0 gap-0 overflow-x-auto py-0">
        {/* The skeleton is silent; the status line announces the wait, the
            same words the day grid's spinner carries. */}
        {loading ? (
          <p className="sr-only" role="status">
            {messages.common.loading}
          </p>
        ) : null}
        <div className="min-w-[56rem]">
          <CompactGrid
            cells={calendar?.cells ?? NO_CELLS}
            loading={loading}
            onOpen={onOpen}
            today={today}
          />
        </div>
      </Card>
      <BookingDetailSheet
        onCancel={openCancel}
        onOpenChange={closeOverlay}
        open={detailOpen}
        row={detailRow}
      />
      {cancelRow ? (
        <AdminCancelDialog onClose={closeCancel} row={cancelRow} />
      ) : null}
    </>
  );
}
