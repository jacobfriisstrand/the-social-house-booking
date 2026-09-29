import type { Metadata } from "next";
import { HouseEventDialog } from "@/components/house-events/house-event-dialog";
import { HouseEventTable } from "@/components/house-events/house-event-table";
import { NoticeDialog } from "@/components/notices/notice-dialog";
import {
  NoticeTable,
  type NoticeTableRow,
} from "@/components/notices/notice-table";
import { PageHeader, PagePanel } from "@/components/shell/page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { noticeLastDay, noticeStatus } from "@/lib/domain/notice";
import {
  listRoomOptions,
  listUpcomingHouseEvents,
} from "@/lib/house-events/data";
import { listNotices, type Notice } from "@/lib/notices/data";
import { createClient } from "@/lib/supabase/server";
import { messages } from "@/messages/da";

const copy = messages.notices;

export const metadata: Metadata = {
  title: copy.title,
};

const toRow = (notice: Notice, now: Date): NoticeTableRow => {
  const endsAt = notice.endsAt ? new Date(notice.endsAt) : null;
  return {
    noticeId: notice.noticeId,
    status: noticeStatus({ endsAt, isActive: notice.isActive }, now),
    values: {
      body: notice.body,
      isActive: notice.isActive,
      lastDay: endsAt ? noticeLastDay(endsAt) : "",
      noticeId: notice.noticeId,
      title: notice.title,
    },
  };
};

// Opslag (admin, #12; DESIGN.md "Opslag (admin)"): the notice board's
// content. "Beskeder" holds the practical notices, "House Events" the
// internal events that block rooms. Each tab has its own create button; a
// dialog creates and edits.
export default async function AdminNoticesPage() {
  const supabase = await createClient();
  const now = new Date();
  const [notices, events, rooms] = await Promise.all([
    listNotices(supabase),
    listUpcomingHouseEvents(supabase, now),
    listRoomOptions(supabase),
  ]);

  return (
    <>
      <PageHeader title={copy.title} />
      <PagePanel>
        <Tabs className="w-full" defaultValue="notices">
          <TabsList>
            <TabsTrigger value="notices">{copy.tabs.notices}</TabsTrigger>
            <TabsTrigger value="house-events">
              {copy.tabs.houseEvents}
            </TabsTrigger>
          </TabsList>
          <TabsContent className="flex flex-col gap-4 pt-4" value="notices">
            <div className="flex justify-end">
              <NoticeDialog initial={null} />
            </div>
            <NoticeTable rows={notices.map((notice) => toRow(notice, now))} />
          </TabsContent>
          <TabsContent
            className="flex flex-col gap-4 pt-4"
            value="house-events"
          >
            <div className="flex justify-end">
              <HouseEventDialog initial={null} rooms={rooms} />
            </div>
            <HouseEventTable events={events} rooms={rooms} />
          </TabsContent>
        </Tabs>
      </PagePanel>
    </>
  );
}
