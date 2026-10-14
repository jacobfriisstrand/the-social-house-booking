// The Outlook mirror job (docs/agents/outlook-sync.md). Netlify runs it
// every five minutes on the production deploy only. Like send-reminders it
// does nothing itself: it calls the job route, which owns the sync logic
// behind JOB_SECRET.
import { callScheduledJob } from "./common/job-call.mts";

export default async (): Promise<void> => {
  await callScheduledJob("/api/jobs/sync-calendar", "sync-calendar");
};

export const config = { schedule: "*/5 * * * *" };
