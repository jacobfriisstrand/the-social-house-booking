// The one scheduled job (docs/agents/email.md). Netlify runs it hourly on the
// production deploy only. It does nothing itself: it calls the job route,
// which owns the reminder and hold-release logic behind JOB_SECRET.
//
// process.env is read here by design (Netlify function, outside the Next.js
// bundle); the exemption is in biome.jsonc.

const jobPath = "/api/jobs/send-reminders";

export default async (): Promise<void> => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.URL;
  const secret = process.env.JOB_SECRET;
  if (!(siteUrl && secret)) {
    throw new Error(
      "send-reminders: NEXT_PUBLIC_SITE_URL and JOB_SECRET must be set"
    );
  }

  const response = await fetch(`${siteUrl}${jobPath}`, {
    headers: { authorization: `Bearer ${secret}` },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`send-reminders: ${jobPath} responded ${response.status}`);
  }
};

export const config = { schedule: "@hourly" };
