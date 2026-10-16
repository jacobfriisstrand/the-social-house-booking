"use client";

// The day grid (DESIGN.md "Day grid", ADR-0022), the same for admin and
// members: 30-minute rows from 09:00 to 22:00, one column per room. A
// booking is a primary block, a House Event an info block, the buffer a
// muted block with no text. A block opens its sheet; a free slot opens the
// booking dialog with room, date and start filled in. It is a table: a
// block is a cell spanning its rows, so screen readers move through it by
// room and time. Every cell is placed on the server
// (lib/domain/day-grid.ts); this component only renders and holds which
// sheet or dialog is open. With a mouse, a free slot can also be dragged
// down into a longer booking: the selection stops where the room's next
// booking (buffer included) or its closing time stops the dialog's end
// list, and letting go opens the dialog with the end filled in as well.
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { BookingDialog } from "@/components/bookings/booking-dialog";
import { toPeriods } from "@/components/bookings/booking-form";
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
import {
  dragEndRow,
  type GridCell,
  lastDragRow,
  type PlacedCell,
} from "@/lib/domain/day-grid";
import type { CurrentTerms } from "@/lib/domain/terms";
import { timeOptions } from "@/lib/domain/time";
import type { DayGridColumn } from "@/lib/notice-board/grid";
import type { GridEntryView } from "@/lib/notice-board/view";
import { cn } from "@/lib/utils";
import { messages } from "@/messages/da";

const copy = messages.home;

interface BookingTarget {
  column: number;
  end?: string;
  start: string;
}

// A mouse drag from a free slot: rows startRow through endRow of one
// column, never past lastRow. rowHeight sizes the drawn selection.
interface SlotDrag {
  column: number;
  endRow: number;
  lastRow: number;
  rowHeight: number;
  startRow: number;
}

type DragStart = (column: number, startRow: number, rowHeight: number) => void;

// One label per row: 09:00, 09:30 … 21:30.
const ROW_LABELS = timeOptions(
  SLOT_MINUTES,
  GRID_START_MINUTES,
  GRID_END_MINUTES - SLOT_MINUTES
);
// Where each row ends: 09:30 for the 09:00 row … 22:00 for the last.
const ROW_END_LABELS = timeOptions(
  SLOT_MINUTES,
  GRID_START_MINUTES + SLOT_MINUTES,
  GRID_END_MINUTES
);
// The selection sits inside its cells like a booking block (inset-0.5).
const SELECTION_INSET_PX = 4;

// The grid row under the pointer, whichever column it is in.
const rowAt = (x: number, y: number): number | null => {
  const row = document
    .elementFromPoint(x, y)
    ?.closest<HTMLElement>("tr[data-row]");
  return row ? Number(row.dataset.row) : null;
};

const rangeLabel = (drag: SlotDrag): string =>
  `${ROW_LABELS[drag.startRow]} - ${ROW_END_LABELS[drag.endRow]}`;

// The grid's rows keep their height and never highlight (DESIGN.md: no
// hover effects beyond the cursor). The hairline between the slots is the
// border token on every width (#115): without it the rows read as one
// sheet, and on the phone the horizontally scrolling bookings have
// nothing to separate them.
const ROW_CLASS = "h-9 hover:bg-transparent";
// A block fills its cell, spanned rows included, with a small inset. The
// border-b is the row separator: on a border-separate table the hairlines
// belong to the cells, not the rows (see the Table comment).
const BLOCK_CELL_CLASS = "relative border-b border-l p-0";
const BLOCK_CLASS = "absolute inset-0.5 rounded-lg border";
// Everything the room is not available in — the buffer and the past,
// closed and blocked slots — wears the muted block with a diagonal hatch,
// the drawn "closed off" mark. The hatch takes muted-foreground, not
// `muted`: muted lines on the muted fill would vanish.
const MUTED_BLOCK_CLASS = cn(
  BLOCK_CLASS,
  "bg-muted [background-image:repeating-linear-gradient(45deg,color-mix(in_oklab,var(--muted-foreground)_25%,transparent)_0_1px,transparent_1px_7px)]"
);

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
      <div className={MUTED_BLOCK_CLASS}>
        <span className="sr-only">{copy.buffer}</span>
      </div>
    </TableCell>
  );
}

