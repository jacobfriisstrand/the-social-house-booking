import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Pins the four-variable gate: the job stays off (503) until JOB_SECRET and
// all four OUTLOOK_* variables exist for the context, and the captured
// mailbox reaches createGraphClient. graph.test.ts and sync.test.ts pin the
// client and worker behind this route; nothing else covers the gate.
const envState = vi.hoisted(() => ({}) as Record<string, string | undefined>);
const state = vi.hoisted(() => ({ capturedConfig: undefined as unknown }));

vi.mock("@/lib/env", () => ({
  env: new Proxy({}, { get: (_t, k) => envState[k as string] }),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: () => undefined }));
vi.mock("@/lib/jobs/authorize", () => ({
  isJobAuthorized: (header: string | null, secret: string) =>
    header === `Bearer ${secret}`,
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/outlook/graph", () => ({
  createGraphClient: (config: unknown) => {
    state.capturedConfig = config;
    return {
      createEvent: async () => "g1",
      deleteEvent: async () => undefined,
      updateEvent: async () => true,
    };
  },
}));
vi.mock("@/lib/outlook/sync", () => ({
  syncCalendarEvents: async () => ({ created: 1, deleted: 0, updated: 0 }),
}));

const req = (auth?: string) =>
  new Request("http://x/api/jobs/sync-calendar", {
    headers: auth ? { authorization: auth } : {},
    method: "POST",
  });

const fullEnv = () =>
  Object.assign(envState, {
    JOB_SECRET: "job-secret",
    OUTLOOK_CLIENT_ID: "c",
    OUTLOOK_CLIENT_SECRET: "s",
    OUTLOOK_MAILBOX: "jacob@friis.com",
    OUTLOOK_TENANT_ID: "t",
  });

describe("sync-calendar route gate", () => {
  it("answers 503 while any Graph variable is missing", async () => {
    fullEnv();
    envState.OUTLOOK_MAILBOX = undefined;
    const res = await POST(req("Bearer job-secret"));
    expect(res.status).toBe(503);
  });

  it("answers 401 when the config is complete but auth fails", async () => {
    fullEnv();
    const res = await POST(req("Bearer wrong"));
    expect(res.status).toBe(401);
  });

  it("runs with all four variables and passes the mailbox to the client", async () => {
    fullEnv();
    const res = await POST(req("Bearer job-secret"));
    expect(res.status).toBe(200);
    expect(state.capturedConfig).toMatchObject({
      clientId: "c",
      clientSecret: "s",
      mailbox: "jacob@friis.com",
      tenantId: "t",
    });
  });
});
