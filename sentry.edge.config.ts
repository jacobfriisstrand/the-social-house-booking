// Edge runtime Sentry init, loaded by instrumentation.ts. Reads process.env by
// design (biome.jsonc exemption); an empty DSN leaves the SDK disabled.
import { init } from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry/options";

init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
  environment: process.env.APP_ENV,
  ...sentryOptions,
});
