import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

// The image optimizer may only fetch from the hosts that serve room image
// previews: local Supabase storage and the configured project host (deploy
// previews point at the cloud project, local dev at 127.0.0.1). Next 16
// blocks any port that is not listed, so each origin carries its port —
// the protocol default when the URL has none.
const LOCAL_SUPABASE_ORIGIN = "http://127.0.0.1:54321";

// The configured project origin, or null when unset or malformed — a broken
// env value must not crash config load; the storage images then still
// resolve through the supabase.co pattern below.
function originOf(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

const configuredOrigin = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL);
const imageOrigins = [
  LOCAL_SUPABASE_ORIGIN,
  ...(configuredOrigin ? [configuredOrigin] : []),
];
const defaultPortOf = (protocol: string): string =>
  protocol === "https:" ? "443" : "80";

const nextConfig: NextConfig = {
  // Inlines APP_ENV into every bundle so instrumentation-client.ts can tag
  // browser events with the environment (APP_ENV has no NEXT_PUBLIC_ twin).
  env: { APP_ENV: process.env.APP_ENV ?? "" },
  images: {
    // Local Supabase storage serves room image previews from 127.0.0.1 in
    // development, which the optimizer's SSRF guard blocks by default. The
    // remotePatterns whitelist stays the boundary.
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      ...[...new Set(imageOrigins)].map((origin) => {
        const url = new URL(origin);
        return {
          hostname: url.hostname,
          port: url.port || defaultPortOf(url.protocol),
          protocol:
            url.protocol === "https:" ? ("https" as const) : ("http" as const),
        };
      }),
      // Supabase project storage lives on <ref>.supabase.co; this covers a
      // build where NEXT_PUBLIC_SUPABASE_URL was absent (the runtime project
      // would otherwise 400 through the optimizer).
      { hostname: "**.supabase.co", protocol: "https" as const },
    ],
  },
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
