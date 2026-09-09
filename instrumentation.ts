// Server-side Sentry registration (docs/agents/stack.md, Observability). Next
// calls register() once per server instance; the runtime-specific init lives
// in sentry.server.config.ts and sentry.edge.config.ts. onRequestError
// reports errors from Server Components, Server Actions and route handlers.
import { captureRequestError } from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = captureRequestError;
