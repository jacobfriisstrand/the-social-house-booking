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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.URL;
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
    throw new Error(`${label}: ${jobPath} responded ${response.status}`);
  }
};
