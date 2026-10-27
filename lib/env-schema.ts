import { z } from "zod";

// One error shape for both validators (lib/env.ts server-side,
// lib/env-client.ts browser-side): "path: message" lines under one header.
// Returns the parsed data so the caller keeps its narrowed type.
export function assertEnvironment<T>(
  result: { success: true; data: T } | { success: false; error: z.ZodError }
): T {
  if (result.success) {
    return result.data;
  }
  const details = result.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment:\n${details}`);
}

// Same variables as .env.example: a variable with a concrete value there is
// required here; one left empty is optional, and "" (as dotenv and Netlify set
// it) becomes undefined so consumers can feature-flag on absence. Keys are
// lint-sorted alphabetically, not grouped by service.
//
// Server schema (imported by lib/env.ts): required INSIDE a node runtime.
// Client bundles only inline NEXT_PUBLIC_* keys, so importing this schema
// from a "use client" file must fail with undefined REQUIRED keys — it does
// not run in the browser; lib/env-client.ts is the browser-safe twin.
const emptyToUndefined = <S extends z.ZodType>(schema: S) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    schema.optional()
  );

export const envSchema = z.object({
  ADMIN_NOTIFY_EMAIL: emptyToUndefined(z.email()),
  // Three runtimes, one value each: local dev (`npm run dev`), the
  // development deployment (Netlify branch-deploy + PR previews) and
  // production. Every `APP_ENV === "production"` check below the schema
  // keeps its exact meaning: production alone sends real mail, syncs the
  // prod mailbox and exports RLS to the real project. `local` and
  // `development` differ only in surface (#65: the title prefix).
  APP_ENV: z.enum(["local", "development", "production"]),
  EMAIL_REDIRECT_TO: emptyToUndefined(z.string().min(1)),
  GITHUB_ISSUES_TOKEN: emptyToUndefined(z.string().min(1)),
  JOB_SECRET: emptyToUndefined(z.string().min(1)),
  NEXT_PUBLIC_SENTRY_DSN: emptyToUndefined(z.url()),
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: emptyToUndefined(z.string().min(1)),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  // Certificate credential pair for the Outlook sync (#100): base64-encoded
  // PEMs (a PEM is multiline; Netlify env vars are single lines). The pair is
  // optional — the client secret stays a supported alternative — and complete
  // only when both halves are set.
  OUTLOOK_CLIENT_CERT: emptyToUndefined(z.string().min(1)),
  OUTLOOK_CLIENT_CERT_KEY: emptyToUndefined(z.string().min(1)),
  OUTLOOK_CLIENT_ID: emptyToUndefined(z.string().min(1)),
  OUTLOOK_CLIENT_SECRET: emptyToUndefined(z.string().min(1)),
  OUTLOOK_MAILBOX: emptyToUndefined(z.email()),
  OUTLOOK_TENANT_ID: emptyToUndefined(z.string().min(1)),
  RESEND_API_KEY: emptyToUndefined(z.string().min(1)),
  RESEND_FROM: z.string().min(1),
  RESEND_WEBHOOK_SECRET: emptyToUndefined(z.string().min(1)),
  SENTRY_AUTH_TOKEN: emptyToUndefined(z.string().min(1)),
  SENTRY_WEBHOOK_SECRET: emptyToUndefined(z.string().min(1)),
  SUPABASE_SECRET_KEY: emptyToUndefined(z.string().min(1)),
});

// Browser-safe subset: only the NEXT_PUBLIC_* keys Next inlines into client
// bundles. lib/supabase/client.ts uses this; the moment another client
// component needs env, add that key here (and to the lint exemption block).
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: emptyToUndefined(z.string().min(1)),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
});
