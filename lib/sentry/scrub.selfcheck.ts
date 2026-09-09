// Assert-based check for lib/sentry/scrub.ts. Run: node lib/sentry/scrub.selfcheck.ts
// Superseded when Vitest lands (issue #31): fold these cases into lib/sentry/scrub.test.ts.
import assert from "node:assert/strict";
import type { ErrorEvent } from "@sentry/nextjs";
import { scrubEvent } from "./scrub.ts";

const event: ErrorEvent = {
  breadcrumbs: [
    {
      category: "action",
      data: { booker_email: "anna@example.dk", booking_number: "B-0001" },
    },
  ],
  contexts: {
    booking: { company_contact_phone: "12345678", company_id: "c1" },
    browser: { name: "Safari", version: "26" },
  },
  exception: {
    values: [
      {
        stacktrace: { frames: [{ filename: "app/page.tsx" }] },
        type: "Error",
        value: "boom",
      },
    ],
  },
  extra: { nested: { bookerName: "Anna" }, practicalNotes: "allergies" },
  request: {
    cookies: { session: "jwt" },
    data: '{"email":"anna@example.dk"}',
    headers: { cookie: "session=jwt", "user-agent": "ua" },
    url: "https://example.dk/booking",
  },
  tags: { booking_number: "B-0001", email: "anna@example.dk" },
  type: undefined,
  user: { email: "anna@example.dk", id: "u1" },
};

const scrubbed = scrubEvent(event);

// Dropped outright.
assert.equal(scrubbed.user, undefined);
assert.equal(scrubbed.request?.data, undefined);
assert.equal(scrubbed.request?.cookies, undefined);
assert.equal(scrubbed.request?.headers?.cookie, "[Filtered]");

// Personal keys are filtered wherever app code can put them; the rest survives.
assert.equal(scrubbed.request?.headers?.["user-agent"], "ua");
assert.equal(scrubbed.request?.url, "https://example.dk/booking");
assert.equal(scrubbed.extra?.practicalNotes, "[Filtered]");
assert.deepEqual(scrubbed.extra?.nested, { bookerName: "[Filtered]" });
assert.equal(scrubbed.tags?.email, "[Filtered]");
assert.equal(scrubbed.tags?.booking_number, "B-0001");
assert.deepEqual(scrubbed.breadcrumbs?.[0]?.data, {
  booker_email: "[Filtered]",
  booking_number: "B-0001",
});
assert.deepEqual(scrubbed.contexts?.booking, {
  company_contact_phone: "[Filtered]",
  company_id: "c1",
});

// SDK-owned subtrees keep their `name` and `filename` keys.
assert.equal(scrubbed.contexts?.browser?.name, "Safari");
assert.equal(
  scrubbed.exception?.values?.[0]?.stacktrace?.frames?.[0]?.filename,
  "app/page.tsx"
);

// The input is not mutated.
assert.equal(event.tags?.email, "anna@example.dk");
assert.equal(event.user?.id, "u1");

process.stdout.write("sentry scrub ok\n");
