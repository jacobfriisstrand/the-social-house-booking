// Read-side for Hjem, the notice board (#12). Session client + RLS:
// calendar_entries is the one cross-company read surface and carries no
// booker data; the bookings table adds detail only where RLS allows it —
// a company's own bookings, or every booking for an admin.
import type { SupabaseClient } from "@supabase/supabase-js";
import { bookingPriceOverview } from "@/lib/bookings/new-booking";
import { bufferEndAt } from "@/lib/domain/buffer";
import type { PriceOverviewModel } from "@/lib/domain/price-overview";
import { cphToUtc } from "@/lib/domain/time";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;
type EntryRow = Database["public"]["Views"]["calendar_entries"]["Row"];
type BookingStatus = Database["public"]["Enums"]["booking_status"];

/** A booking or House Event in one room, as members may see it. */
export interface DayEntry {
  companyName: string | null;
  description: string | null;
  endAt: Date;
  id: string;
  kind: "booking" | "house_event";
  roomId: string;
  roomName: string;
  startAt: Date;
  title: string | null;
}

export type BookingDetail =
  | { bookerName: string; kind: "own" }
  | {
      bookerEmail: string;
      bookerName: string;
      bookerPhone: string;
      bookingNumber: string;
      internalNote: string | null;
      kind: "admin";
      participantCount: number;
      practicalNotes: string | null;
      price: PriceOverviewModel;
      status: BookingStatus;
    };

// The instants a Copenhagen date covers, widened on the left by the buffer:
// a period that ended just before midnight still blocks through it.
function dayWindow(date: string): { from: string; to: string } {
  const start = cphToUtc(date, "00:00");
  const bufferMs = bufferEndAt(start).getTime() - start.getTime();
  return {
    from: new Date(start.getTime() - bufferMs).toISOString(),
    to: cphToUtc(date, "24:00").toISOString(),
  };
}

// The view's columns are nullable by construction; a row without a room or
// times cannot sit on the grid.
function toDayEntry(row: EntryRow): DayEntry[] {
  const {
    calendar_entry_end_at: endAt,
    calendar_entry_id: id,
    calendar_entry_start_at: startAt,
    room_id: roomId,
  } = row;
  if (!(id && roomId && startAt && endAt)) {
    return [];
  }
  return [
    {
      companyName: row.company_display_name,
      description: row.house_event_description,
      endAt: new Date(endAt),
      id,
      kind: row.calendar_entry_kind === "booking" ? "booking" : "house_event",
      roomId,
      roomName: row.room_name ?? "",
      startAt: new Date(startAt),
      title: row.house_event_title,
    },
  ];
}

// Every live booking and House Event touching the date, in start order.
export async function listDayEntries(
  supabase: Client,
  date: string
): Promise<DayEntry[]> {
  const window = dayWindow(date);
  const { data, error } = await supabase
    .from("calendar_entries")
    .select("*")
    .lt("calendar_entry_start_at", window.to)
    .gt("calendar_entry_end_at", window.from)
    .order("calendar_entry_start_at")
    // Bounded: a day holds a few dozen entries at most.
    .limit(500);
  if (error) {
    throw new Error(`could not list calendar entries: ${error.message}`);
  }
  return data.flatMap(toDayEntry);
}

const ADMIN_COLUMNS =
  "booking_id, booking_number, booking_booker_name, booking_booker_email, booking_booker_phone, booking_participant_count, booking_practical_notes, booking_internal_note, booking_status, booking_addon_total_ore, booking_discount_percent, booking_end_at, booking_expected_total_ore, booking_room_price_ore, booking_start_at";

async function listAdminDetails(
  supabase: Client,
  window: { from: string; to: string }
): Promise<Map<string, BookingDetail>> {
  const { data, error } = await supabase
    .from("bookings")
    .select(ADMIN_COLUMNS)
    .in("booking_status", ["pending_verification", "confirmed"])
    .lt("booking_start_at", window.to)
    .gt("booking_end_at", window.from)
    .limit(500);
  if (error) {
    throw new Error(`could not list booking details: ${error.message}`);
  }
  return new Map(
    data.map((row) => [
      row.booking_id,
      {
        bookerEmail: row.booking_booker_email,
        bookerName: row.booking_booker_name,
        bookerPhone: row.booking_booker_phone,
        bookingNumber: row.booking_number,
        internalNote: row.booking_internal_note,
        kind: "admin",
        participantCount: row.booking_participant_count,
        practicalNotes: row.booking_practical_notes,
        price: bookingPriceOverview(row),
        status: row.booking_status,
      },
    ])
  );
}

// A company reads only the booker's name of its own bookings: RLS returns
// its own rows, and no other column is selected.
async function listOwnDetails(
  supabase: Client,
  window: { from: string; to: string }
): Promise<Map<string, BookingDetail>> {
  const { data, error } = await supabase
    .from("bookings")
    .select("booking_id, booking_booker_name")
    .in("booking_status", ["pending_verification", "confirmed"])
    .lt("booking_start_at", window.to)
    .gt("booking_end_at", window.from)
    .limit(500);
  if (error) {
    throw new Error(`could not list own bookings: ${error.message}`);
  }
  return new Map(
    data.map((row) => [
      row.booking_id,
      { bookerName: row.booking_booker_name, kind: "own" },
    ])
  );
}

// What the viewer may see beyond the projection, per booking id: the
// admin gets contact, notes and price; a company its own bookers' names.
// Takes the role, not the loaded viewer, so it runs in the same round trip.
export function listDayBookingDetails(
  supabase: Client,
  date: string,
  isAdmin: boolean
): Promise<Map<string, BookingDetail>> {
  const window = dayWindow(date);
  return isAdmin
    ? listAdminDetails(supabase, window)
    : listOwnDetails(supabase, window);
}

/** A House Event on the notice board strip, with all the rooms it blocks. */
export interface StripHouseEvent {
  description: string | null;
  endAt: Date;
  id: string;
  roomNames: string[];
  startAt: Date;
  title: string | null;
}

// Today's House Events for the strip: one card per event, its rooms
// gathered from the per-room rows of the projection.
export function groupHouseEvents(entries: DayEntry[]): StripHouseEvent[] {
  const byId = new Map<string, StripHouseEvent>();
  for (const entry of entries) {
    if (entry.kind === "house_event") {
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
  }
  return [...byId.values()];
}
