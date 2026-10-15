import { afterEach, describe, expect, it } from "vitest";
import { callScheduledJob } from "./job-call.mts";

// CRAP on this file is estimated without coverage (fallow): every branch
// here is a real failure mode — a missing env var stops the run loudly, a
// non-2xx from the job route means the job did not happen. Both scheduled
// functions share this caller (docs/agents/email.md).
const ENV_KEYS = ["NEXT_PUBLIC_SITE_URL", "URL", "JOB_SECRET"] as const;

afterEach(() => {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
});

const withEnv = (values: Record<string, string>): void => {
  Object.assign(process.env, values);
};

describe("callScheduledJob", () => {
  it("throws when the site URL or the secret is missing", async () => {
    withEnv({ JOB_SECRET: "s" });
    await expect(
      callScheduledJob("/api/jobs/send-reminders", "reminders")
    ).rejects.toThrow(/must be set/);

    withEnv({ NEXT_PUBLIC_SITE_URL: "https://site.test" });
    delete process.env.JOB_SECRET;
    await expect(
      callScheduledJob("/api/jobs/send-reminders", "reminders")
    ).rejects.toThrow(/must be set/);
  });

  it("falls back to Netlify's own URL when the public one is unset", async () => {
    let url = "";
    let authorization = "";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      url = String(input);
      authorization = String(
        (init as RequestInit | undefined)?.headers?.authorization
      );
      return new Response(null, { status: 200 });
    };
    try {
      withEnv({ URL: "https://deploy.test", JOB_SECRET: "s" });
      await expect(
        callScheduledJob("/api/jobs/sync-calendar", "sync")
      ).resolves.toBeUndefined();
      expect(url).toBe("https://deploy.test/api/jobs/sync-calendar");
      expect(authorization).toBe("Bearer s");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("throws with the route and status when the job route fails", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(null, { status: 401 });
    try {
      withEnv({ NEXT_PUBLIC_SITE_URL: "https://site.test", JOB_SECRET: "s" });
      await expect(
        callScheduledJob("/api/jobs/send-reminders", "reminders")
      ).rejects.toThrow(/send-reminders responded 401/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
