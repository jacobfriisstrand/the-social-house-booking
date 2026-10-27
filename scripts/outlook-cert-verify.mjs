#!/usr/bin/env node
// Standalone end-to-end verification for certificate credentials on the
// Outlook one-way sync (#100): mints a client-credentials token from a client
// assertion (RS256 JWT with the x5t thumbprint) exactly the way
// lib/outlook/graph.ts does at runtime, creates a throwaway Graph event on
// the mailbox and deletes it again. scripts/setup-azure-outlook.sh stage 5
// runs it; exit 0 only when token, create and delete all succeeded.
//
// Usage:
//   node scripts/outlook-cert-verify.mjs <certBase64> <keyBase64> <tenantId> <clientId> <mailbox>
// Both PEMs arrive base64-encoded (single lines) exactly as they are stored
// on Netlify: OUTLOOK_CLIENT_CERT, OUTLOOK_CLIENT_CERT_KEY.

import { createHash, createSign, randomUUID } from "node:crypto";

const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

const [certBase64, keyBase64, tenantId, clientId, mailbox] =
  process.argv.slice(2);
if (!(certBase64 && keyBase64 && tenantId && clientId && mailbox)) {
  fail(
    "usage: node scripts/outlook-cert-verify.mjs <certBase64> <keyBase64> <tenantId> <clientId> <mailbox>"
  );
}

const decode = (label, value) => {
  const text = Buffer.from(value, "base64").toString();
  if (!text.includes("-----BEGIN")) {
    fail(`${label} does not decode to a PEM`);
  }
  return text;
};

const certPem = decode("certificate", certBase64);
const keyPem = decode("private key", keyBase64);

// Mirrors certificateThumbprint in lib/outlook/graph.ts: SHA-1 over the
// certificate DER, base64url — Entra matches it against the uploaded cert.
const thumbprint = (pem) => {
  const body = pem
    .replace(/-----(BEGIN|END) CERTIFICATE-----/g, "")
    .replace(/\s+/g, "");
  return createHash("sha1")
    .update(Buffer.from(body, "base64"))
    .digest("base64url");
};

// Mirrors clientAssertion in lib/outlook/graph.ts: RFC 7523 JWT, Entra caps
// the lifetime at ten minutes.
const assertion = () => {
  const seconds = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT", x5t: thumbprint(certPem) };
  const claims = {
    aud: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    exp: seconds + 600,
    iss: clientId,
    jti: randomUUID(),
    nbf: seconds - 60,
    sub: clientId,
  };
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const signingInput = `${encode(header)}.${encode(claims)}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(keyPem);
  return `${signingInput}.${signature.toString("base64url")}`;
};

const EVENTS_URL = `https://graph.microsoft.com/v1.0/users/${mailbox}/events`;

const MILLISECONDS_ANNOTATION = /\.\d+Z$/;

const token = async () => {
  const body = new URLSearchParams({
    client_assertion: assertion(),
    client_assertion_type:
      "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_id: clientId,
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default",
  });
  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    { body, method: "POST" }
  );
  const json = await response.json().catch(() => ({}));
  if (!(response.ok && json.access_token)) {
    fail(
      `token request failed with ${response.status}: ${JSON.stringify(json).slice(0, 300)}`
    );
  }
  console.log(
    "✓ token acquired — certificate, key, tenant and client id are good"
  );
  return json.access_token;
};

const createEvent = async (bearerToken) => {
  const start = new Date();
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const stamp = (date) =>
    date.toISOString().replace(MILLISECONDS_ANNOTATION, ".000Z");
  const response = await fetch(EVENTS_URL, {
    body: JSON.stringify({
      end: { dateTime: stamp(end), timeZone: "UTC" },
      start: { dateTime: stamp(start), timeZone: "UTC" },
      subject: "Outlook sync smoke test — safe to delete",
    }),
    headers: {
      authorization: `Bearer ${bearerToken}`,
      "content-type": "application/json",
    },
    method: "POST",
  });
  const json = await response.json().catch(() => ({}));
  if (!(response.ok && json.id)) {
    fail(
      `event create failed with ${response.status}: ${JSON.stringify(json).slice(0, 300)}`
    );
  }
  console.log("✓ event created — consent and Calendars.ReadWrite are good");
  return json.id;
};

const deleteEvent = async (bearerToken, eventId) => {
  const response = await fetch(`${EVENTS_URL}/${encodeURIComponent(eventId)}`, {
    headers: { authorization: `Bearer ${bearerToken}` },
    method: "DELETE",
  });
  if (response.status === 204 || response.status === 404) {
    console.log("✓ deleted — nothing left behind in the calendar");
    return;
  }
  fail(
    `delete answered ${response.status} — remove 'Outlook sync smoke test' by hand`
  );
};

try {
  const bearerToken = await token();
  const eventId = await createEvent(bearerToken);
  await deleteEvent(bearerToken, eventId);
} catch (error) {
  fail(`unexpected failure: ${error?.message ?? String(error)}`);
}
