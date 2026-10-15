import type { Metadata } from "next";
import { HouseEventSheet } from "@/components/house-events/house-event-sheet";
import { HouseEventTable } from "@/components/house-events/house-event-table";
import { PageHeader, PagePanel } from "@/components/shell/page";
import {
  listHouseEventsFromToday,
  listRoomOptions,
} from "@/lib/house-events/data";
import { createClient } from "@/lib/supabase/server";
import { messages } from "@/messages/da";

const copy = messages.houseEvents;

export const metadata: Metadata = {
  title: copy.title,
};

// House Events (admin, #12, Bilag 1 "Kalender og opslagstavle"): the
// internal events that block rooms, split out of /admin/notices (#90) so
// the page has its own URL and fetches only its own data. The admin side
// panel creates and edits.
export default async function AdminHouseEventsPage() {
  const supabase = await createClient();
  const now = new Date();
  const [events, rooms] = await Promise.all([
    listHouseEventsFromToday(supabase, now),
    listRoomOptions(supabase),
  ]);

  return (
    <>
      <PageHeader title={copy.title} />
      <PagePanel>
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <HouseEventSheet initial={null} rooms={rooms} />
          </div>
          <HouseEventTable events={events} rooms={rooms} />
        </div>
      </PagePanel>
    </>
  );
}
