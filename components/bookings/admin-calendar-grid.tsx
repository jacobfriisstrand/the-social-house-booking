"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";
// The admin calendar (#9): the month grid — one cell per date, each
// holding its blocks in start order with their company, room and
// timeslot, a booking in primary. A block opens the same entry sheet. The
// stepper and the month name live in the header above the grid.
import { useCallback, useState } from "react";
import { EntrySheet } from "@/components/day-grid/entry-sheet";
import { Card } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  adminViewHref,
  movedPeriod,
  windowAround,
} from "@/lib/bookings/admin-view-params";
import { weekdayIndexMondayFirst } from "@/lib/domain/periods";
import { formatDateString } from "@/lib/format";
import type { GridEntryView } from "@/lib/notice-board/view";
import { cn } from "@/lib/utils";
import { messages } from "@/messages/da";
import type { AdminCalendarModel } from "./admin-bookings-view";

const copy = messages.bookings.admin;

const BLOCK_CLASS =
  "flex w-full shrink-0 cursor-pointer justify-between items-start overflow-hidden rounded-md border px-1.5 py-1 text-left";
const BLOCK_BOOKING = "border-chart-2 bg-primary text-primary-foreground";

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
// move through it by date, like the day grid.
function CompactGrid({
  cells,
  onOpen,
}: {
  cells: AdminCalendarCell[];
  onOpen: (view: GridEntryView) => void;
}) {
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {/* The month grid starts on a Monday, so its first seven columns
              are one weekday each. */}
          {cells.slice(0, 7).map((cell) => (
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
        {/* The month grid flows its 42 cells into six rows of seven,
            keyed by the row's first date. */}
        {Array.from({ length: 6 }, (_, row) => (
          <TableRow
            className="align-top hover:bg-transparent"
            key={cells.at(row * 7)?.date ?? row}
          >
            {cells.slice(row * 7, row * 7 + 7).map((cell) => (
              <TableCell
                className="border-l p-1 align-top first:border-l-0"
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
// purpose). It writes its move to the URL; the server re-reads the month.
function PeriodControl({
  params,
  today,
}: {
  params: AdminViewParams;
  today: string;
}) {
  const router = useRouter();

  const move = useCallback(
    (steps: number) => {
      router.push(adminViewHref(params, movedPeriod(params, steps)));
    },
    [params, router]
  );

  const goToday = useCallback(() => {
    router.push(adminViewHref(params, windowAround(today)));
  }, [params, router, today]);

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
  monthLabel,
  params,
  today,
}: {
  calendar: AdminCalendarModel;
  // The month the period control drives, shown beside the stepper.
  monthLabel: string;
  params: AdminViewParams;
  today: string;
}) {
  const [openEntry, setOpenEntry] = useState<GridEntryView | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const onOpen = useCallback((view: GridEntryView) => {
    setOpenEntry(view);
    setSheetOpen(true);
  }, []);

  return (
    <>
      {/* The calendar's controls in one card, like the filter row: the
          stepper beside the month title; shrink-0 so the panel scrolls
          around the card instead of squeezing the controls. */}
      <Card className="w-fit shrink-0 flex-row flex-wrap items-center gap-3 p-3">
        <div className="flex shrink-0 items-center gap-3">
          <PeriodControl params={params} today={today} />
          <span className="font-medium text-sm">{monthLabel}</span>
        </div>
      </Card>
      {/* shrink-0: the panel is a fixed-height scrolling column; a short
          viewport scrolls the whole grid inside it, the card never
          compacts. */}
      <Card className="shrink-0 gap-0 overflow-x-auto py-0">
        <div className="min-w-[56rem]">
          <CompactGrid cells={calendar.cells} onOpen={onOpen} />
        </div>
      </Card>
      <EntrySheet
        entry={openEntry}
        onOpenChange={setSheetOpen}
        open={sheetOpen}
      />
    </>
  );
}
