// The one-way Microsoft Graph client (#13, ADR-0003): everything the mirror
// may do to the configured Outlook calendar — create, update,
// delete an event — plus the OAuth2 client-credentials token those calls
// carry (application permission Calendars.ReadWrite). Nothing here reads
// events back; Outlook never writes to the platform. Plain fetch, no SDK:
// it is three endpoints.
//
// The mailbox is configuration, not a constant: `OUTLOOK_MAILBOX` is set per
// Netlify context — production writes `booking@thesocialhouse.dk` (Bilag 1
// fixes the production value), the develop context carries the sandbox pair
// for test runs. Locally it is unset, so the route answers 503.
import { createHash, createSign, randomUUID } from "node:crypto";
import type { GraphEventPayload } from "@/lib/domain/outlook-event";

// The production mailbox is fixed by Bilag 1 (ADR-0003). The sync job refuses
// to run on production against any other address (the guard in route.ts) —
// a typo in a context variable must never redirect booker data.
export const OUTLOOK_PROD_MAILBOX = "booking@thesocialhouse.dk";

// One credential per config, Entra client-credentials style. The certificate
// is the preferred credential (#100): the keypair is generated locally and
// only the public certificate crosses to the tenant admin — no secret is
// ever exchanged by mail. The client secret stays supported so the sandbox
// pair and existing contexts keep working unchanged.
// Certificate values arrive base64-encoded (a PEM is multiline; Netlify env
// vars are set by the wizard as single lines).
export type GraphCredential =
  | { certificate: string; kind: "certificate"; privateKey: string }
  | { clientSecret: string; kind: "secret" };

export interface GraphClientConfig {
  clientId: string;
  credential: GraphCredential;
  mailbox: string;
  tenantId: string;
}

// The x5t claim: SHA-1 over the certificate's DER bytes, base64url-encoded —
// Entra matches it against the certificate uploaded under Certificates &
// secrets. A value without the PEM armor means the base64 wrapped something
// other than a certificate; fail here, at client creation, not on Graph.
export const certificateThumbprint = (pem: string): string => {
  if (!pem.includes("-----BEGIN CERTIFICATE-----")) {
    throw new Error(
      "OUTLOOK_CLIENT_CERT does not carry a certificate PEM (missing BEGIN CERTIFICATE armor)"
    );
  }
  const body = pem
    .replace(/-----(BEGIN|END) CERTIFICATE-----/g, "")
    .replace(/\s+/g, "");
  const der = Buffer.from(body, "base64");
  if (der.length === 0) {
    throw new Error("OUTLOOK_CLIENT_CERT does not decode to a certificate PEM");
  }
  return createHash("sha1").update(der).digest("base64url");
};

// The client assertion for certificate credentials: a short-lived RS256 JWT
// signed with the private key (RFC 7523). Entra caps the lifetime at ten
// minutes, so every mint is fresh — built per token request, never stored.
export const clientAssertion = (input: {
  clientId: string;
  now: number;
  privateKey: string;
  tenantId: string;
  thumbprint: string;
}): string => {
  const seconds = Math.floor(input.now / 1000);
  const header = { alg: "RS256", typ: "JWT", x5t: input.thumbprint };
  const claims = {
    aud: `https://login.microsoftonline.com/${input.tenantId}/oauth2/v2.0/token`,
    exp: seconds + 600,
    iss: input.clientId,
    jti: randomUUID(),
    nbf: seconds - 60,
    sub: input.clientId,
  };
  const encode = (value: object): string =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const signingInput = `${encode(header)}.${encode(claims)}`;
  const signature = createSign("RSA-SHA256")
    .update(signingInput)
    .sign(input.privateKey);
  return `${signingInput}.${signature.toString("base64url")}`;
};

export interface GraphClient {
  createEvent: (payload: GraphEventPayload) => Promise<string>;
  // Resolves even when the event is already gone (404).
  deleteEvent: (graphEventId: string) => Promise<void>;
  // Returns false when the event no longer exists in Outlook — the caller
  // then creates a fresh entry under a new id.
  updateEvent: (
    graphEventId: string,
    payload: GraphEventPayload
  ) => Promise<boolean>;
}

