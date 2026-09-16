// Read side of availability (#4): the live periods that block a room
// (bookings incl. holds, House Events) and the room's opening hours, in the
// shapes lib/domain/availability.ts computes with. calendar_entries is the
// one cross-company read surface (#12); it never carries booker data.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Period } from "@/lib/domain/availability";
import { bufferEndAt } from "@/lib/domain/buffer";
import type {
  SpecialClosingDay,
  WeeklyOpeningHour,
} from "@/lib/domain/opening-hours";
import { cphToUtc } from "@/lib/domain/time";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;
type OpeningHourRow = Database["public"]["Tables"]["room_opening_hours"]["Row"];
type CalendarEntryRow = Pick<
  Database["public"]["Views"]["calendar_entries"]["Row"],
  "calendar_entry_end_at" | "calendar_entry_start_at" | "room_id"
>;

/** A Period as it crosses the server/client boundary. */
export interface SerializedPeriod {
  endAt: string;
  startAt: string;
}
type SpecialDayRow =
  Database["public"]["Tables"]["room_special_closing_days"]["Row"];

export interface RoomOpening {
  specialDays: SpecialClosingDay[];
  weekly: WeeklyOpeningHour[];
}

// Postgres `time` reads back as "09:00:00"; the domain compares "HH:mm".
const timeShort = (value: string | null): string | null =>
  value ? value.slice(0, 5) : null;

export const toWeekly = (rows: OpeningHourRow[]): WeeklyOpeningHour[] =>
  rows.map((row) => ({
    closes: timeShort(row.room_opening_hour_closes) ?? "00:00",
    dayOfWeek: row.room_opening_hour_day_of_week,
    isClosed: row.room_opening_hour_is_closed,
    opens: timeShort(row.room_opening_hour_opens) ?? "00:00",
  }));

export const toSpecialDays = (rows: SpecialDayRow[]): SpecialClosingDay[] =>
  rows.map((row) => ({
    closes: timeShort(row.room_special_closing_day_closes),
    date: row.room_special_closing_day_date,
    isClosed: row.room_special_closing_day_is_closed,
    opens: timeShort(row.room_special_closing_day_opens),
  }));

export async function loadRoomOpening(
  supabase: Client,
  roomId: string
): Promise<RoomOpening> {
  const [hours, days] = await Promise.all([
    supabase
      .from("room_opening_hours")
      .select("*")
      .eq("room_opening_hour_room_id", roomId),
    supabase
      .from("room_special_closing_days")
      .select("*")
      .eq("room_special_closing_day_room_id", roomId),
  ]);
  return {
    specialDays: toSpecialDays(days.data ?? []),
    weekly: toWeekly(hours.data ?? []),
  };
}

// Every live period per room that can collide with a booking inside
// [from, to): a period ending just before `from` still blocks through its
// buffer, so the lower bound is widened by the buffer length.
export async function listBlockedPeriods(
  supabase: Client,
  window: { from: Date; to: Date }
): Promise<Map<string, Period[]>> {
  const bufferMs = bufferEndAt(window.from).getTime() - window.from.getTime();
  const { data } = await supabase
    .from("calendar_entries")
    .select("room_id, calendar_entry_start_at, calendar_entry_end_at")
    .lt("calendar_entry_start_at", window.to.toISOString())
    .gt(
      "calendar_entry_end_at",
      new Date(window.from.getTime() - bufferMs).toISOString()
    );
  return groupByRoom((data ?? []).map(periodOf));
}

function groupByRoom(
  entries: Array<{ period: Period; roomId: string } | null>
): Map<string, Period[]> {
  const byRoom = new Map<string, Period[]>();
  for (const entry of entries) {
    if (entry) {
      const periods = byRoom.get(entry.roomId) ?? [];
      periods.push(entry.period);
      byRoom.set(entry.roomId, periods);
    }
  }
  return byRoom;
}

// The view's columns are nullable by construction; a row missing any of
// the three cannot block anything.
function periodOf(
  row: CalendarEntryRow
): { period: Period; roomId: string } | null {
  if (
    !(row.room_id && row.calendar_entry_start_at && row.calendar_entry_end_at)
  ) {
    return null;
  }
  return {
    period: {
      endAt: new Date(row.calendar_entry_end_at),
      startAt: new Date(row.calendar_entry_start_at),
    },
    roomId: row.room_id,
  };
}

// One room's blocked periods on a Copenhagen date, ready for the client.
export async function listRoomDayPeriods(
  supabase: Client,
  roomId: string,
  date: string
): Promise<SerializedPeriod[]> {
  const byRoom = await listBlockedPeriods(supabase, {
    from: cphToUtc(date, "00:00"),
    to: cphToUtc(date, "24:00"),
  });
  return (byRoom.get(roomId) ?? []).map((period) => ({
    endAt: period.endAt.toISOString(),
    startAt: period.startAt.toISOString(),
  }));
}
