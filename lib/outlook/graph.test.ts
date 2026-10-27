import { createVerify, generateKeyPairSync } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GraphEventPayload } from "@/lib/domain/outlook-event";
import {
  certificateThumbprint,
  createGraphClient,
  type GraphClientConfig,
  GraphError,
} from "./graph";

// The one-way Microsoft Graph client (#13, ADR-0003): the
// shapes of the three calls the mirror is allowed to make, plus the
// client-credentials token they all carry. Outlook is never read back, so
// there is no GET here to test.
const config: GraphClientConfig = {
  clientId: "client-1",
  credential: { clientSecret: "secret-1", kind: "secret" },
  mailbox: "booking@thesocialhouse.dk",
  tenantId: "tenant-1",
};

const payload: GraphEventPayload = {
  body: { content: "Booker: Peter", contentType: "text" },
  end: { dateTime: "2026-07-15T11:00:00", timeZone: "Europe/Copenhagen" },
  isAllDay: false,
  location: { displayName: "Room of Power" },
  showAs: "busy",
  start: { dateTime: "2026-07-15T09:00:00", timeZone: "Europe/Copenhagen" },
  subject: "B-2607-0042 · Rituals",
};

const jsonResponse = (status: number, body: unknown = {}): Response =>
  new Response(JSON.stringify(body), { status });