// Carries the HTTP status so the sync worker can report the failure to
// Sentry without logging the request body.
export class GraphError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const GRAPH_ORIGIN = "https://graph.microsoft.com/v1.0";
const TOKEN_SCOPE = "https://graph.microsoft.com/.default";

// A Graph error body names a code and a message about the call, never about
// the event content, so the code is safe for Sentry (docs/agents/stack.md).
const graphCode = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as {
      error?: { code?: string; message?: string };
    };
    return body.error?.code ?? body.error?.message ?? "";
  } catch {
    return "";
  }
};

export function createGraphClient(config: GraphClientConfig): GraphClient {
  const eventsUrl = `${GRAPH_ORIGIN}/users/${config.mailbox}/events`;
  let token: { value: string; expiresAt: number } | null = null;
  // The thumbprint is fixed by the certificate, not the clock: derive it once
  // so a misconfigured value breaks at job start, not on the first token.
  const thumbprint =
    config.credential.kind === "certificate"
      ? certificateThumbprint(
          Buffer.from(config.credential.certificate, "base64").toString()
        )
      : null;

  const tokenBody = (): URLSearchParams => {
    const body = new URLSearchParams({
      client_id: config.clientId,
      grant_type: "client_credentials",
      scope: TOKEN_SCOPE,
    });
    if (config.credential.kind === "secret") {
      body.set("client_secret", config.credential.clientSecret);
    } else {
      body.set(
        "client_assertion",
        clientAssertion({
          clientId: config.clientId,
          now: Date.now(),
          privateKey: Buffer.from(
            config.credential.privateKey,
            "base64"
          ).toString(),
          tenantId: config.tenantId,
          thumbprint: thumbprint ?? "",
        })
      );
      body.set(
        "client_assertion_type",
        "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
      );
    }
    return body;
  };

  const bearer = async (): Promise<string> => {
    if (token && Date.now() < token.expiresAt) {
      return token.value;
    }
    const response = await fetch(
      `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
      {
        body: tokenBody(),
        method: "POST",
      }
    );
    if (!response.ok) {
      throw new GraphError(
        response.status,
        `Outlook token request failed with ${response.status}`
      );
    }
    const data = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) {
      throw new GraphError(
        response.status,
        "Outlook token response carried no access_token"
      );
    }
    token = {
      // One minute of slack so a call never runs on a just-expired token.
      expiresAt: Date.now() + ((data.expires_in ?? 3600) - 60) * 1000,
      value: data.access_token,
    };
    return token.value;
  };

  const call = async (
    method: string,
    url: string,
    payload?: GraphEventPayload
  ): Promise<Response> => {
    const response = await fetch(url, {
      body: payload ? JSON.stringify(payload) : undefined,
      headers: {
        authorization: `Bearer ${await bearer()}`,
        "content-type": "application/json",
      },
      method,
    });
    if (response.ok) {
      return response;
    }
    throw new GraphError(
      response.status,
      `Outlook Graph call failed with ${response.status}: ${await graphCode(response)}`
    );
  };

  return {
    async createEvent(payload) {
      const response = await call("POST", eventsUrl, payload);
      const created = (await response.json()) as { id?: string };
      if (!created.id) {
        throw new GraphError(
          response.status,
          "Outlook create-event response carried no id"
        );
      }
      return created.id;
    },

    async deleteEvent(graphEventId) {
      try {
        await call("DELETE", `${eventsUrl}/${graphEventId}`);
      } catch (error) {
        if (error instanceof GraphError && error.status === 404) {
          return;
        }
        throw error;
      }
    },

    async updateEvent(graphEventId, payload) {
      try {
        await call("PATCH", `${eventsUrl}/${graphEventId}`, payload);
        return true;
      } catch (error) {
        if (error instanceof GraphError && error.status === 404) {
          return false;
        }
        throw error;
      }
    },
  };
}
