// Webhook helpers: signature verification, event mapping, and the monotonic
// status guard (docs/agents/email.md; delivery rules in docs/vendor/resend/).

import { Webhook } from "standardwebhooks";
import { describe, expect, it } from "vitest";
import {
  isStatusProgression,
  isValidResendSignature,
  parseResendEvent,
  resendEventStatus,
} from "./webhook";

const SECRET = `whsec_${Buffer.from("test-webhook-secret").toString("base64")}`;
const payload = JSON.stringify({
  created_at: "2026-09-10T10:00:00.000Z",
  data: { email_id: "resend-1" },
  type: "email.delivered",
});

const signedHeaders = (body: string, secret: string) => {
  const id = "msg_test";
  const signedAt = new Date();
  const signature = new Webhook(secret).sign(id, signedAt, body);
  return {
    id,
    signature,
    timestamp: Math.floor(signedAt.getTime() / 1000).toString(),
  };
};

describe("resendEventStatus", () => {
  it("maps the five documented events to send-log statuses", () => {
    expect(resendEventStatus("email.sent")).toBe("sent");
    expect(resendEventStatus("email.delivered")).toBe("delivered");
    expect(resendEventStatus("email.bounced")).toBe("bounced");
    expect(resendEventStatus("email.complained")).toBe("complained");
    expect(resendEventStatus("email.delivery_delayed")).toBe(
      "delivery_delayed"
    );
  });

  it("returns undefined for events we do not track", () => {
    expect(resendEventStatus("email.opened")).toBeUndefined();
    expect(resendEventStatus("contact.created")).toBeUndefined();
  });
});

describe("parseResendEvent", () => {
  it("parses a valid delivery event", () => {
    expect(parseResendEvent(payload)).toEqual({
      created_at: "2026-09-10T10:00:00.000Z",
      data: { email_id: "resend-1" },
      type: "email.delivered",
    });
  });

  it("returns null for invalid JSON", () => {
    expect(parseResendEvent("not json")).toBeNull();
  });

  it("returns null when the payload does not match the schema", () => {
    expect(parseResendEvent(JSON.stringify({ type: "email.sent" }))).toBeNull();
  });
});

describe("isStatusProgression", () => {
  it("allows queued -> sent -> delivery_delayed -> delivered", () => {
    expect(isStatusProgression("queued", "sent")).toBe(true);
    expect(isStatusProgression("sent", "delivery_delayed")).toBe(true);
    expect(isStatusProgression("delivery_delayed", "delivered")).toBe(true);
  });

  it("rejects stale or duplicate events", () => {
    expect(isStatusProgression("delivered", "sent")).toBe(false);
    expect(isStatusProgression("delivered", "delivery_delayed")).toBe(false);
    expect(isStatusProgression("sent", "sent")).toBe(false);
    expect(isStatusProgression("bounced", "delivered")).toBe(false);
  });

  it("lets bounced and complained overtake any earlier state", () => {
    expect(isStatusProgression("delivered", "bounced")).toBe(true);
    expect(isStatusProgression("delivered", "complained")).toBe(true);
  });
});

describe("isValidResendSignature", () => {
  it("accepts a signature created with the same secret", () => {
    expect(
      isValidResendSignature(
        payload,
        {
          id: "msg_test",
          signature: signedHeaders(payload, SECRET).signature,
          timestamp: signedHeaders(payload, SECRET).timestamp,
        },
        SECRET
      )
    ).toBe(true);
  });

  it("rejects a signature made with another secret", () => {
    const headers = signedHeaders(payload, "whsec_other");
    expect(isValidResendSignature(payload, headers, SECRET)).toBe(false);
  });

  it("rejects a tampered payload", () => {
    const headers = signedHeaders(payload, SECRET);
    expect(isValidResendSignature(`${payload} `, headers, SECRET)).toBe(false);
  });

  it("rejects missing svix headers", () => {
    expect(
      isValidResendSignature(
        payload,
        { id: null, signature: "v1,x", timestamp: "1757500000" },
        SECRET
      )
    ).toBe(false);
    expect(
      isValidResendSignature(
        payload,
        { id: "msg_test", signature: null, timestamp: "1757500000" },
        SECRET
      )
    ).toBe(false);
    expect(
      isValidResendSignature(
        payload,
        { id: "msg_test", signature: "v1,x", timestamp: null },
        SECRET
      )
    ).toBe(false);
  });
});