// A throwaway self-signed certificate (CN=tsh-graph-test, one-day validity).
// certificateThumbprint hashes only its DER bytes, so expiry is irrelevant;
// CERT_X5T is the pinned value of that hash (openssl sha1, base64url).
const CERT_PEM = `-----BEGIN CERTIFICATE-----
MIIDEzCCAfugAwIBAgIUBaq/9ws97WuNRcSEgcX1cYAKq3AwDQYJKoZIhvcNAQEL
BQAwGTEXMBUGA1UEAwwOdHNoLWdyYXBoLXRlc3QwHhcNMjYxMDI3MTEzOTM1WhcN
MjYxMDI4MTEzOTM1WjAZMRcwFQYDVQQDDA50c2gtZ3JhcGgtdGVzdDCCASIwDQYJ
KoZIhvcNAQEBBQADggEPADCCAQoCggEBAN0kwRybtHkHlz8tERtIgKCYxiC9hdqZ
eRZbDZPlffMkfoxYcsnuXBrWhOPF807HYIOTMwmnU68r9ANg7XLL0Ny9rAeZOrFO
lMUJ16PJnq+5yqz8QE0iz1mu7C/UlSBGD9l4Ke3LMgVFxxAwbwVkh4OaRFHzgcsf
4IvZkjfGktjfiyZ9GRbN+FykBfNt/RoBMR4TOdHe2iaNA8Z6LX7croucWcejaimn
n/0fMFJ1ocXQkqsJzMuFIqLSqhNDDo7J1sKPVHUgJTajuRMmR4zKlLhkXMvM+Bn9
oyfbZtiR/GFUtdOGVyVeg3jo/jN4omTxgjOVT9ccbVa42Rxal9MoEV0CAwEAAaNT
MFEwHQYDVR0OBBYEFKfp0ekMpIOFUTVwqhJM5YOnzQhjMB8GA1UdIwQYMBaAFKfp
0ekMpIOFUTVwqhJM5YOnzQhjMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQEL
BQADggEBACSvp9TTbn+WEHdNryY7kiN8wxOqvg5cL5UxSX+ueJRPMJgQfof+DkHR
bBa3cbWV2O/GejpqH1s3RLRCrPpg+6TFLH5MGEy2ssFqB2gx3FSMPgpXBL/IyFZm
d4s/TkxHgBQY4h5vVbnvYJeWijFkTjeyOAUhZ2GN+/+w3D4yE2b07cGQDXcdletg
x82naJfDEEJFdyrNg/K5WME9nUP3hY5bVe0jBXfTePn+rM5wCO8lzRWDy4iMnon1
WHC5wqtZTVXh5JW8O/jV+kV4uswKpt/ucHqEKBMFF1Nw2IxfNXbXmmNMir4zrDT5
Unu8vQvS+8jIF0b4kH0DOJkygylABFA=
-----END CERTIFICATE-----`;
const CERT_X5T = "Gdlm-1ws5trL8hdphdt1IYKtgX8";

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
    expect((tokenCall[1].body as URLSearchParams).get("client_secret")).toBe(
      "secret-1"
    );
    expect(eventCall[0]).toBe(
      `https://graph.microsoft.com/v1.0/users/${config.mailbox}/events`
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
      `https://graph.microsoft.com/v1.0/users/${config.mailbox}/events/graph-1`
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

  describe("certificate credential (#100)", () => {
    // A fresh RSA pair per test proves signing against an unknown key; the
    // certificate pair travels base64-encoded exactly as Netlify carries it.
    const certConfig = () => {
      const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
      const keyPem = pair.privateKey
        .export({ format: "pem", type: "pkcs8" })
        .toString();
      return {
        config: {
          ...config,
          credential: {
            certificate: Buffer.from(CERT_PEM).toString("base64"),
            kind: "certificate" as const,
            privateKey: Buffer.from(keyPem).toString("base64"),
          },
        },
        keyPem,
      };
    };

    it("requests the token with a signed client assertion, no secret", async () => {
      const { config: certConf, keyPem } = certConfig();
      const fetchMock = stubFetch(
        jsonResponse(200, { access_token: "tok-1", expires_in: 3600 }),
        jsonResponse(201, { id: "graph-1" })
      );
      const client = createGraphClient(certConf);
      await client.createEvent(payload);
      const body = fetchMock.mock.calls[0][1].body as URLSearchParams;
      expect(body.get("grant_type")).toBe("client_credentials");
      expect(body.get("scope")).toBe("https://graph.microsoft.com/.default");
      expect(body.get("client_secret")).toBeNull();
      expect(body.get("client_assertion_type")).toBe(
        "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
      );
      const [header, claimsPart, signature] = (
        body.get("client_assertion") ?? ""
      ).split(".");
      expect(JSON.parse(Buffer.from(header, "base64url").toString())).toEqual({
        alg: "RS256",
        typ: "JWT",
        x5t: CERT_X5T,
      });
      const claims = JSON.parse(
        Buffer.from(claimsPart, "base64url").toString()
      ) as {
        aud: string;
        exp: number;
        iss: string;
        jti: string;
        nbf: number;
        sub: string;
      };
      const now = Math.floor(Date.now() / 1000);
      expect(claims.aud).toBe(
        "https://login.microsoftonline.com/tenant-1/oauth2/v2.0/token"
      );
      expect(claims.iss).toBe("client-1");
      expect(claims.sub).toBe("client-1");
      expect(claims.jti).toBeTruthy();
      expect(claims.nbf).toBeLessThanOrEqual(now);
      expect(claims.exp).toBeGreaterThan(now);
      expect(claims.exp).toBeLessThanOrEqual(now + 600);
      expect(
        createVerify("RSA-SHA256")
          .update(`${header}.${claimsPart}`)
          .verify(keyPem, Buffer.from(signature, "base64url"))
      ).toBe(true);
    });

    it("pins the x5t derivation over the certificate DER", () => {
      expect(certificateThumbprint(CERT_PEM)).toBe(CERT_X5T);
    });

    it("fails at client creation when the certificate carries no PEM armor", () => {
      const { config: certConf } = certConfig();
      expect(() =>
        createGraphClient({
          ...certConf,
          credential: {
            ...certConf.credential,
            certificate: Buffer.from("not a certificate").toString("base64"),
          },
        })
      ).toThrow("OUTLOOK_CLIENT_CERT");
    });
  });
});
