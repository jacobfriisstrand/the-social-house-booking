// Init options shared by instrumentation-client.ts, sentry.server.config.ts
// and sentry.edge.config.ts (docs/agents/stack.md, Observability). Each file
// adds only `dsn` and `environment`.
import { scrubEvent } from "./scrub";

export const sentryOptions = {
  beforeSend: scrubEvent,
  // The SDK collects cookies, headers and bodies by default; all off here.
  // Query strings stay on (no personal data in this app's URLs).
  dataCollection: {
    cookies: false,
    httpBodies: [],
    httpHeaders: { request: false, response: false },
    userInfo: false,
  },
};
