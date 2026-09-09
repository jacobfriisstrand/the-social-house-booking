// Browser Sentry init (docs/agents/stack.md, Observability). Runs before
// hydration, so it reads process.env directly: NEXT_PUBLIC_SENTRY_DSN is
// inlined at build time and APP_ENV through `env` in next.config.ts. An empty
// DSN (local development) leaves the SDK disabled.
import { captureRouterTransitionStart, init } from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry/options";

init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
  environment: process.env.APP_ENV,
  ...sentryOptions,
});

// Required by the SDK for App Router navigations (build warns without it).
export const onRouterTransitionStart = captureRouterTransitionStart;
