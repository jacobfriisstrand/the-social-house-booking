import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildGithubIssue,
  isValidSentrySignature,
  sentryIssueWebhook,
} from "./webhook";

const SENTRY_LINK = /https:\/\/the-social-house\.sentry\.io\/issues\/1\//;
const CULPRIT = /submitDemo/;
const UNKNOWN_WHERE = /Where: unknown/;

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

describe("isValidSentrySignature", () => {
  it("accepts the HMAC of the raw body only", () => {
    expect(isValidSentrySignature(body, signature, secret)).toBe(true);
    expect(isValidSentrySignature(`${body} `, signature, secret)).toBe(false);
    expect(isValidSentrySignature(body, signature, "other")).toBe(false);
    expect(isValidSentrySignature(body, null, secret)).toBe(false);
    expect(isValidSentrySignature(body, "abc", secret)).toBe(false);
  });
});

describe("sentryIssueWebhook", () => {
  it("keeps the fields the issue needs and ignores the rest", () => {
    const parsed = sentryIssueWebhook.parse({
      ...JSON.parse(body),
      installation: { uuid: "x" },
    });
    expect(parsed.data.issue.shortId).toBe("TSH-BOOKING-1A");
  });

  it("rejects a payload without an issue", () => {
    expect(
      sentryIssueWebhook.safeParse({ action: "created", data: {} }).success
    ).toBe(false);
  });
});

describe("buildGithubIssue", () => {
  const issue = buildGithubIssue(
    sentryIssueWebhook.parse(JSON.parse(body)).data.issue
  );

  it("links to Sentry, labels bug + source:sentry, no assignee or milestone", () => {
    expect(issue.title).toBe(
      "[TSH-BOOKING-1A] TypeError: Cannot read properties of undefined"
    );
    expect(issue.labels).toEqual(["bug", "source:sentry"]);
    expect(issue.body).toMatch(SENTRY_LINK);
    expect(issue.body).toMatch(CULPRIT);
    expect("assignees" in issue).toBe(false);
    expect("milestone" in issue).toBe(false);
  });

  it("caps the title at GitHub's limit and tolerates a missing culprit", () => {
    const base = sentryIssueWebhook.parse(JSON.parse(body)).data.issue;
    expect(
      buildGithubIssue({ ...base, title: "x".repeat(300) }).title
    ).toHaveLength(256);
    expect(buildGithubIssue({ ...base, culprit: null }).body).toMatch(
      UNKNOWN_WHERE
    );
  });
});
