// The foyer screen's reads (#124): the notice board and today's booking
// overview for an always-on display no one logs into. The foyer route is
// public, so the reads run with the service role (allowlist entry 10,
// docs/agents/supabase.md) instead of widening RLS to anonymous callers.
//
// The day projection assembles from the base tables and CANNOT reuse the
// calendar_entries view: the view gates on `auth.uid() is not null`
// (calendar_entries.sql), and the service role has no user id, so the view
// is empty on this path — by design, since the view is the only
// cross-company read and it is meant for logged-in sessions. This
// projection is the foyer's own and shows exactly what the screen may
// show: confirmed bookings' times, room and company display name, and
// House Events with their rooms. No booker columns are selected at all,
// and no booking details ride the grid (the empty details map keeps the
// block labels to the company name — a detail would put a person's name on
// a public screen).
import "server-only";

import { bufferEndAt } from "@/lib/domain/buffer";
import { cphDate } from "@/lib/domain/opening-hours";
import type { CurrentTerms } from "@/lib/domain/terms";
import { cphToUtc } from "@/lib/domain/time";
import type { DayEntry, StripHouseEvent } from "@/lib/notice-board/data";
import { buildDayGrid, type DayGridModel } from "@/lib/notice-board/grid";
import type { Notice } from "@/lib/notices/data";
import { listShownNotices } from "@/lib/notices/data";
import { listPublicRooms, type PublicRoom } from "@/lib/rooms/public-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentTerms } from "@/lib/terms/data";

export interface FoyerDay {
  date: string;
  events: StripHouseEvent[];
  grid: DayGridModel;
  notices: Notice[];
  rooms: PublicRoom[];
  terms: CurrentTerms;
}

// The instants the Copenhagen date covers, widened on the left by the
// booking buffer — the same window the authed day grid reads through
// (lib/notice-board/data.ts dayWindow): a meeting that ended just before
// midnight still blocks the morning through its buffer.
function foyerDayWindow(date: string): { from: string; to: string } {
  const start = cphToUtc(date, "00:00");
  const bufferMs = bufferEndAt(start).getTime() - start.getTime();
  return {
    from: new Date(start.getTime() - bufferMs).toISOString(),
    to: cphToUtc(date, "24:00").toISOString(),
  };
}

// Confirmed bookings touching the day, as grid entries. A pending hold is
// a promise to a company, not a fact to show the house's guests —
// confirmed only. The embed carries the room and the company's display
// name; no other booking column is read.
async function listFoyerBookingEntries(
  supabase: ReturnType<typeof createAdminClient>,
  date: string
): Promise<DayEntry[]> {
  const window = foyerDayWindow(date);
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "booking_id, booking_end_at, booking_start_at, companies(company_display_name), rooms(room_id, room_name)"
    )
    .in("booking_status", ["confirmed"])
    .lt("booking_start_at", window.to)
    .gt("booking_end_at", window.from)
    .order("booking_start_at");
  if (error) {
    throw new Error(`could not list the foyer's bookings: ${error.message}`);
  }
  return data.flatMap((row) =>
    row.rooms && row.companies
      ? [
          {
            companyName: row.companies.company_display_name,
            description: null,
            endAt: new Date(row.booking_end_at),
            id: row.booking_id,
            kind: "booking" as const,
            roomId: row.rooms.room_id,
            roomName: row.rooms.room_name,
            startAt: new Date(row.booking_start_at),
            title: null,
          },
        ]
      : []
  );
}

// House Events touching the day, one entry per room they block — the same
// shape the calendar_entries projection gives the authed screens.
async function listFoyerEventEntries(
  supabase: ReturnType<typeof createAdminClient>,
  date: string
): Promise<DayEntry[]> {
  const window = foyerDayWindow(date);
  const { data, error } = await supabase
    .from("house_events")
    .select(
      "house_event_id, house_event_description, house_event_end_at, house_event_start_at, house_event_title, house_event_rooms(rooms(room_id, room_name))"
    )
    .lt("house_event_start_at", window.to)
    .gt("house_event_end_at", window.from)
    .order("house_event_start_at");
  if (error) {
    throw new Error(
      `could not list the foyer's house events: ${error.message}`
    );
  }
  return data.flatMap((event) =>
    (event.house_event_rooms ?? []).flatMap(({ rooms }) =>
      rooms
        ? [
            {
              companyName: null,
              description: event.house_event_description,
              endAt: new Date(event.house_event_end_at),
              id: event.house_event_id,
              kind: "house_event" as const,
              roomId: rooms.room_id,
              roomName: rooms.room_name,
              startAt: new Date(event.house_event_start_at),
              title: event.house_event_title,
            },
          ]
        : []
    )
  );
}

// Today's House Events for the notice strip: grouped per event with the
// rooms they block, while they have not ended — the same grouping the
// authed strip reads get (lib/notice-board/data.ts groupHouseEvents).
function groupFoyerEvents(entries: DayEntry[], now: Date): StripHouseEvent[] {
  const byId = new Map<string, StripHouseEvent>();
  for (const entry of entries) {
    if (entry.kind !== "house_event" || entry.endAt <= now) {
      continue;
    }
    const event = byId.get(entry.id) ?? {
      description: entry.description,
      endAt: entry.endAt,
      id: entry.id,
      roomNames: [],
      startAt: entry.startAt,
      title: entry.title,
    };
    event.roomNames.push(entry.roomName);
    byId.set(entry.id, event);
  }
  return [...byId.values()];
}

// Everything the foyer screen renders for one day, in one round trip.
// `now` decides the day (today in Copenhagen, ADR-0021) and the grid's
// past-slot shading; the screen refreshes, so call it again per render.
export async function loadFoyerDay(now: Date): Promise<FoyerDay> {
  const supabase = createAdminClient();
  const date = cphDate(now);
  const [rooms, bookingEntries, eventEntries, notices, terms] =
    await Promise.all([
      listPublicRooms(supabase),
      listFoyerBookingEntries(supabase, date),
      listFoyerEventEntries(supabase, date),
      listShownNotices(supabase, now),
      getCurrentTerms(),
    ]);
  const entries = [...bookingEntries, ...eventEntries].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime()
  );
  const grid = buildDayGrid({
    date,
    // No booking details on a public screen: the company name alone.
    details: new Map(),
    entries,
    isToday: date === cphDate(new Date()),
    now,
    rooms,
  });
  return {
    date,
    events: groupFoyerEvents(entries, now),
    grid,
    notices,
    rooms,
    terms,
  };
}
