// The day grid (DESIGN.md "Day grid", ADR-0022): one column per room and
// 30-minute rows from 09:00 to 22:00 on a Copenhagen date (ADR-0021). This
// module places each booking or House Event, and the buffer after it
// (ADR-0002), on the rows, and says what every remaining row is: a start a
// booking can take, or why not. It also reads a room's status for the
// notice board. Display only: Postgres decides what is bookable on write.
import {
  GRID_END_MINUTES,
  GRID_START_MINUTES,
  type Period,
  type StartSlotStatus,
  startSlots,
} from "./availability";
import { SLOT_MINUTES } from "./booking-window";
import { bufferEndAt } from "./buffer";
import {
  bookingWithinOpeningHours,
  type SpecialClosingDay,
  type WeeklyOpeningHour,
} from "./opening-hours";
import { cphToUtc, timeOptions } from "./time";

const SLOT_MS = SLOT_MINUTES * 60_000;
const [GRID_START_LABEL] = timeOptions(
  SLOT_MINUTES,
  GRID_START_MINUTES,
  GRID_START_MINUTES
);

export const GRID_ROW_COUNT =
  (GRID_END_MINUTES - GRID_START_MINUTES) / SLOT_MINUTES;

/** A booking or House Event on the grid, by its own id. */
export interface GridEntry extends Period {
  id: string;
}

/** Rows a period covers: 0 is 09:00, GRID_ROW_COUNT - 1 is 21:30. */
export interface GridSpan {
  firstRow: number;
  rowSpan: number;
}

export type GridCell =
  | ({ entryId: string; kind: "entry" } & GridSpan)
  | ({ kind: "buffer" } & GridSpan)
  | { kind: "slot"; label: string; row: number; status: StartSlotStatus };

interface RoomDay {
  entries: GridEntry[];
  specialDays: SpecialClosingDay[];
  weekly: WeeklyOpeningHour[];
}

// The rows a period covers on the date, widened to whole rows and clipped
// to the grid; null when it lies wholly outside 09:00-22:00. Counted from
// 09:00 itself, never from midnight, so a DST date still has 26 rows.
export function gridSpan(date: string, period: Period): GridSpan | null {
  const gridStart = cphToUtc(date, GRID_START_LABEL).getTime();
  const firstRow = Math.max(
    0,
    Math.floor((period.startAt.getTime() - gridStart) / SLOT_MS)
  );
  const endRow = Math.min(
    GRID_ROW_COUNT,
    Math.ceil((period.endAt.getTime() - gridStart) / SLOT_MS)
  );
  return endRow > firstRow ? { firstRow, rowSpan: endRow - firstRow } : null;
}

const spanRows = (span: GridSpan): number[] =>
  Array.from({ length: span.rowSpan }, (_, index) => span.firstRow + index);

const firstRowOf = (cell: GridCell): number =>
  cell.kind === "slot" ? cell.row : cell.firstRow;

// Claims the span's rows when none is taken yet. Live periods never overlap
// (Postgres), so a refusal only guards against off-grid times.
function claim(taken: Set<number>, span: GridSpan | null): GridSpan | null {
  if (!span) {
    return null;
  }
  const rows = spanRows(span);
  if (rows.some((row) => taken.has(row))) {
    return null;
  }
  for (const row of rows) {
    taken.add(row);
  }
  return span;
}

const bufferOf = (entry: GridEntry): Period => ({
  endAt: bufferEndAt(entry.endAt),
  startAt: entry.endAt,
});

// One room's column on a date: its entries, the buffer after each, and a
// cell for every row left over, in row order.
export function dayGridColumn({
  date,
  entries,
  now,
  specialDays,
  weekly,
}: RoomDay & { date: string; now: Date }): GridCell[] {
  const taken = new Set<number>();
  const cells: GridCell[] = [];
  for (const entry of entries) {
    const span = claim(taken, gridSpan(date, entry));
    if (span) {
      cells.push({ entryId: entry.id, kind: "entry", ...span });
    }
  }
  for (const entry of entries) {
    const span = claim(taken, gridSpan(date, bufferOf(entry)));
    if (span) {
      cells.push({ kind: "buffer", ...span });
    }
  }
  const slots = startSlots({
    blocked: entries,
    date,
    now,
    specialDays,
    weekly,
  });
  for (const [row, slot] of slots.entries()) {
    if (!taken.has(row)) {
      cells.push({ kind: "slot", label: slot.label, row, status: slot.status });
    }
  }
  return cells.sort((a, b) => firstRowOf(a) - firstRowOf(b));
}

export type RoomStatus =
  | { kind: "closed" }
  | { kind: "free" }
  | { freeAt: Date; kind: "occupied" };

// The notice board's "when occupied rooms free up" (Bilag 1): a room in use
// frees up at the end of what occupies it. The buffer is not added (decided
// in #12). A room that is not in use is free while it is open.
export function roomStatusAt({
  entries,
  now,
  specialDays,
  weekly,
}: RoomDay & { now: Date }): RoomStatus {
  const current = entries.find(
    (entry) => entry.startAt <= now && now < entry.endAt
  );
  if (current) {
    return { freeAt: current.endAt, kind: "occupied" };
  }
  return bookingWithinOpeningHours(now, now, weekly, specialDays)
    ? { kind: "free" }
    : { kind: "closed" };
}
