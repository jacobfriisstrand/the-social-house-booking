"use client";

// The admin calendar (#9): the day view is the day grid from Hjem
// (components/day-grid/day-grid.tsx) with its sheets and booking dialog;
// the week and month views are the compact grid — one cell per date, each
// holding its blocks in start order, a booking in primary and a House
// Event in info, the same colour code as the day grid. A block opens the
// same entry sheet. The arrows and the date picker live in the shared
// filter row, so a navigation moves the list's period too.
import { useCallback, useState } from "react";
import { DayGrid } from "@/components/day-grid/day-grid";
import { EntrySheet } from "@/components/day-grid/entry-sheet";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminCalendarCell } from "@/lib/bookings/admin-calendar";
import { weekdayIndexMondayFirst } from "@/lib/domain/periods";
import { formatDateString } from "@/lib/format";
import type { GridEntryView } from "@/lib/notice-board/view";
import { cn } from "@/lib/utils";
import { messages } from "@/messages/da";
import type { AdminCalendarModel } from "./admin-bookings-view";

const copy = messages.bookings.admin;

function Legend() {
  return (
    <div className="flex items-center gap-4 text-muted-foreground text-xs">
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-2.5 rounded-full bg-primary" />
        {copy.calendar.legendBooking}
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-2.5 rounded-full bg-info" />
        {copy.calendar.legendHouseEvent}
      </span>
    </div>
  );
}

const BLOCK_CLASS =
  "flex w-full cursor-pointer flex-col items-start overflow-hidden rounded-md border px-1.5 py-1 text-left";
const BLOCK_BOOKING = "border-chart-2 bg-primary text-primary-foreground";
const BLOCK_EVENT = "border-info bg-info text-info-foreground";

function EntryButton({
  block,
  onOpen,
  showTime,
}: {
  block: { key: string; view: GridEntryView };
  onOpen: (view: GridEntryView) => void;
  showTime: boolean;
}) {
  const open = useCallback(() => onOpen(block.view), [block.view, onOpen]);
  return (
    <button
      aria-label={block.view.ariaLabel}
      className={cn(
        BLOCK_CLASS,
        block.view.kind === "booking" ? BLOCK_BOOKING : BLOCK_EVENT
      )}
      onClick={open}
      type="button"
    >
      <span className="w-full truncate font-medium text-xs">
        {block.view.name}
      </span>
      {showTime ? (
        <span className="w-full truncate text-xs tabular-nums">
          {block.view.time}
        </span>
      ) : null}
    </button>
  );
}

const WEEKDAY_LABELS = messages.rooms.weekdays;

function CellHead({ date, weekView }: { date: string; weekView: boolean }) {
  // The month grid starts on a Monday, so every column is one weekday;
  // its short form ("ma", "ti" …) is the column header, the date the cell
  // body's number. A week's columns carry the full weekday and date.
  const weekday = WEEKDAY_LABELS[weekdayIndexMondayFirst(date)];
  return weekView ? (
    <>
      <span className="block font-medium">{weekday}</span>
      <span className="block text-muted-foreground text-xs">
        {formatDateString(date)}
      </span>
    </>
  ) : (
    <span className="block font-medium">
      {weekday.slice(0, 2).toLowerCase()}
    </span>
  );
}

// The compact grid: one column per date (week) or the six-week month grid.
// A table so screen readers move through it by date, like the day grid.
function CompactGrid({
  cells,
  onOpen,
  weekView,
}: {
  cells: AdminCalendarCell[];
  onOpen: (view: GridEntryView) => void;
  weekView: boolean;
}) {
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {/* The month grid starts on a Monday, so its first seven columns
              are one weekday each; a week shows all its dates. */}
          {cells.slice(0, weekView ? cells.length : 7).map((cell) => (
            <TableHead
              className="h-12 border-l text-center font-normal first:border-l-0"
              key={cell.date}
              scope="col"
            >
              <CellHead date={cell.date} weekView={weekView} />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {weekView ? (
          <TableRow
            className="h-40 align-top hover:bg-transparent"
            key={cells.at(0)?.date}
          >
            {cells.map((cell) => (
              <TableCell
                className="border-l p-1 align-top first:border-l-0"
                key={cell.date}
              >
                <div className="flex flex-col gap-1">
                  {cell.blocks.map((block) => (
                    <EntryButton
                      block={block}
                      key={block.key}
                      onOpen={onOpen}
                      showTime
                    />
                  ))}
                </div>
              </TableCell>
            ))}
          </TableRow>
        ) : (
          // The month grid flows its 42 cells into six rows of seven,
          // keyed by the row's first date.
          Array.from({ length: 6 }, (_, row) => (
            <TableRow
              className="h-28 align-top hover:bg-transparent"
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
                  <div className="flex flex-col gap-1">
                    {cell.blocks.map((block) => (
                      <EntryButton
                        block={block}
                        key={block.key}
                        onOpen={onOpen}
                        showTime={false}
                      />
                    ))}
                  </div>
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

export function AdminCalendarGrid({
  calendar,
}: {
  calendar: AdminCalendarModel;
}) {
  const [openEntry, setOpenEntry] = useState<GridEntryView | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const onOpen = useCallback((view: GridEntryView) => {
    setOpenEntry(view);
    setSheetOpen(true);
  }, []);

  if (calendar.kind === "day") {
    return (
      <>
        <Legend />
        <DayGrid
          columns={calendar.grid.columns}
          date={calendar.date}
          dateLabel={formatDateString(calendar.date)}
          entries={calendar.grid.entries}
          rows={calendar.grid.rows}
          viewer={calendar.viewer}
        />
      </>
    );
  }

  return (
    <>
      <Legend />
      <Card className="gap-0 overflow-x-auto py-0">
        <div
          className={
            calendar.kind === "month" ? "min-w-[56rem]" : "min-w-[44rem]"
          }
        >
          <CompactGrid
            cells={calendar.cells}
            onOpen={onOpen}
            weekView={calendar.kind === "week"}
          />
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
