// Boot-time environment validation. The only place process.env is read
// (docs/agents/stack.md; enforced by the noProcessEnv lint rule).
import { envSchema } from "./env-schema.ts";

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment:\n${details}`);
}

export const env = parsed.data;
