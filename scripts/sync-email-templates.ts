// Publishes every registry template to Resend by alias (docs/agents/email.md).
// Idempotent: a missing alias is created, an existing one updated, both are
// published. The release workflow runs it with the environment's
// RESEND_API_KEY on every merge; locally:
//
//   npm run email:sync
//
// Never edit a template in the Resend dashboard; the next run overwrites it.
import { type ErrorResponse, Resend } from "resend";
import { z } from "zod";
import {
  type EmailTemplate,
  emailTemplates,
} from "../emails/templates/registry.ts";

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error("RESEND_API_KEY is not set");
  process.exit(1);
}
const resend = new Resend(apiKey);

type ResendResult<T> =
  | { data: T; error: null }
  | { data: null; error: ErrorResponse };

const unwrap = <T>(step: string, result: ResendResult<T>): T => {
  if (result.error) {
    throw new Error(`${step}: ${result.error.message}`);
  }
  return result.data;
};

// Resend needs key + type per variable; no fallback, so a send with a missing
// variable is rejected instead of going out half-rendered.
const variableDefinitions = (template: EmailTemplate) =>
  Object.entries(template.variables.shape).map(([key, schema]) => ({
    key,
    type:
      schema instanceof z.ZodNumber ? ("number" as const) : ("string" as const),
  }));

// The SDK logs a 404 itself when the alias does not exist yet; that line is
// noise, not a failure.
const existingId = async (alias: string): Promise<string | null> => {
  const existing = await resend.templates.get(alias);
  if (existing.data) {
    return existing.data.id;
  }
  if (existing.error.name === "not_found") {
    return null;
  }
  throw new Error(`get ${alias}: ${existing.error.message}`);
};

const upsert = async (
  alias: string,
  template: EmailTemplate
): Promise<void> => {
  const body = {
    html: template.html,
    name: alias,
    subject: template.subject,
    variables: variableDefinitions(template),
  };
  const id = await existingId(alias);
  if (id) {
    unwrap(`update ${alias}`, await resend.templates.update(id, body));
    unwrap(`publish ${alias}`, await resend.templates.publish(id));
    console.log(`updated ${alias}`);
    return;
  }
  unwrap(
    `create ${alias}`,
    await resend.templates.create({ ...body, alias }).publish()
  );
  console.log(`created ${alias}`);
};

for (const [alias, template] of Object.entries(emailTemplates)) {
  // biome-ignore lint/performance/noAwaitInLoops: Resend rate-limits the API at 2 requests per second; templates are synced one at a time on purpose.
  await upsert(alias, template);
}
