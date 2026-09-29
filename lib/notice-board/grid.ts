// Assembles the day grid for Hjem (#12) on the server: each active room's
// column from lib/domain/day-grid.ts, the status line when the date is
// today, and what each block shows (view.ts). The client component only
// renders the result.
import type { DialogRoom } from "@/components/bookings/booking-form";
import type { SerializedPeriod } from "@/lib/bookings/availability";
import {
  dayGridColumn,
  type GridCell,
  type GridEntry,
  gridRows,
  type PlacedCell,
  roomStatusAt,
} from "@/lib/domain/day-grid";
import type { PublicRoom } from "@/lib/rooms/public-data";
import type { BookingDetail, DayEntry } from "./data";
import {
  bookingView,
  type GridEntryView,
  houseEventView,
  roomStatusLabel,
} from "./view";

export interface DayGridColumn {
  periods: SerializedPeriod[];
  room: DialogRoom;
  status: string | null;
}

export interface DayGridModel {
  columns: DayGridColumn[];
  entries: Record<string, GridEntryView>;
  rows: PlacedCell[][];
}

interface DayGridInput {
  date: string;
  details: Map<string, BookingDetail>;
  entries: DayEntry[];
  isToday: boolean;
  now: Date;
  rooms: PublicRoom[];
}

// A House Event has one row per room with the same id; the block key tells
// the columns apart.
const blockKey = (entry: DayEntry): string => `${entry.roomId}:${entry.id}`;

const toGridEntry = (entry: DayEntry): GridEntry => ({
  endAt: entry.endAt,
  id: blockKey(entry),
  startAt: entry.startAt,
});

const toPeriod = (entry: DayEntry): SerializedPeriod => ({
  endAt: entry.endAt.toISOString(),
  startAt: entry.startAt.toISOString(),
});

// Only what the booking dialog reads; photos and texts stay on the server.
const dialogRoom = (room: PublicRoom): DialogRoom => ({
  addons: room.addons,
  capacity: room.capacity,
  hourlyPriceOre: room.hourlyPriceOre,
  location: room.location,
  name: room.name,
  roomId: room.roomId,
  specialDays: room.specialDays,
  weekly: room.weekly,
});

function groupByRoom(entries: DayEntry[]): Map<string, DayEntry[]> {
  const byRoom = new Map<string, DayEntry[]>();
  for (const entry of entries) {
    byRoom.set(entry.roomId, [...(byRoom.get(entry.roomId) ?? []), entry]);
  }
  return byRoom;
}

// Every room a House Event blocks, by event id, for its sheet.
function eventRoomNames(entries: DayEntry[]): Map<string, string[]> {
  const names = new Map<string, string[]>();
  for (const entry of entries) {
    names.set(entry.id, [...(names.get(entry.id) ?? []), entry.roomName]);
  }
  return names;
}

function entryViews(
  entries: DayEntry[],
  details: Map<string, BookingDetail>
): Record<string, GridEntryView> {
  const roomNames = eventRoomNames(entries);
  return Object.fromEntries(
    entries.map((entry) => [
      blockKey(entry),
      entry.kind === "booking"
        ? bookingView(entry, details.get(entry.id))
        : houseEventView(entry, roomNames.get(entry.id) ?? []),
    ])
  );
}

function roomColumn(
  room: PublicRoom,
  entries: DayEntry[],
  { date, isToday, now }: Pick<DayGridInput, "date" | "isToday" | "now">
): { cells: GridCell[]; column: DayGridColumn } {
  const context = {
    entries: entries.map(toGridEntry),
    now,
    specialDays: room.specialDays,
    weekly: room.weekly,
  };
  return {
    cells: dayGridColumn({ ...context, date }),
    column: {
      periods: entries.map(toPeriod),
      room: dialogRoom(room),
      status: isToday ? roomStatusLabel(roomStatusAt(context)) : null,
    },
  };
}

export function buildDayGrid(input: DayGridInput): DayGridModel {
  const byRoom = groupByRoom(input.entries);
  const columns = input.rooms.map((room) =>
    roomColumn(room, byRoom.get(room.roomId) ?? [], input)
  );
  return {
    columns: columns.map(({ column }) => column),
    entries: entryViews(input.entries, input.details),
    rows: gridRows(columns.map(({ cells }) => cells)),
  };
}
