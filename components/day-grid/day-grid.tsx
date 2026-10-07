"use client";

// The day grid (DESIGN.md "Day grid", ADR-0022), the same for admin and
// members: 30-minute rows from 09:00 to 22:00, one column per room. A
// booking is a primary block, a House Event an info block, the buffer a
// muted block with no text. A block opens its sheet; a free slot opens the
// booking dialog with room, date and start filled in. It is a table: a
// block is a cell spanning its rows, so screen readers move through it by
// room and time. Every cell is placed on the server
// (lib/domain/day-grid.ts); this component only renders and holds which
// sheet or dialog is open.
import { useCallback, useState } from "react";
import { BookingDialog } from "@/components/bookings/booking-dialog";
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
import type { BookingViewer } from "@/lib/bookings/viewer";
import {
  GRID_END_MINUTES,
  GRID_START_MINUTES,
} from "@/lib/domain/availability";
import { SLOT_MINUTES } from "@/lib/domain/booking-window";
import type { GridCell, PlacedCell } from "@/lib/domain/day-grid";
import type { CurrentTerms } from "@/lib/domain/terms";
import { timeOptions } from "@/lib/domain/time";
import type { DayGridColumn } from "@/lib/notice-board/grid";
import type { GridEntryView } from "@/lib/notice-board/view";
import { cn } from "@/lib/utils";
import { messages } from "@/messages/da";

const copy = messages.home;

interface BookingTarget {
  column: number;
  start: string;
}

// One label per row: 09:00, 09:30 … 21:30.
const ROW_LABELS = timeOptions(
  SLOT_MINUTES,
  GRID_START_MINUTES,
  GRID_END_MINUTES - SLOT_MINUTES
);

// The grid's rows keep their height and never highlight (DESIGN.md: no
// hover effects beyond the cursor).
const ROW_CLASS = "h-9 hover:bg-transparent";
// A block fills its cell, spanned rows included, with a small inset.
const BLOCK_CELL_CLASS = "relative border-l p-0";
const BLOCK_CLASS = "absolute inset-0.5 rounded-lg border";

function RoomHeader({ column }: { column: DayGridColumn }) {
  return (
    <TableHead
      className="h-14 whitespace-normal border-l px-2 text-center font-normal"
      scope="col"
    >
      <span className="block">{column.room.name}</span>
      {column.status ? (
        <span className="block text-muted-foreground text-xs">
          {column.status}
        </span>
      ) : null}
    </TableHead>
  );
}

function EntryCell({
  cell,
  entry,
  onOpen,
}: {
  cell: Extract<GridCell, { kind: "entry" }>;
  entry: GridEntryView;
  onOpen: (key: string) => void;
}) {
  const open = useCallback(() => onOpen(cell.entryId), [cell.entryId, onOpen]);
  return (
    <TableCell className={BLOCK_CELL_CLASS} rowSpan={cell.rowSpan}>
      <button
        aria-label={entry.ariaLabel}
        className={cn(
          BLOCK_CLASS,
          "flex cursor-pointer flex-col items-start overflow-hidden px-2 py-1 text-left",
          entry.kind === "booking"
            ? "border-chart-2 bg-primary text-primary-foreground"
            : "border-info bg-info text-info-foreground"
        )}
        onClick={open}
        type="button"
      >
        <span className="w-full truncate font-medium">{entry.name}</span>
        {cell.rowSpan > 1 ? (
          <span className="mt-auto text-xs tabular-nums">{entry.time}</span>
        ) : null}
      </button>
    </TableCell>
  );
}

// The buffer is never labelled on screen; screen readers hear its name.
function BufferCell({ cell }: { cell: Extract<GridCell, { kind: "buffer" }> }) {
  return (
    <TableCell className={BLOCK_CELL_CLASS} rowSpan={cell.rowSpan}>
      <div className={cn(BLOCK_CLASS, "bg-muted")}>
        <span className="sr-only">{copy.buffer}</span>
      </div>
    </TableCell>
  );
}

function SlotCell({
  cell,
  column,
  onBook,
  roomName,
}: {
  cell: Extract<GridCell, { kind: "slot" }>;
  column: number;
  onBook: (target: BookingTarget) => void;
  roomName: string | undefined;
}) {
  const book = useCallback(
    () => onBook({ column, start: cell.label }),
    [cell.label, column, onBook]
  );
  return (
    <TableCell className={BLOCK_CELL_CLASS}>
      {cell.status === "available" ? (
        <button
          aria-label={copy.slotLabel(roomName ?? "", cell.label)}
          className="absolute inset-0 cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={book}
          type="button"
        />
      ) : null}
    </TableCell>
  );
}

