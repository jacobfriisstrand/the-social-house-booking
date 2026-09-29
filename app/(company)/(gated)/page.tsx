import { z } from "zod";
import { DateControl } from "@/components/day-grid/date-control";
import { DayGrid } from "@/components/day-grid/day-grid";
import { NotAuthorizedAlert } from "@/components/not-authorized-alert";
import { NoticeStrip } from "@/components/notice-board/notice-strip";
import { RoomCarousel } from "@/components/rooms/room-carousel";
import { PageHeader, PagePanel } from "@/components/shell/page";
import { requireSession } from "@/lib/auth/require-session";
import { getBookingViewer, viewerDiscount } from "@/lib/bookings/viewer";
import { cphDate } from "@/lib/domain/opening-hours";
import { formatDateString } from "@/lib/format";
import {
  listDayBookingDetails,
  listDayEntries,
  listTodayHouseEvents,
} from "@/lib/notice-board/data";
import { buildDayGrid } from "@/lib/notice-board/grid";
import { listShownNotices } from "@/lib/notices/data";
import { listPublicRooms } from "@/lib/rooms/public-data";
import { createClient } from "@/lib/supabase/server";
import { messages } from "@/messages/da";

const copy = messages.home;

type SearchParams = Promise<{ dato?: string; unauthorized?: string }>;

// The day to show: ?dato=yyyy-mm-dd, or today in Copenhagen (ADR-0021).
const dayParam = z.iso.date();
const pageDate = (dato: string | undefined, today: string): string =>
  dayParam.safeParse(dato).data ?? today;

// Hjem, the notice board (#12, DESIGN.md "Hjem"): notices and today's
// House Events, the day grid with each room's status, and the rooms. One
// home for everyone; the shell (#55) owns the sidebar, the title, the
// panel and the footer line. Every read runs in one round trip; the grid
// is assembled here and only rendered on the client.
export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [params, session] = await Promise.all([searchParams, requireSession()]);
  const now = new Date();
  const today = cphDate(now);
  const date = pageDate(params.dato, today);
  const isAdmin = session.appRole === "admin";
  const supabase = await createClient();
  const [viewer, rooms, entries, events, details, notices] = await Promise.all([
    getBookingViewer(supabase, session),
    listPublicRooms(supabase),
    listDayEntries(supabase, date),
    listTodayHouseEvents(supabase, now),
    listDayBookingDetails(supabase, date, isAdmin),
    listShownNotices(supabase, now),
  ]);
  const grid = buildDayGrid({
    date,
    details,
    entries,
    isToday: date === today,
    now,
    rooms,
  });

  return (
    <>
      {params.unauthorized ? <NotAuthorizedAlert /> : null}
      <PageHeader title={messages.shell.home} />
      <PagePanel>
        <NoticeStrip events={events} isAdmin={isAdmin} notices={notices} />
        <section
          aria-labelledby="day-grid-title"
          className="flex flex-col gap-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-medium text-lg" id="day-grid-title">
              {copy.dayTitle}
            </h2>
            <DateControl date={date} />
          </div>
          <DayGrid
            columns={grid.columns}
            date={date}
            dateLabel={formatDateString(date)}
            entries={grid.entries}
            rows={grid.rows}
            viewer={viewer}
          />
        </section>
        <RoomCarousel discountPercent={viewerDiscount(viewer)} rooms={rooms} />
      </PagePanel>
    </>
  );
}
