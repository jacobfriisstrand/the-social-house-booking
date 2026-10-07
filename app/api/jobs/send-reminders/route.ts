// The hourly job (docs/agents/email.md): netlify/functions/send-reminders.mts
// POSTs here with JOB_SECRET as a bearer token. Releases stale holds, then
// sends the due 24-hour reminders (Mail 5), and answers with the counts. No
// session exists here, so it uses the service-role client (allowlist in
// docs/agents/supabase.md).
import { timingSafeEqual } from "node:crypto";
import { captureException } from "@sentry/nextjs";
import { sendDueReminders } from "@/lib/bookings/reminders";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

const isAuthorized = (header: string | null, secret: string): boolean => {
  const expected = Buffer.from(`Bearer ${secret}`);
  const provided = Buffer.from(header ?? "");
  return (
    provided.length === expected.length && timingSafeEqual(expected, provided)
  );
};

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
  const secret = env.JOB_SECRET;
  if (!secret) {
    return new Response("Job is not configured", { status: 503 });
  }
  if (!isAuthorized(request.headers.get("authorization"), secret)) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    return Response.json(await runJob());
  } catch (error) {
    captureException(error);
    return new Response("Job failed", { status: 500 });
  }
}
