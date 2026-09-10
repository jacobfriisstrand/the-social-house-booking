// Resend -> outbound_emails: delivery-status webhook (docs/agents/email.md).
// Verifies the Svix signature with RESEND_WEBHOOK_SECRET, maps the event to a
// status, and updates the send log by outbound_email_resend_id. The update is
// awaited before responding so Resend's retry schedule covers a database
// outage.
import { captureException } from "@sentry/nextjs";
import {
  isStatusProgression,
  isValidResendSignature,
  parseResendEvent,
  type ResendEventStatus,
  type ResendWebhookEvent,
  resendEventStatus,
} from "@/lib/email/webhook";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

// The verification gate: either a response to reject the request, or the
// parsed delivery event.
type VerifiedDelivery =
  | { ok: true; event: ResendWebhookEvent }
  | { ok: false; response: Response };

// Resend signs with the svix header names; the webhook-* names are the
// fallback some clients send.
const readSvixHeaders = (request: Request) => ({
  id: request.headers.get("svix-id") ?? request.headers.get("webhook-id"),
  signature:
    request.headers.get("svix-signature") ??
    request.headers.get("webhook-signature"),
  timestamp:
    request.headers.get("svix-timestamp") ??
    request.headers.get("webhook-timestamp"),
});

const verifyDelivery = async (request: Request): Promise<VerifiedDelivery> => {
  const secret = env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return {
      ok: false,
      response: new Response("Resend webhook is not configured", {
        status: 503,
      }),
    };
  }
  const rawBody = await request.text();
  if (!isValidResendSignature(rawBody, readSvixHeaders(request), secret)) {
    return {
      ok: false,
      response: new Response("Invalid signature", { status: 401 }),
    };
  }
  const event = parseResendEvent(rawBody);
  return event
    ? { event, ok: true }
    : {
        ok: false,
        response: new Response("Unexpected payload", { status: 400 }),
      };
};

const persistStatus = async (
  admin: AdminClient,
  outboundEmailId: string,
  status: ResendEventStatus,
  event: ResendWebhookEvent
): Promise<Response> => {
  const sentAt =
    event.type === "email.sent"
      ? { outbound_email_sent_at: event.created_at }
      : {};
  const update = await admin
    .from("outbound_emails")
    .update({ outbound_email_status: status, ...sentAt })
    .eq("outbound_email_id", outboundEmailId);
  if (update.error) {
    captureException(update.error, {
      tags: { resend_id: event.data.email_id },
    });
    return new Response("Could not update the send log", { status: 500 });
  }
  return new Response(null, { status: 200 });
};

// Maps the event to a status and applies it to the send log. A stale event
// never moves the status backwards (lib/email/webhook.ts). Unknown statuses
// and unknown send-log rows are acknowledged with 204.
const updateSendLog = async (
  event: ResendWebhookEvent,
  status: ResendEventStatus
): Promise<Response> => {
  const admin = createAdminClient();
  const select = await admin
    .from("outbound_emails")
    .select("outbound_email_id, outbound_email_status")
    .eq("outbound_email_resend_id", event.data.email_id)
    .maybeSingle();
  if (select.error) {
    captureException(select.error, {
      tags: { resend_id: event.data.email_id },
    });
    return new Response("Could not read the send log", { status: 500 });
  }
  if (
    select.data &&
    isStatusProgression(select.data.outbound_email_status, status)
  ) {
    return persistStatus(admin, select.data.outbound_email_id, status, event);
  }
  return new Response(null, { status: 204 });
};

export async function POST(request: Request): Promise<Response> {
  const verified = await verifyDelivery(request);
  if (!verified.ok) {
    return verified.response;
  }
  const status = resendEventStatus(verified.event.type);
  if (!status) {
    return new Response(null, { status: 204 });
  }
  return updateSendLog(verified.event, status);
}
