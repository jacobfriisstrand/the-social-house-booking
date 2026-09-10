// Sentry -> GitHub: one issue per new Sentry issue, labelled bug + source:sentry,
// unassigned, no milestone (docs/agents/stack.md, Observability). Sentry times
// out after 1 s, so the response goes first and the GitHub call runs in after().
import { captureException } from "@sentry/nextjs";
import { after } from "next/server";
import { env } from "@/lib/env";
import { createGithubIssue } from "@/lib/github/issues";
import {
  buildGithubIssue,
  isValidSentrySignature,
  sentryIssueWebhook,
} from "@/lib/sentry/webhook";

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

// The verification gate: a response to reject the request, or the raw body
// once the signature and resource type check out.
type VerifiedIssue =
  | { ok: true; rawBody: string }
  | { ok: false; response: Response };

const verifyIssue = async (request: Request): Promise<VerifiedIssue> => {
  const secret = env.SENTRY_WEBHOOK_SECRET;
  if (!secret) {
    return {
      ok: false,
      response: new Response("Sentry webhook is not configured", {
        status: 503,
      }),
    };
  }
  const rawBody = await request.text();
  const signature = request.headers.get("sentry-hook-signature");
  if (!isValidSentrySignature(rawBody, signature, secret)) {
    return {
      ok: false,
      response: new Response("Invalid signature", { status: 401 }),
    };
  }
  if (request.headers.get("sentry-hook-resource") !== "issue") {
    return { ok: false, response: new Response(null, { status: 204 }) };
  }
  return { ok: true, rawBody };
};

export async function POST(request: Request): Promise<Response> {
  const verified = await verifyIssue(request);
  if (!verified.ok) {
    return verified.response;
  }
  const parsed = sentryIssueWebhook.safeParse(parseJson(verified.rawBody));
  if (!parsed.success) {
    return new Response("Unexpected payload", { status: 400 });
  }
  if (parsed.data.action !== "created") {
    return new Response(null, { status: 204 });
  }

  const sentryIssue = parsed.data.data.issue;
  after(async () => {
    try {
      await createGithubIssue(buildGithubIssue(sentryIssue));
    } catch (error) {
      captureException(error, { tags: { sentry_issue: sentryIssue.shortId } });
    }
  });
  return new Response(null, { status: 202 });
}
