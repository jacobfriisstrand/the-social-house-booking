// The Outlook sync job (#13, docs/agents/outlook-sync.md):
// netlify/functions/sync-calendar.mts POSTs here every five minutes with
// JOB_SECRET as a bearer token. Drains calendar_events of dirty mirror rows
// and pushes each one to Microsoft Graph (create/update/delete on the
// shared booking@thesocialhouse.dk calendar), answering with the counts.
// No session exists here, so it uses the service-role client (allowlist in
// docs/agents/supabase.md).
import { captureException } from "@sentry/nextjs";
import { env } from "@/lib/env";
import { isJobAuthorized } from "@/lib/jobs/authorize";
import { createGraphClient } from "@/lib/outlook/graph";
import { syncCalendarEvents } from "@/lib/outlook/sync";
import { createAdminClient } from "@/lib/supabase/admin";

// Empty means "not configured" (lib/env-schema.ts): the job stays off —
// locally, on deploy previews and on the develop deploy — until the three
// Graph app variables are set.
const graphConfig = () =>
  env.OUTLOOK_TENANT_ID && env.OUTLOOK_CLIENT_ID && env.OUTLOOK_CLIENT_SECRET
    ? {
        clientId: env.OUTLOOK_CLIENT_ID,
        clientSecret: env.OUTLOOK_CLIENT_SECRET,
        tenantId: env.OUTLOOK_TENANT_ID,
      }
    : null;

const runJob = () => {
  const config = graphConfig();
  if (!config) {
    throw new Error("Outlook Graph credentials are not configured");
  }
  const admin = createAdminClient();
  return syncCalendarEvents(admin, createGraphClient(config));
};

export async function POST(request: Request): Promise<Response> {
  const secret = env.JOB_SECRET;
  if (!secret) {
    return new Response("Job is not configured", { status: 503 });
  }
  if (!graphConfig()) {
    return new Response("Job is not configured", { status: 503 });
  }
  if (!isJobAuthorized(request.headers.get("authorization"), secret)) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    return Response.json(await runJob());
  } catch (error) {
    captureException(error);
    return new Response("Job failed", { status: 500 });
  }
}
