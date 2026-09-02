// Assert-based check for lib/env-schema.ts. Run: node lib/env.selfcheck.ts
// Superseded when Vitest lands (issue #31): fold these cases into lib/env.test.ts.
import assert from "node:assert/strict";
import { envSchema } from "./env-schema.ts";

const required = {
  APP_ENV: "development",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  RESEND_FROM: "The Social House <booking@thesocialhouse.dk>",
};

// Happy path: unknown keys (PATH, HOME, ...) are stripped, "" becomes undefined.
const full = envSchema.parse({
  ...required,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
  PATH: "/usr/bin",
  SUPABASE_SECRET_KEY: "secret",
});
assert.equal(full.SUPABASE_SECRET_KEY, "secret");
assert.equal(full.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, undefined);
assert.equal(full.RESEND_API_KEY, undefined);
assert.equal("PATH" in full, false);
// The schema covers every variable in .env.example — exactly 12 today.
assert.equal(Object.keys(envSchema.shape).length, 12);

// APP_ENV accepts exactly the two documented values.
assert.throws(
  () => envSchema.parse({ ...required, APP_ENV: "preview" }),
  /APP_ENV/
);

// Required variables are required.
assert.throws(
  () => envSchema.parse({ ...required, NEXT_PUBLIC_SITE_URL: undefined }),
  /NEXT_PUBLIC_SITE_URL/
);

// URLs must be URLs.
assert.throws(
  () => envSchema.parse({ ...required, NEXT_PUBLIC_SUPABASE_URL: "not-a-url" }),
  /NEXT_PUBLIC_SUPABASE_URL/
);

// Optional variables accept "" and real values alike.
const withSentry = envSchema.parse({
  ...required,
  NEXT_PUBLIC_SENTRY_DSN: "https://abc@sentry.io/1",
});
assert.equal(withSentry.NEXT_PUBLIC_SENTRY_DSN, "https://abc@sentry.io/1");

process.stdout.write("env schema ok\n");
