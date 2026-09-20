import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { AddOnView } from "@/components/bookings/addon-selection";
import { PageHeader, PagePanel } from "@/components/shell/page";
import { listRoomAddOns } from "@/lib/bookings/addon-lines";
import { isDevelopment } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { messages } from "@/messages/da";
import { DevBookingForm } from "./form";

export const metadata: Metadata = {
  title: messages.booking.demo.title,
};

// Development harness for the booker verification flow (#2): a bare
// booking form that creates the hold, then the real verification step. The
// booking dialog (#4) replaces the form; the step and the actions stay.
// The (gated) layout requires a session with completed master data, like
// the real flow; the actions check again.
export default async function DevBookingPage() {
  if (!isDevelopment) {
    redirect("/");
  }
  const supabase = await createClient();
  const { data: rooms } = await supabase
    .from("rooms")
    .select("room_id, room_name, room_capacity")
    .eq("room_is_active", true)
    .order("room_name");

  // The room's offered add-ons (#7), keyed by room for the form's room
  // select; a room without rows shows the empty copy.
  const roomRows = rooms ?? [];
  const addOnLists = await Promise.all(
    roomRows.map((room) => listRoomAddOns(supabase, room.room_id))
  );
  const addOnsByRoomId: Record<string, AddOnView[]> = {};
  for (const [index, room] of roomRows.entries()) {
    addOnsByRoomId[room.room_id] = addOnLists[index] ?? [];
  }

  return (
    <>
      <PageHeader title={messages.booking.demo.title} />
      <PagePanel>
        <div className="mx-auto w-full max-w-md">
          <DevBookingForm addOnsByRoomId={addOnsByRoomId} rooms={roomRows} />
        </div>
      </PagePanel>
    </>
  );
}
