// The Outlook sync job (#13, docs/agents/outlook-sync.md):
// netlify/functions/sync-calendar.mts POSTs here every five minutes with
// JOB_SECRET as a bearer token. Drains calendar_events of dirty mirror rows
// and pushes each one to Microsoft Graph (create/update/delete on the
// configured mailbox's calendar), answering with the counts.
// No session exists here, so it uses the service-role client (allowlist in
// docs/agents/supabase.md).
import { env } from "@/lib/env";
import { runScheduledJob } from "@/lib/jobs/run";
import type { GraphClientConfig, GraphCredential } from "@/lib/outlook/graph";
import { createGraphClient, OUTLOOK_PROD_MAILBOX } from "@/lib/outlook/graph";
import { syncCalendarEvents } from "@/lib/outlook/sync";
import { createAdminClient } from "@/lib/supabase/admin";

const runJob = (config: GraphClientConfig) => {
  const admin = createAdminClient();
  return syncCalendarEvents(admin, createGraphClient(config));
};

// The credential for the context: the certificate pair wins when complete
// (the preferred credential, #100 — nothing secret ever crosses to the
// tenant admin by mail); the client secret stays as the fallback, which is
// what the sandbox context carries. A context holding both keeps working on
// the certificate; a context with a half-set pair counts as unconfigured.
const credentialFromEnv = (): GraphCredential | null => {
  if (env.OUTLOOK_CLIENT_CERT && env.OUTLOOK_CLIENT_CERT_KEY) {
    return {
      certificate: env.OUTLOOK_CLIENT_CERT,
      kind: "certificate",
      privateKey: env.OUTLOOK_CLIENT_CERT_KEY,
    };
  }
  if (env.OUTLOOK_CLIENT_SECRET) {
    return { clientSecret: env.OUTLOOK_CLIENT_SECRET, kind: "secret" };
  }
  return null;
};

export async function POST(request: Request): Promise<Response> {
  // Empty means "not configured" (lib/env-schema.ts): the job stays off —
  // locally and on deploy previews — until the Graph variables are set for
  // the context: mailbox, tenant and client id, plus one complete credential.
  const credential = credentialFromEnv();
  const config: GraphClientConfig | null =
    env.OUTLOOK_TENANT_ID &&
    env.OUTLOOK_CLIENT_ID &&
    env.OUTLOOK_MAILBOX &&
    credential
      ? {
          clientId: env.OUTLOOK_CLIENT_ID,
          credential,
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
