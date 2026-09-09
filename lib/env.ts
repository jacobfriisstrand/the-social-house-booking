// Boot-time environment validation. The only place process.env is read
// (docs/agents/stack.md; enforced by the noProcessEnv lint rule).
import { envSchema } from "./env-schema.ts";

// NEXT_PUBLIC_SITE_URL has no fixed value on deploy previews (one URL per pull
// request), so Netlify's DEPLOY_PRIME_URL is the fallback (docs/agents/deploy.md).
const parsed = envSchema.safeParse({
  ...process.env,
  NEXT_PUBLIC_SITE_URL:
    process.env.NEXT_PUBLIC_SITE_URL || process.env.DEPLOY_PRIME_URL,
});

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment:\n${details}`);
}

export const env = parsed.data;

export const isDevelopment = env.APP_ENV === "development";
export const isProduction = env.APP_ENV === "production";
