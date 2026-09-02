import { z } from "zod";

// Same variables as .env.example: a variable with a concrete value there is
// required here; one left empty is optional, and "" (as dotenv and Netlify set
// it) becomes undefined so consumers can feature-flag on absence. Keys are
// lint-sorted alphabetically, not grouped by service.
//
// ponytail: one schema serves both runtimes — server-only keys are optional, so
// a client component importing @/lib/env sees undefined for them instead of
// failing at boot. Upgrade: split client/server schemas if that must throw.
const emptyToUndefined = <S extends z.ZodType>(schema: S) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    schema.optional()
  );

export const envSchema = z.object({
  APP_ENV: z.enum(["development", "production"]),
  EMAIL_REDIRECT_TO: emptyToUndefined(z.string().min(1)),
  JOB_SECRET: emptyToUndefined(z.string().min(1)),
  NEXT_PUBLIC_SENTRY_DSN: emptyToUndefined(z.url()),
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: emptyToUndefined(z.string().min(1)),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  RESEND_API_KEY: emptyToUndefined(z.string().min(1)),
  RESEND_FROM: z.string().min(1),
  RESEND_WEBHOOK_SECRET: emptyToUndefined(z.string().min(1)),
  SENTRY_AUTH_TOKEN: emptyToUndefined(z.string().min(1)),
  SUPABASE_SECRET_KEY: emptyToUndefined(z.string().min(1)),
});
