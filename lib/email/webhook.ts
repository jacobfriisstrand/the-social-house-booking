// Resend delivery webhook: signature check, payload schema, and the event ->
// status mapping (docs/agents/email.md). Pure; the route handler in
// app/api/webhooks/resend/route.ts does the I/O. Resend signs with the svix
// header names (svix-id, svix-timestamp, svix-signature).

import { Webhook } from "standardwebhooks";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";

type OutboundEmailStatus = Database["public"]["Enums"]["outbound_email_status"];

export const resendWebhookEvent = z.object({
  created_at: z.string(),
  data: z.object({ email_id: z.string() }),
  type: z.string(),
});

const statusByEventType = {
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delivery_delayed",
  "email.sent": "sent",
} as const satisfies Record<string, OutboundEmailStatus>;

export type ResendEventType = keyof typeof statusByEventType;

export const resendEventStatus = (
  type: string
): OutboundEmailStatus | undefined =>
  statusByEventType[type as ResendEventType];

// Resend delivers at least once and out of order (docs/vendor/resend/
// webhooks-introduction.md), so a stale event never moves the status
// backwards: only a higher rank is applied.
const statusRank: Record<OutboundEmailStatus, number> = {
  bounced: 4,
  complained: 5,
  delivered: 3,
  delivery_delayed: 2,
  failed: 6,
  queued: 0,
  sent: 1,
};

export const isStatusProgression = (
  current: OutboundEmailStatus,
  next: OutboundEmailStatus
): boolean => statusRank[next] > statusRank[current];

// Resend signs the exact bytes it sends (Svix scheme): the svix-id,
// svix-timestamp and svix-signature headers carry an HMAC of the raw body.
export const isValidResendSignature = (
  rawBody: string,
  headers: {
    id: string | null;
    signature: string | null;
    timestamp: string | null;
  },
  secret: string
): boolean => {
  if (!(headers.id && headers.timestamp && headers.signature)) {
    return false;
  }
  try {
    new Webhook(secret).verify(rawBody, {
      "webhook-id": headers.id,
      "webhook-signature": headers.signature,
      "webhook-timestamp": headers.timestamp,
    });
    return true;
  } catch {
    return false;
  }
};
