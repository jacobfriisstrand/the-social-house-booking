import type { Metadata } from "next";
import { NoticeSheet } from "@/components/notices/notice-sheet";
import {
  NoticeTable,
  type NoticeTableRow,
} from "@/components/notices/notice-table";
import { PageHeader, PagePanel } from "@/components/shell/page";
import { noticeLastDay, noticeStatus } from "@/lib/domain/notice";
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
// practical messages. The admin side panel creates and edits. #90 moved
// the House Events onto their own /admin/house-events page.
export default async function AdminNoticesPage() {
  const supabase = await createClient();
  const now = new Date();
  const notices = await listNotices(supabase);

  return (
    <>
      <PageHeader title={copy.title} />
      <PagePanel>
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <NoticeSheet initial={null} />
          </div>
          <NoticeTable rows={notices.map((notice) => toRow(notice, now))} />
        </div>
      </PagePanel>
    </>
  );
}
