import { afterEach, describe, expect, it, vi } from "vitest";
import type { GraphEventPayload } from "@/lib/domain/outlook-event";
import { createGraphClient, GraphError, OUTLOOK_MAILBOX } from "./graph";

// The one-way Microsoft Graph client (#13, ADR-0003): the
// shapes of the three calls the mirror is allowed to make, plus the
// client-credentials token they all carry. Outlook is never read back, so
// there is no GET here to test.
const config = {
  clientId: "client-1",
  clientSecret: "secret-1",
  tenantId: "tenant-1",
};

const payload: GraphEventPayload = {
  body: { content: "Booker: Peter", contentType: "text" },
  end: { dateTime: "2026-07-15T11:00:00", timeZone: "Europe/Copenhagen" },
  isAllDay: false,
  location: { displayName: "Room of Power" },
  start: { dateTime: "2026-07-15T09:00:00", timeZone: "Europe/Copenhagen" },
  subject: "B-2607-0042 · Rituals",
};

const jsonResponse = (status: number, body: unknown = {}): Response =>
  new Response(JSON.stringify(body), { status });

const stubFetch = (...responses: Response[]): ReturnType<typeof vi.fn> => {
  const fetchMock = vi.fn(
    (..._args: Parameters<typeof fetch>): Promise<Response> =>
      Promise.resolve(responses[fetchMock.mock.calls.length - 1])
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createGraphClient", () => {
  it("fetches a client-credentials token, then posts the event", async () => {
    const fetchMock = stubFetch(
      jsonResponse(200, { access_token: "tok-1", expires_in: 3600 }),
      jsonResponse(201, { id: "graph-1" })
    );
    const client = createGraphClient(config);

    const id = await client.createEvent(payload);

    expect(id).toBe("graph-1");
    const [tokenCall, eventCall] = fetchMock.mock.calls;
    expect(tokenCall[0]).toBe(
      "https://login.microsoftonline.com/tenant-1/oauth2/v2.0/token"
    );
    expect((tokenCall[1].body as URLSearchParams).get("grant_type")).toBe(
      "client_credentials"
    );
    expect((tokenCall[1].body as URLSearchParams).get("scope")).toBe(
      "https://graph.microsoft.com/.default"
    );
    expect(eventCall[0]).toBe(
      `https://graph.microsoft.com/v1.0/users/${OUTLOOK_MAILBOX}/events`
    );
    expect(eventCall[1].method).toBe("POST");
    expect(eventCall[1].headers.authorization).toBe("Bearer tok-1");
    expect(eventCall[1].body).toBe(JSON.stringify(payload));
  });

  it("reuses the token across calls in the same client", async () => {
    const fetchMock = stubFetch(
      jsonResponse(200, { access_token: "tok-1", expires_in: 3600 }),
      jsonResponse(201, { id: "graph-1" }),
      jsonResponse(200, {})
    );
    const client = createGraphClient(config);
    await client.createEvent(payload);
    await client.updateEvent("graph-1", payload);
    expect(fetchMock.mock.calls[2][0]).toBe(
      `https://graph.microsoft.com/v1.0/users/${OUTLOOK_MAILBOX}/events/graph-1`
    );
    expect(fetchMock.mock.calls[2][1].method).toBe("PATCH");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("reports the event as gone when an update 404s", async () => {
    stubFetch(
      jsonResponse(200, { access_token: "tok-1", expires_in: 3600 }),
      jsonResponse(404, { error: { code: "ErrorItemNotFound" } })
    );
    const client = createGraphClient(config);
    await expect(client.updateEvent("graph-1", payload)).resolves.toBe(false);
  });

  it("treats a 404 on delete as already removed", async () => {
    stubFetch(
      jsonResponse(200, { access_token: "tok-1", expires_in: 3600 }),
      new Response(null, { status: 404 })
    );
    const client = createGraphClient(config);
    await expect(client.deleteEvent("graph-1")).resolves.toBeUndefined();
  });

  it("throws a GraphError carrying the status when Graph refuses", async () => {
    stubFetch(
      jsonResponse(200, { access_token: "tok-1", expires_in: 3600 }),
      jsonResponse(403, {
        error: { code: "ErrorAccessDenied", message: "Access is denied." },
      })
    );
    const client = createGraphClient(config);
    await expect(client.deleteEvent("graph-1")).rejects.toMatchObject({
      message: expect.stringContaining("ErrorAccessDenied"),
      status: 403,
    });
  });

  it("throws when the token request fails", async () => {
    stubFetch(new Response(null, { status: 401 }));
    const client = createGraphClient(config);
    await expect(client.createEvent(payload)).rejects.toBeInstanceOf(
      GraphError
    );
  });
});
