// Shared plumbing for the two scheduled jobs (docs/agents/email.md,
// docs/agents/outlook-sync.md): resolve the site URL and JOB_SECRET, then
// call the job route, which owns the logic behind that secret. Lives in a
// subdirectory so Netlify does not deploy it as a function of its own.
//
// process.env is read here by design (Netlify function, outside the Next.js
// bundle); the exemption is in biome.jsonc.

export const callScheduledJob = async (
  jobPath: string,
  label: string
): Promise<void> => {
  // Netlify's runtime `URL` is the site's MAIN (production) address in every
  // context, so falling back to it would silently point branch deploys and
  // previews at production (observed 2026-10-14: the develop sync job 404'd
  // into the production deploy, authorized by the shared JOB_SECRET).
  // NEXT_PUBLIC_SITE_URL therefore has no fallback: it must be set per
  // context with `netlify env:set` — netlify.toml values are build-time only
  // and never reach the function runtime. Missing means loud failure, never
  // a call to another context.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.JOB_SECRET;
  if (!(siteUrl && secret)) {
    throw new Error(
      `${label}: NEXT_PUBLIC_SITE_URL and JOB_SECRET must be set`
    );
  }
  const response = await fetch(`${siteUrl}${jobPath}`, {
    headers: { authorization: `Bearer ${secret}` },
    method: "POST",
  });
  if (!response.ok) {
    // The route's designed "off" answer (lib/jobs/run.ts, route gate): the
    // context's secret or the four OUTLOOK_* variables are not set, so the
    // job is disabled here on purpose — nothing to do, not a failure.
    // Platform 503s (crash, timeout) carry a different body and still throw.
    if (
      response.status === 503 &&
      (await response.text()) === "Job is not configured"
    ) {
      return;
    }
    // Name the host in the error: a 404 here usually means the deploy that
    // answered does not serve the job route (stale deploy, wrong context),
    // and without the URL that is invisible in the function log.
    throw new Error(
      `${label}: ${siteUrl}${jobPath} responded ${response.status}`
    );
  }
};
