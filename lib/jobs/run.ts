// The scheduled-job route contract (docs/agents/email.md,
// docs/agents/outlook-sync.md): a job route answers 503 until JOB_SECRET
// exists for the context, 401 without the bearer token, and runs behind
// Sentry so a failed job reaches the issue tracker. Route-specific gates
// (the sync route's four OUTLOOK_* variables) stay in the route, ahead of
// this check, so the answer order never changes.
import { captureException } from "@sentry/nextjs";
import { env } from "@/lib/env";
import { isJobAuthorized } from "@/lib/jobs/authorize";

export const runScheduledJob = async (
  request: Request,
  respond: () => Promise<Response>
): Promise<Response> => {
  const secret = env.JOB_SECRET;
  if (!secret) {
    return new Response("Job is not configured", { status: 503 });
  }
  if (!isJobAuthorized(request.headers.get("authorization"), secret)) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    return await respond();
  } catch (error) {
    captureException(error);
    return new Response("Job failed", { status: 500 });
  }
};
