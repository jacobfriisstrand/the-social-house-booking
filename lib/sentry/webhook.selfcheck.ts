// Assert-based check for lib/sentry/webhook.ts. Run: node lib/sentry/webhook.selfcheck.ts
// Superseded when Vitest lands (issue #31): fold these cases into lib/sentry/webhook.test.ts.
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  buildGithubIssue,
  isValidSentrySignature,
  sentryIssueWebhook,
} from "./webhook.ts";

const secret = "test-secret";
const body = JSON.stringify({
  action: "created",
  data: {
    issue: {
      culprit: "app/(public)/demo/forms/actions.ts in submitDemo",
      firstSeen: "2026-09-09T10:00:00+00:00",
      level: "error",
      shortId: "TSH-BOOKING-1A",
      title: "TypeError: Cannot read properties of undefined",
      web_url: "https://the-social-house.sentry.io/issues/1/",
    },
  },
});
const signature = createHmac("sha256", secret)
  .update(body, "utf8")
  .digest("hex");

// Signature: exact match only, and only over the raw bytes.
assert.equal(isValidSentrySignature(body, signature, secret), true);
assert.equal(isValidSentrySignature(`${body} `, signature, secret), false);
assert.equal(isValidSentrySignature(body, signature, "other"), false);
assert.equal(isValidSentrySignature(body, null, secret), false);
assert.equal(isValidSentrySignature(body, "abc", secret), false);

// Payload: the fields the issue needs, everything else ignored.
const parsed = sentryIssueWebhook.parse({
  ...JSON.parse(body),
  installation: { uuid: "x" },
});
assert.equal(parsed.data.issue.shortId, "TSH-BOOKING-1A");
assert.equal(
  sentryIssueWebhook.safeParse({ action: "created", data: {} }).success,
  false
);

// GitHub issue: link, labels, no assignee or milestone, title within limit.
const issue = buildGithubIssue(parsed.data.issue);
assert.equal(
  issue.title,
  "[TSH-BOOKING-1A] TypeError: Cannot read properties of undefined"
);
assert.deepEqual(issue.labels, ["bug", "source:sentry"]);
assert.match(issue.body, /https:\/\/the-social-house\.sentry\.io\/issues\/1\//);
assert.match(issue.body, /submitDemo/);
assert.equal("assignees" in issue, false);
assert.equal("milestone" in issue, false);
const long = buildGithubIssue({ ...parsed.data.issue, title: "x".repeat(300) });
assert.equal(long.title.length, 256);
const noCulprit = buildGithubIssue({ ...parsed.data.issue, culprit: null });
assert.match(noCulprit.body, /Where: unknown/);

process.stdout.write("sentry webhook ok\n");
