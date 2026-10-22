// The Lokale filter's choices on both Bookinger pages: every room,
// deactivated ones too, so a past booking's room stays selectable. Every
// session may read the rooms (policies/rooms.sql).
import type { SupabaseClient } from "@supabase/supabase-js";
import { rowsOrThrow } from "@/lib/bookings/rows";
import type { Database } from "@/lib/supabase/database.types";

/** One choice in a Lokale filter. */
export interface RoomOption {
  roomId: string;
  roomName: string;
}

export async function listRoomOptions(
  supabase: SupabaseClient<Database>
): Promise<RoomOption[]> {
  const result = await supabase
    .from("rooms")
    .select("room_id, room_name")
    .order("room_name");
  return rowsOrThrow(result, "filter rooms").map((room) => ({
    roomId: room.room_id,
    roomName: room.room_name,
  }));
}
