// The Outlook mirror job (docs/agents/outlook-sync.md). Netlify runs it
// every five minutes on the production deploy only. Like send-reminders it
// does nothing itself: it calls the job route, which owns the sync logic
// behind JOB_SECRET.
//
// process.env is read here by design (Netlify function, outside the Next.js
// bundle); the exemption is in biome.jsonc.

const jobPath = "/api/jobs/sync-calendar";

const jobTarget = (): { secret: string; siteUrl: string } => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.URL;
  const secret = process.env.JOB_SECRET;
  if (!(siteUrl && secret)) {
    throw new Error(
      "sync-calendar: NEXT_PUBLIC_SITE_URL and JOB_SECRET must be set"
    );
  }
  return { secret, siteUrl };
};

const callJob = async (target: { secret: string; siteUrl: string }) => {
  const response = await fetch(`${target.siteUrl}${jobPath}`, {
    headers: { authorization: `Bearer ${target.secret}` },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`sync-calendar: ${jobPath} responded ${response.status}`);
  }
};

export default async (): Promise<void> => {
  await callJob(jobTarget());
};

export const config = { schedule: "*/5 * * * *" };
