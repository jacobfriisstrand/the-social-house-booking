import { z } from "zod";
import { DateControl } from "@/components/day-grid/date-control";
import { DayGrid } from "@/components/day-grid/day-grid";
import { NotAuthorizedAlert } from "@/components/not-authorized-alert";
import { NoticeStrip } from "@/components/notice-board/notice-strip";
import { RoomCarousel } from "@/components/rooms/room-carousel";
import { PageHeader, PagePanel } from "@/components/shell/page";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { getCurrentTerms } from "@/lib/terms/data";
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
  const [viewer, rooms, entries, events, details, notices, terms] =
    await Promise.all([
      getBookingViewer(supabase, session),
      listPublicRooms(supabase),
      listDayEntries(supabase, date),
      listTodayHouseEvents(supabase, now),
      listDayBookingDetails(supabase, date, isAdmin),
      listShownNotices(supabase, now),
      getCurrentTerms(),
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
        <NoticeStrip
          events={events}
          isAdmin={isAdmin}
          notices={notices}
          now={now}
        />
        {/* shrink-0: the panel is a fixed-height scrolling column. On phone
            the date control drops under the title. */}
        <Card className="shrink-0">
          <CardHeader>
            <CardTitle className="text-lg">
              <h2>{copy.dayTitle}</h2>
            </CardTitle>
            <CardAction className="max-sm:col-start-1 max-sm:row-start-2 max-sm:justify-self-start">
              <DateControl date={date} />
            </CardAction>
          </CardHeader>
          <CardContent>
            <DayGrid
              columns={grid.columns}
              date={date}
              dateLabel={formatDateString(date)}
              entries={grid.entries}
              rows={grid.rows}
              terms={terms}
              viewer={viewer}
            />
          </CardContent>
        </Card>
        <RoomCarousel discountPercent={viewerDiscount(viewer)} rooms={rooms} />
      </PagePanel>
    </>
  );
}