interface CellHandlers {
  entries: Record<string, GridEntryView>;
  onBook: (target: BookingTarget) => void;
  onOpen: (key: string) => void;
  roomNames: string[];
}

function GridCellView({
  handlers,
  placed,
}: {
  handlers: CellHandlers;
  placed: PlacedCell;
}) {
  const { cell, column } = placed;
  if (cell.kind === "slot") {
    return (
      <SlotCell
        cell={cell}
        column={column}
        onBook={handlers.onBook}
        roomName={handlers.roomNames[column]}
      />
    );
  }
  if (cell.kind === "buffer") {
    return <BufferCell cell={cell} />;
  }
  const entry = handlers.entries[cell.entryId];
  return entry ? (
    <EntryCell cell={cell} entry={entry} onOpen={handlers.onOpen} />
  ) : (
    <TableCell className={BLOCK_CELL_CLASS} rowSpan={cell.rowSpan} />
  );
}

function GridRow({
  cells,
  entries,
  label,
  onBook,
  onOpen,
  roomNames,
}: {
  cells: PlacedCell[];
  entries: Record<string, GridEntryView>;
  label: string;
  onBook: (target: BookingTarget) => void;
  onOpen: (key: string) => void;
  roomNames: string[];
}) {
  return (
    <TableRow className={ROW_CLASS}>
      <TableHead
        className="sticky left-0 z-10 h-9 bg-card pt-1 pr-3 text-right align-top font-normal text-muted-foreground tabular-nums"
        scope="row"
      >
        {label}
      </TableHead>
      {cells.map((placed) => (
        <GridCellView
          handlers={{ entries, onBook, onOpen, roomNames }}
          key={placed.column}
          placed={placed}
        />
      ))}
    </TableRow>
  );
}

const entryFor = (
  entries: Record<string, GridEntryView>,
  key: string | null
): GridEntryView | null => (key ? (entries[key] ?? null) : null);

// The booking dialog for the slot last clicked. It stays mounted after it
// closes so the close animation plays; a new slot remounts it with a fresh
// form.
function GridBookingDialog({
  columns,
  date,
  onOpenChange,
  open,
  target,
  terms,
  viewer,
}: {
  columns: DayGridColumn[];
  date: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  target: BookingTarget | null;
  terms: CurrentTerms;
  viewer: BookingViewer;
}) {
  const column = target ? columns[target.column] : undefined;
  if (!(target && column)) {
    return null;
  }
  return (
    <BookingDialog
      initialDate={date}
      initialPeriods={column.periods}
      key={`${target.column}-${target.start}`}
      onOpenChange={onOpenChange}
      open={open}
      prefill={{ dato: date, fra: target.start }}
      room={column.room}
      terms={terms}
      viewer={viewer}
    />
  );
}

export function DayGrid({
  columns,
  date,
  dateLabel,
  entries,
  rows,
  terms,
  viewer,
}: {
  columns: DayGridColumn[];
  date: string;
  dateLabel: string;
  entries: Record<string, GridEntryView>;
  rows: PlacedCell[][];
  terms: CurrentTerms;
  viewer: BookingViewer;
}) {
  const [openEntry, setOpenEntry] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [target, setTarget] = useState<BookingTarget | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openSheet = useCallback((key: string) => {
    setOpenEntry(key);
    setSheetOpen(true);
  }, []);
  const book = useCallback((next: BookingTarget) => {
    setTarget(next);
    setDialogOpen(true);
  }, []);

  const roomNames = columns.map((column) => column.room.name);

  return (
    <>
      <Card className="gap-0 overflow-hidden py-0">
        <Table
          aria-label={copy.gridLabel(dateLabel)}
          className="table-fixed"
          style={{ minWidth: `calc(72px + ${columns.length} * 9rem)` }}
        >
          <colgroup>
            <col className="w-[72px]" />
            {columns.map((column) => (
              <col key={column.room.roomId} />
            ))}
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky left-0 z-10 h-14 bg-card">
                <span className="sr-only">{copy.sheet.time}</span>
              </TableHead>
              {columns.map((column) => (
                <RoomHeader column={column} key={column.room.roomId} />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((cells, row) => (
              <GridRow
                cells={cells}
                entries={entries}
                key={ROW_LABELS[row]}
                label={ROW_LABELS[row] ?? ""}
                onBook={book}
                onOpen={openSheet}
                roomNames={roomNames}
              />
            ))}
          </TableBody>
        </Table>
      </Card>
      <EntrySheet
        entry={entryFor(entries, openEntry)}
        onOpenChange={setSheetOpen}
        open={sheetOpen}
      />
      <GridBookingDialog
        columns={columns}
        date={date}
        onOpenChange={setDialogOpen}
        open={dialogOpen}
        target={target}
        terms={terms}
        viewer={viewer}
      />
    </>
  );
}
