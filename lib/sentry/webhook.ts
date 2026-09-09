// Sentry issue webhook: signature check, payload schema, and the GitHub issue
// a new Sentry issue becomes (docs/vendor/sentry/webhooks.md). Pure; the route
// handler in app/api/webhooks/sentry/route.ts does the I/O.
import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const sentryIssueWebhook = z.object({
  action: z.string(),
  data: z.object({
    issue: z.object({
      culprit: z.string().nullable(),
      firstSeen: z.string(),
      level: z.string(),
      shortId: z.string(),
      title: z.string(),
      web_url: z.url(),
    }),
  }),
});

export type SentryIssue = z.infer<typeof sentryIssueWebhook>["data"]["issue"];

// Sentry signs the exact bytes it sends: hex HMAC-SHA256 of the raw body with
// the internal integration's client secret.
export const isValidSentrySignature = (
  rawBody: string,
  signature: string | null,
  secret: string
): boolean => {
  if (!signature) {
    return false;
  }
  const expected = Buffer.from(
    createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")
  );
  const received = Buffer.from(signature);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
};

const GITHUB_TITLE_MAX = 256;
export const githubIssueLabels = ["bug", "source:sentry"];

export const buildGithubIssue = (issue: SentryIssue) => ({
  body: [
    `Opened automatically from Sentry issue [${issue.shortId}](${issue.web_url}).`,
    "",
    `- Level: ${issue.level}`,
    `- Where: ${issue.culprit ?? "unknown"}`,
    `- First seen: ${issue.firstSeen}`,
    "",
    "Triage: close as noise, or add an `area:` label and a milestone if it needs work.",
  ].join("\n"),
  labels: githubIssueLabels,
  title: `[${issue.shortId}] ${issue.title}`.slice(0, GITHUB_TITLE_MAX),
});
