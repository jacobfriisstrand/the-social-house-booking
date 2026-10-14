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
import type { GraphEventPayload } from "@/lib/domain/outlook-event";

// The production mailbox is fixed by Bilag 1 (ADR-0003). The sync job refuses
// to run on production against any other address (the guard in route.ts) —
// a typo in a context variable must never redirect booker data.
export const OUTLOOK_PROD_MAILBOX = "booking@thesocialhouse.dk";

export interface GraphClientConfig {
  clientId: string;
  clientSecret: string;
  mailbox: string;
  tenantId: string;
}

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

  const bearer = async (): Promise<string> => {
    if (token && Date.now() < token.expiresAt) {
      return token.value;
    }
    const response = await fetch(
      `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
      {
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          grant_type: "client_credentials",
          scope: TOKEN_SCOPE,
        }),
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