// The drawn selection: a booking-coloured block from the start cell down
// over the dragged rows, with the time span it would book.
function DragSelection({ drag }: { drag: SlotDrag }) {
  const rows = drag.endRow - drag.startRow + 1;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0.5 top-0.5 z-[5] rounded-lg border border-chart-2 bg-primary px-2 py-1 font-medium text-primary-foreground text-xs tabular-nums"
      style={{ height: rows * drag.rowHeight - SELECTION_INSET_PX }}
    >
      {rangeLabel(drag)}
    </div>
  );
}

function FreeSlotButton({
  cell,
  column,
  onBook,
  onDragStart,
  roomName,
}: {
  cell: Extract<GridCell, { kind: "slot" }>;
  column: number;
  onBook: (target: BookingTarget) => void;
  onDragStart: DragStart;
  roomName: string | undefined;
}) {
  const book = useCallback(
    () => onBook({ column, start: cell.label }),
    [cell.label, column, onBook]
  );
  // Mouse and pen only: on touch a drag scrolls the grid, and a tap books.
  const startDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === "touch" || event.button !== 0) {
        return;
      }
      event.preventDefault();
      const row = event.currentTarget.closest("tr");
      onDragStart(column, cell.firstRow, row?.offsetHeight ?? 0);
    },
    [cell.firstRow, column, onDragStart]
  );
  return (
    <button
      aria-label={copy.slotLabel(roomName ?? "", cell.label)}
      className="absolute inset-0 cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      onClick={book}
      onPointerDown={startDrag}
      type="button"
    />
  );
}

function SlotCell({
  cell,
  column,
  drag,
  onBook,
  onDragStart,
  roomName,
}: {
  cell: Extract<GridCell, { kind: "slot" }>;
  column: number;
  drag: SlotDrag | null;
  onBook: (target: BookingTarget) => void;
  onDragStart: DragStart;
  roomName: string | undefined;
}) {
  return (
    <TableCell className={BLOCK_CELL_CLASS} rowSpan={cell.rowSpan}>
      {cell.status === "available" ? (
        <>
          <FreeSlotButton
            cell={cell}
            column={column}
            onBook={onBook}
            onDragStart={onDragStart}
            roomName={roomName}
          />
          {drag ? <DragSelection drag={drag} /> : null}
        </>
      ) : (
        // Not bookable (past, closed, blocked): the same small inset and
        // rounded block as the buffer — one look for everything the room
        // is not available in — and labelled like the dialog's disabled
        // start options, so an empty-looking cell never looks clickable.
        <div className={MUTED_BLOCK_CLASS}>
          <span className="sr-only">
            {messages.booking.dialog.slotStatus[cell.status]}
          </span>
        </div>
      )}
    </TableCell>
  );
}

interface CellHandlers {
  drag: SlotDrag | null;
  entries: Record<string, GridEntryView>;
  onBook: (target: BookingTarget) => void;
  onDragStart: DragStart;
  onOpen: (key: string) => void;
  roomNames: string[];
}

