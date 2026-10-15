// Read-side for the admin House Event table (#12). Session client + RLS:
// the base tables are admin-only; members see events only through the
// calendar_entries projection.
import type { SupabaseClient } from "@supabase/supabase-js";
import { cphDate } from "@/lib/domain/opening-hours";
import { cphToUtc } from "@/lib/domain/time";
import type { Database } from "@/lib/supabase/database.types";

export interface HouseEventRoom {
  roomId: string;
  roomName: string;
}

export interface HouseEvent {
  description: string;
  endAt: string;
  houseEventId: string;
  rooms: HouseEventRoom[];
  startAt: string;
  title: string | null;
}

interface HouseEventRow {
  house_event_description: string;
  house_event_end_at: string;
  house_event_id: string;
  house_event_rooms: Array<{
    house_event_room_room_id: string;
    rooms: { room_name: string } | null;
  }>;
  house_event_start_at: string;
  house_event_title: string | null;
}

const toHouseEvent = (row: HouseEventRow): HouseEvent => ({
  description: row.house_event_description,
  endAt: row.house_event_end_at,
  houseEventId: row.house_event_id,
  rooms: row.house_event_rooms.map((room) => ({
    roomId: room.house_event_room_room_id,
    roomName: room.rooms?.room_name ?? "",
  })),
  startAt: row.house_event_start_at,
  title: row.house_event_title,
});

// Today's events and later ones, soonest first, with their rooms embedded
// so the table costs one round trip. Today counts from midnight in
// Copenhagen (ADR-0021), so an event that ended earlier today stays
// editable until the day is over.
export async function listHouseEventsFromToday(
  supabase: SupabaseClient<Database>,
  now: Date
): Promise<HouseEvent[]> {
  const startOfToday = cphToUtc(cphDate(now), "00:00");
  const { data, error } = await supabase
    .from("house_events")
    .select(
      "house_event_description, house_event_end_at, house_event_id, house_event_start_at, house_event_title, house_event_rooms(house_event_room_room_id, rooms(room_name))"
    )
    .gt("house_event_end_at", startOfToday.toISOString())
    .order("house_event_start_at", { ascending: true })
    // Bounded: a few internal events a month.
    .limit(200);
  if (error) {
    throw new Error(`could not list house events: ${error.message}`);
  }
  return data.map(toHouseEvent);
}

// The rooms an event can block: the active ones, in display order.
export async function listRoomOptions(
  supabase: SupabaseClient<Database>
): Promise<HouseEventRoom[]> {
  const { data, error } = await supabase
    .from("rooms")
    .select("room_id, room_name")
    .eq("room_is_active", true)
    .order("room_name")
    .limit(200);
  if (error) {
    throw new Error(`could not list rooms: ${error.message}`);
  }
  return data.map((room) => ({
    roomId: room.room_id,
    roomName: room.room_name,
  }));
}
