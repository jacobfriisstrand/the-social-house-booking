// The hourly job (docs/agents/email.md): netlify/functions/send-reminders.mts
// POSTs here with JOB_SECRET as a bearer token. Releases stale holds, then
// sends the due 24-hour reminders (Mail 5), and answers with the counts. No
// session exists here, so it uses the service-role client (allowlist in
// docs/agents/supabase.md).
import { sendDueReminders } from "@/lib/bookings/reminders";
import { runScheduledJob } from "@/lib/jobs/run";
import { createAdminClient } from "@/lib/supabase/admin";

const runJob = async () => {
  const admin = createAdminClient();
  const holds = await admin.rpc("expire_stale_holds");
  if (holds.error) {
    throw new Error(`could not expire stale holds: ${holds.error.message}`);
  }
  const reminders = await sendDueReminders(admin, new Date());
  return { holdsExpired: holds.data, reminders };
};

export async function POST(request: Request): Promise<Response> {
  return await runScheduledJob(request, async () =>
    Response.json(await runJob())
  );
}
