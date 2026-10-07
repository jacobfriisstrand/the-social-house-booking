// The admin calendar's week and month cells (#9): the dates a view shows,
// each with the entries that touch the Copenhagen day, in start order. The
// day view is the day grid instead (lib/notice-board/grid.ts); this module
// is the compact grid's server-side assembly, the notice board's view
// functions reused for what a block shows. Every block carries its own key
// (room and id, like the day grid's blocks) so the grid renders without
// array-index keys.
import { cphToUtc } from "@/lib/domain/time";
import type { BookingDetail } from "@/lib/notice-board/data";
import {
  bookingView,
  type GridEntryView,
  houseEventView,
} from "@/lib/notice-board/view";
import type { AdminCalendarEntry } from "./admin-data";

export interface AdminCalendarBlock {
  key: string;
  view: GridEntryView;
}

export interface AdminCalendarCell {
  blocks: AdminCalendarBlock[];
  date: string;
}

// Every room a House Event blocks, by event id, for its sheet.
function eventRoomNames(entries: AdminCalendarEntry[]): Map<string, string[]> {
  const names = new Map<string, string[]>();
  for (const entry of entries) {
    if (entry.kind === "house_event") {
      names.set(entry.id, [...(names.get(entry.id) ?? []), entry.roomName]);
    }
  }
  return names;
}

/** The view shows per date: the entries whose instant range touches the
 * Copenhagen day, so an event that started the evening before still shows. */
export function buildAdminCalendarCells({
  dates,
  details,
  entries,
}: {
  dates: readonly string[];
  details: Map<string, BookingDetail>;
  entries: AdminCalendarEntry[];
}): AdminCalendarCell[] {
  const roomNames = eventRoomNames(entries);
  return dates.map((date) => {
    const dayStart = cphToUtc(date, "00:00").getTime();
    const dayEnd = cphToUtc(date, "24:00").getTime();
    const cellEntries = entries
      .filter(
        (entry) =>
          entry.startAt.getTime() < dayEnd && entry.endAt.getTime() > dayStart
      )
      .toSorted(
        (left, right) => left.startAt.getTime() - right.startAt.getTime()
      );
    return {
      blocks: cellEntries.map((entry) => ({
        key: `${entry.roomId}:${entry.id}`,
        view:
          entry.kind === "booking"
            ? bookingView(entry, details.get(entry.id))
            : houseEventView(entry, roomNames.get(entry.id) ?? []),
      })),
      date,
    };
  });
}
