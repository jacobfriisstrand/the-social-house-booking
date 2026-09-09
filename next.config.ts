// `withSentryConfig` comes from the `/config` subpath: the root export is
// deprecated in @sentry/nextjs 10 and removed in 11 (docs/vendor/sentry/ still
// shows the old path). Reads process.env by design (biome.jsonc exemption).
import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Inlines APP_ENV into every bundle so instrumentation-client.ts can tag
  // browser events with the environment (APP_ENV has no NEXT_PUBLIC_ twin).
  env: { APP_ENV: process.env.APP_ENV ?? "" },
};

export default withSentryConfig(nextConfig, {
  // Source maps upload after `next build` on Netlify only; unset locally
  // (docs/vendor/sentry/sourcemaps.md).
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: "the-social-house",
  project: "tsh-booking",
  silent: !process.env.CI,
  telemetry: false,
});
