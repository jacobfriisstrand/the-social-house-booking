// One of the two scheduled jobs (docs/agents/email.md). Netlify runs it
// hourly on the production deploy only. It does nothing itself: it calls the
// job route, which owns the reminder and hold-release logic behind
// JOB_SECRET.
import { callScheduledJob } from "./common/job-call.mts";

export default async (): Promise<void> => {
  await callScheduledJob("/api/jobs/send-reminders", "send-reminders");
};

export const config = { schedule: "@hourly" };
