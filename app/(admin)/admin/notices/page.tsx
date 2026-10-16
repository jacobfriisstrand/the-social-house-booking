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
      {/* The create button rides the shell header like the other admin
          pages (2026-10-16, the rooms page's pattern). */}
      <PageHeader title={copy.title}>
        <NoticeSheet initial={null} />
      </PageHeader>
      <PagePanel>
        <NoticeTable rows={notices.map((notice) => toRow(notice, now))} />
      </PagePanel>
    </>
  );
}
