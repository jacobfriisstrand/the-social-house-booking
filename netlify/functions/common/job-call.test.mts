import { afterEach, describe, expect, it, vi } from "vitest";
import { callScheduledJob } from "./job-call.mts";

// Pins the scheduled-job caller (both jobs share it): there is NO `URL`
// fallback — a missing NEXT_PUBLIC_SITE_URL fails loudly instead of
// pointing a branch deploy at the production main address (observed
// 2026-10-14: the develop sync job 404'd into production), the route's
// designed 503 "Job is not configured" means off rather than failure, and
// every other non-ok answer throws with the target host named.
// route.test.ts pins the routes behind this caller; nothing else covers it.
const fetchMock = vi.fn();
const MUST_BE_SET = /NEXT_PUBLIC_SITE_URL and JOB_SECRET must be set/;
const PLATFORM_503 = /responded 503/;
const NOT_FOUND_WITH_HOST =
  /https:\/\/develop--example\.netlify\.app\/api\/jobs\/sync-calendar responded 404/;

const respond = (status: number, body: string) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => body,
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("callScheduledJob", () => {
  it("throws naming the missing variables and calls nothing without NEXT_PUBLIC_SITE_URL", async () => {
    vi.stubEnv("JOB_SECRET", "job-secret");
    delete process.env.NEXT_PUBLIC_SITE_URL;
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      callScheduledJob("/api/jobs/sync-calendar", "sync-calendar")
    ).rejects.toThrow(MUST_BE_SET);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws naming the missing variables and calls nothing without JOB_SECRET", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://develop--example.netlify.app");
    delete process.env.JOB_SECRET;
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      callScheduledJob("/api/jobs/send-reminders", "send-reminders")
    ).rejects.toThrow(MUST_BE_SET);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("POSTs the bearer token to the configured site URL and treats the designed 503 as off", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://develop--example.netlify.app");
    vi.stubEnv("JOB_SECRET", "job-secret");
    fetchMock.mockResolvedValue(respond(503, "Job is not configured"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      callScheduledJob("/api/jobs/sync-calendar", "sync-calendar")
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://develop--example.netlify.app/api/jobs/sync-calendar"
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: { authorization: "Bearer job-secret" },
      method: "POST",
    });
  });

  it("throws on a platform 503 with a different body", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://develop--example.netlify.app");
    vi.stubEnv("JOB_SECRET", "job-secret");
    fetchMock.mockResolvedValue(respond(503, "Function timed out"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      callScheduledJob("/api/jobs/sync-calendar", "sync-calendar")
    ).rejects.toThrow(PLATFORM_503);
  });

  it("throws on a 404 with the answering host in the message", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://develop--example.netlify.app");
    vi.stubEnv("JOB_SECRET", "job-secret");
    fetchMock.mockResolvedValue(respond(404, ""));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      callScheduledJob("/api/jobs/sync-calendar", "sync-calendar")
    ).rejects.toThrow(NOT_FOUND_WITH_HOST);
  });
});