// The drag, when it started in this cell.
const dragFrom = (
  drag: SlotDrag | null,
  column: number,
  row: number
): SlotDrag | null =>
  drag?.column === column && drag.startRow === row ? drag : null;

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
        drag={dragFrom(handlers.drag, column, cell.firstRow)}
        onBook={handlers.onBook}
        onDragStart={handlers.onDragStart}
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
  handlers,
  label,
  row,
}: {
  cells: PlacedCell[];
  handlers: CellHandlers;
  label: string;
  row: number;
}) {
  return (
    <TableRow className={ROW_CLASS} data-row={row}>
      {/* border-b on the cell itself: it travels with the sticky label, so
          the row separator is there under the time column too (#115). */}
      <TableHead
        className="sticky left-0 z-10 h-9 border-b bg-card pt-1 pr-3 text-right align-top font-normal text-muted-foreground tabular-nums"
        scope="row"
      >
        {label}
      </TableHead>
      {cells.map((placed) => (
        <GridCellView handlers={handlers} key={placed.column} placed={placed} />
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
      key={`${target.column}-${target.start}-${target.end ?? ""}`}
      onOpenChange={onOpenChange}
      open={open}
      prefill={{ date, from: target.start, to: target.end }}
      room={column.room}
      terms={terms}
      viewer={viewer}
    />
  );
}

// The mouse drag over free slots. Window listeners follow the pointer for
// as long as a drag is on, and are added again each time it reaches a new
// row. Letting go books the dragged span; a press that never left its row
// stays a plain click. Escape drops the drag.
function useSlotDrag(
  columns: DayGridColumn[],
  date: string,
  onBook: (target: BookingTarget) => void
): { drag: SlotDrag | null; startDrag: DragStart } {
  const [drag, setDrag] = useState<SlotDrag | null>(null);

  const startDrag = useCallback<DragStart>(
    (column, startRow, rowHeight) => {
      const day = columns[column];
      if (!day) {
        return;
      }
      const lastRow = lastDragRow({
        blocked: toPeriods(day.periods),
        date,
        specialDays: day.room.specialDays,
        startRow,
        weekly: day.room.weekly,
      });
      setDrag({ column, endRow: startRow, lastRow, rowHeight, startRow });
    },
    [columns, date]
  );

  useEffect(() => {
    if (!drag) {
      return;
    }
    const move = (event: PointerEvent) => {
      const row = rowAt(event.clientX, event.clientY);
      if (row === null) {
        return;
      }
      const endRow = dragEndRow(drag.startRow, row, drag.lastRow);
      if (endRow !== drag.endRow) {
        setDrag({ ...drag, endRow });
      }
    };
    const finish = () => {
      setDrag(null);
      if (drag.endRow > drag.startRow) {
        onBook({
          column: drag.column,
          end: ROW_END_LABELS[drag.endRow],
          start: ROW_LABELS[drag.startRow] ?? "",
        });
      }
    };
    const cancel = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrag(null);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    window.addEventListener("keydown", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      window.removeEventListener("keydown", cancel);
    };
  }, [drag, onBook]);

  return { drag, startDrag };
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

  const { drag, startDrag } = useSlotDrag(columns, date, book);
  const handlers: CellHandlers = {
    drag,
    entries,
    onBook: book,
    onDragStart: startDrag,
    onOpen: openSheet,
    roomNames: columns.map((column) => column.room.name),
  };

  return (
    <>
      <Card className="gap-0 overflow-hidden py-0">
        {/* border-separate: with collapse, WebKit misrenders the sticky time
            labels — on the phone the bookings slide in behind them (#115).
            Separated borders put each hairline on the cell that owns it, so
            they travel with the sticky cells; the spacing stays at 0. The
            hairlines therefore live on the cells (block cells and headers),
            not on the rows, which cannot carry borders in this model. */}
        <Table
          aria-label={copy.gridLabel(dateLabel)}
          className={cn(
            "table-fixed border-separate border-spacing-0",
            drag && "cursor-row-resize select-none"
          )}
          style={{ minWidth: `calc(72px + ${columns.length} * 9rem)` }}
        >
          <colgroup>
            <col className="w-[72px]" />
            {columns.map((column) => (
              <col key={column.room.roomId} />
            ))}
          </colgroup>
          <TableHeader className="[&_th]:border-b">
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky left-0 z-10 h-14 bg-card">
                <span className="sr-only">{copy.sheet.time}</span>
              </TableHead>
              {columns.map((column) => (
                <RoomHeader column={column} key={column.room.roomId} />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="[&_tr:last-child_td]:border-b-0 [&_tr:last-child_th]:border-b-0">
            {rows.map((cells, row) => (
              <GridRow
                cells={cells}
                handlers={handlers}
                key={ROW_LABELS[row]}
                label={ROW_LABELS[row] ?? ""}
                row={row}
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
