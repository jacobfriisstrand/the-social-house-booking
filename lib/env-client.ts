// Browser-safe boot-time environment validation. lib/env.ts validates the
// full server schema, whose REQUIRED keys (APP_ENV, RESEND_FROM, …) are never
// inlined into client bundles — importing it from a "use client" file throws
// at boot. This module validates only publicEnvSchema, the NEXT_PUBLIC_* keys
// Next inlines. Same error shape as lib/env.ts for consistency.
//
// Note: the whole `process.env` object is empty in client bundles; only
// individual `process.env.NEXT_PUBLIC_*` member references are statically
// replaced by Turbopack/Webpack. So the input must be built from explicit
// member reads, never `process.env` wholesale.
import { publicEnvSchema } from "./env-schema.ts";

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
});

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment:\n${details}`);
}

export const publicEnv = parsed.data;
