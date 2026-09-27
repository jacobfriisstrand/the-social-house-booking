import type { Metadata } from "next";
import { RoomGrid } from "@/components/rooms/room-grid";
import { PageHeader, PagePanel } from "@/components/shell/page";
import type { Session } from "@/lib/auth/get-session";
import { requireSession } from "@/lib/auth/require-session";
import { listBlockedPeriods } from "@/lib/bookings/availability";
import {
  type BookingViewer,
  getBookingViewer,
  viewerDiscount,
} from "@/lib/bookings/viewer";
import { periodIsBookable } from "@/lib/domain/availability";
import { bufferEndAt } from "@/lib/domain/buffer";
import { cphToUtc } from "@/lib/domain/time";
import { listPublicRooms, type PublicRoom } from "@/lib/rooms/public-data";
import { createClient } from "@/lib/supabase/server";
import {
  parseRoomSearch,
  type RoomSearch,
  roomSearchQuery,
} from "@/lib/validation/room-search";
import { messages } from "@/messages/da";

export const metadata: Metadata = {
  title: messages.rooms.listTitle,
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const matchesSearch = (room: PublicRoom, search: RoomSearch): boolean =>
  room.capacity >= search.personer;

// The rooms that are free for the searched period and hold the
// participants (Bilag 1 "Lokaler og søgning"): a room is free when the
// booking plus its buffer fits the opening hours and collides with no live
// booking or House Event. The blocked periods for the search window depend
// only on the URL, not on the room rows, so the page loads them in the same
// round trip as the catalogue instead of after it.
function filterRooms(
  rooms: PublicRoom[],
  search: RoomSearch,
  blocked: Awaited<ReturnType<typeof listBlockedPeriods>>
): PublicRoom[] {
  const startAt = cphToUtc(search.dato, search.fra);
  const endAt = cphToUtc(search.dato, search.til);
  return rooms.filter(
    (room) =>
      matchesSearch(room, search) &&
      periodIsBookable({
        blocked: blocked.get(room.roomId) ?? [],
        endAt,
        specialDays: room.specialDays,
        startAt,
        weekly: room.weekly,
      })
  );
}

const searchCopy = {
  emptyDescription: messages.rooms.freeEmptyDescription,
  emptyTitle: messages.rooms.freeEmptyTitle,
  title: messages.rooms.freeTitle,
};
const allRoomsCopy = {
  emptyDescription: messages.rooms.publicEmptyDescription,
  emptyTitle: messages.rooms.publicEmptyTitle,
  title: messages.rooms.listTitle,
};

// One parallel round trip for every read the page needs: the catalogue, the
// viewer, and — when the URL carries a search — the blocked periods for the
// search window, which depend only on the URL, not on the room rows.
async function loadRoomsPage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  session: Session,
  search: RoomSearch | null
): Promise<{ shown: PublicRoom[]; viewer: BookingViewer }> {
  const [rooms, viewer, blocked] = await Promise.all([
    listPublicRooms(supabase),
    getBookingViewer(supabase, session),
    search
      ? listBlockedPeriods(supabase, {
          from: cphToUtc(search.dato, search.fra),
          to: bufferEndAt(cphToUtc(search.dato, search.til)),
        })
      : Promise.resolve(null),
  ]);
  return {
    shown: search && blocked ? filterRooms(rooms, search, blocked) : rooms,
    viewer,
  };
}

// Lokaler (member) and the search results "Ledige lokaler" (DESIGN.md
// "Book lokale" step 2): the same card grid, filtered when the URL carries
// a search. Admins see the normal price only; they have no discount.
export default async function RoomsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const search = parseRoomSearch(await searchParams);
  const session = await requireSession();
  const supabase = await createClient();
  const { shown, viewer } = await loadRoomsPage(supabase, session, search);
  const copy = search ? searchCopy : allRoomsCopy;

  return (
    <>
      <PageHeader title={copy.title} />
      <PagePanel>
        <RoomGrid
          discountPercent={viewerDiscount(viewer)}
          emptyDescription={copy.emptyDescription}
          emptyTitle={copy.emptyTitle}
          query={roomSearchQuery(search ?? {})}
          rooms={shown}
        />
      </PagePanel>
    </>
  );
}
