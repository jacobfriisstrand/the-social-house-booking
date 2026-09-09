import type { ErrorEvent } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";
import { scrubEvent } from "./scrub";

const event: ErrorEvent = {
  breadcrumbs: [
    {
      category: "action",
      data: { booker_email: "anna@example.dk", booking_number: "B-0001" },
    },
  ],
  contexts: {
    booking: { company_contact_phone: "12345678", company_id: "c1" },
    browser: { name: "Safari", version: "26" },
  },
  exception: {
    values: [
      {
        stacktrace: { frames: [{ filename: "app/page.tsx" }] },
        type: "Error",
        value: "boom",
      },
    ],
  },
  extra: { nested: { bookerName: "Anna" }, practicalNotes: "allergies" },
  request: {
    cookies: { session: "jwt" },
    data: '{"email":"anna@example.dk"}',
    headers: { cookie: "session=jwt", "user-agent": "ua" },
    url: "https://example.dk/booking",
  },
  tags: { booking_number: "B-0001", email: "anna@example.dk" },
  type: undefined,
  user: { email: "anna@example.dk", id: "u1" },
};

describe("scrubEvent", () => {
  const scrubbed = scrubEvent(event);

  it("drops the user, request body and cookies", () => {
    expect(scrubbed.user).toBeUndefined();
    expect(scrubbed.request?.data).toBeUndefined();
    expect(scrubbed.request?.cookies).toBeUndefined();
    expect(scrubbed.request?.headers?.cookie).toBe("[Filtered]");
  });

  it("filters personal keys wherever app code can put them", () => {
    expect(scrubbed.extra?.practicalNotes).toBe("[Filtered]");
    expect(scrubbed.extra?.nested).toEqual({ bookerName: "[Filtered]" });
    expect(scrubbed.tags?.email).toBe("[Filtered]");
    expect(scrubbed.breadcrumbs?.[0]?.data).toEqual({
      booker_email: "[Filtered]",
      booking_number: "B-0001",
    });
    expect(scrubbed.contexts?.booking).toEqual({
      company_contact_phone: "[Filtered]",
      company_id: "c1",
    });
  });

  it("keeps correlation keys and SDK-owned subtrees", () => {
    expect(scrubbed.tags?.booking_number).toBe("B-0001");
    expect(scrubbed.request?.headers?.["user-agent"]).toBe("ua");
    expect(scrubbed.request?.url).toBe("https://example.dk/booking");
    expect(scrubbed.contexts?.browser?.name).toBe("Safari");
    expect(
      scrubbed.exception?.values?.[0]?.stacktrace?.frames?.[0]?.filename
    ).toBe("app/page.tsx");
  });

  it("does not mutate the input", () => {
    expect(event.tags?.email).toBe("anna@example.dk");
    expect(event.user?.id).toBe("u1");
  });
});
