// Notices on the notice board (#12): the admin switches a notice on or off
// and may pick the last day it shows. It then disappears at the midnight
// that ends that day in Copenhagen (ADR-0021); notice_ends_at stores that
// instant. Members only ever read notices that are shown (RLS).
import { cphDate } from "./opening-hours";
import { cphToUtc } from "./time";

export type NoticeStatus = "ended" | "off" | "shown";

export interface NoticeVisibility {
  endsAt: Date | null;
  isActive: boolean;
}

// "2026-10-24" → the instant 24:00 that day, Copenhagen time.
export function noticeEndsAt(lastDay: string): Date {
  return cphToUtc(lastDay, "24:00");
}

// The stored end back to the last day it shows: the instant is midnight,
// which already belongs to the next date.
export function noticeLastDay(endsAt: Date): string {
  return cphDate(new Date(endsAt.getTime() - 1));
}

export function noticeStatus(
  { endsAt, isActive }: NoticeVisibility,
  now: Date
): NoticeStatus {
  if (!isActive) {
    return "off";
  }
  return endsAt && endsAt <= now ? "ended" : "shown";
}
