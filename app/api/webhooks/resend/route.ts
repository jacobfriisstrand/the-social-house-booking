// Resend -> outbound_emails: delivery-status webhook (docs/agents/email.md).
// Verifies the Svix signature with RESEND_WEBHOOK_SECRET, maps the event to a
// status, and updates the send log by outbound_email_resend_id. The update is
// awaited before responding so Resend's retry schedule covers a database
// outage.
import { captureException } from "@sentry/nextjs";
import {
  isStatusProgression,
  isValidResendSignature,
  resendEventStatus,
  resendWebhookEvent,
} from "@/lib/email/webhook";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const secret = env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Resend webhook is not configured", { status: 503 });
  }
  const rawBody = await request.text();
  const headers = {
    id: request.headers.get("svix-id") ?? request.headers.get("webhook-id"),
    signature:
      request.headers.get("svix-signature") ??
      request.headers.get("webhook-signature"),
    timestamp:
      request.headers.get("svix-timestamp") ??
      request.headers.get("webhook-timestamp"),
  };
  if (!isValidResendSignature(rawBody, headers, secret)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const parsed = resendWebhookEvent.safeParse(
    (() => {
      try {
        return JSON.parse(rawBody) as unknown;
      } catch {
        return null;
      }
    })()
  );
  if (!parsed.success) {
    return new Response("Unexpected payload", { status: 400 });
  }
  const status = resendEventStatus(parsed.data.type);
  if (!status) {
    return new Response(null, { status: 204 });
  }

  const admin = createAdminClient();
  const select = await admin
    .from("outbound_emails")
    .select("outbound_email_id, outbound_email_status")
    .eq("outbound_email_resend_id", parsed.data.data.email_id)
    .maybeSingle();
  if (select.error) {
    captureException(select.error, {
      tags: { resend_id: parsed.data.data.email_id },
    });
    return new Response("Could not read the send log", { status: 500 });
  }
  if (!select.data) {
    return new Response(null, { status: 204 });
  }
  if (!isStatusProgression(select.data.outbound_email_status, status)) {
    return new Response(null, { status: 204 });
  }

  const update = await admin
    .from("outbound_emails")
    .update({
      outbound_email_status: status,
      ...(parsed.data.type === "email.sent"
        ? { outbound_email_sent_at: parsed.data.created_at }
        : {}),
    })
    .eq("outbound_email_id", select.data.outbound_email_id);
  if (update.error) {
    captureException(update.error, {
      tags: { resend_id: parsed.data.data.email_id },
    });
    return new Response("Could not update the send log", { status: 500 });
  }
  return new Response(null, { status: 200 });
}
