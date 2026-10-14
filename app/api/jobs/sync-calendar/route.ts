// The Outlook sync job (#13, docs/agents/outlook-sync.md):
// netlify/functions/sync-calendar.mts POSTs here every five minutes with
// JOB_SECRET as a bearer token. Drains calendar_events of dirty mirror rows
// and pushes each one to Microsoft Graph (create/update/delete on the
// configured mailbox's calendar), answering with the counts.
// No session exists here, so it uses the service-role client (allowlist in
// docs/agents/supabase.md).
import { env } from "@/lib/env";
import { runScheduledJob } from "@/lib/jobs/run";
import type { GraphClientConfig } from "@/lib/outlook/graph";
import { createGraphClient, OUTLOOK_PROD_MAILBOX } from "@/lib/outlook/graph";
import { syncCalendarEvents } from "@/lib/outlook/sync";
import { createAdminClient } from "@/lib/supabase/admin";

const runJob = (config: GraphClientConfig) => {
  const admin = createAdminClient();
  return syncCalendarEvents(admin, createGraphClient(config));
};

export async function POST(request: Request): Promise<Response> {
  // Empty means "not configured" (lib/env-schema.ts): the job stays off —
  // locally and on deploy previews — until the four Graph variables are set
  // for the context. Production carries the booking mailbox; the develop
  // context carries the sandbox pair for test runs.
  const config =
    env.OUTLOOK_TENANT_ID &&
    env.OUTLOOK_CLIENT_ID &&
    env.OUTLOOK_CLIENT_SECRET &&
    env.OUTLOOK_MAILBOX
      ? {
          clientId: env.OUTLOOK_CLIENT_ID,
          clientSecret: env.OUTLOOK_CLIENT_SECRET,
          mailbox: env.OUTLOOK_MAILBOX,
          tenantId: env.OUTLOOK_TENANT_ID,
        }
      : null;
  if (!config) {
    return new Response("Job is not configured", { status: 503 });
  }
  return await runScheduledJob(request, async () => {
    // Bilag 1 fixes the production mailbox (ADR-0003): it runs only on
    // production, and production runs only against it. A wrong value on the
    // production context, or the production mailbox pointed at a development
    // context, must stop the mirror loudly rather than move data silently —
    // so this throws and reaches Sentry. The message names no received
    // value: Sentry messages become public issue titles
    // (docs/compliance/gdpr-data-inventory.md) and a wrong mailbox may be a
    // personal address. Read the value back with netlify env:get instead.
    const prodMailboxMismatch =
      (env.APP_ENV === "production") !==
      (config.mailbox === OUTLOOK_PROD_MAILBOX);
    if (prodMailboxMismatch) {
      throw new Error(
        `OUTLOOK_MAILBOX must be ${OUTLOOK_PROD_MAILBOX} only when APP_ENV is production (Bilag 1)`
      );
    }
    return Response.json(await runJob(config));
  });
}
