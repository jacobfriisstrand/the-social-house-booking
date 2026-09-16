// Auth Send Email Hook (docs/agents/email.md, docs/agents/auth.md, vendor doc
// docs/vendor/supabase/auth-send-email-hook.md). Verifies the Standard
// Webhooks signature, maps the auth action to a Resend template (handler.ts),
// looks up the company for the greeting, logs to outbound_emails and sends.
// Service-role allowlist entry 4 (docs/agents/supabase.md). Runs on Deno;
// excluded from tsc, imports resolve through deno.json.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Webhook } from "standardwebhooks";
import {
  type EmailPlan,
  type HookPayload,
  hookPayload,
  invitationVariables,
  planEmail,
  redactRecipient,
  resolveRecipients,
  senderAddress,
} from "./handler.ts";

const RESEND_SEND_URL = "https://api.resend.com/emails";
const HOOK_SECRET_PREFIX = "v1,whsec_";

type SendPlan = Extract<EmailPlan, { status: "send" }>;
interface Company {
  company_display_name: string;
  company_id: string;
}
type Step<T> = { ok: true; value: T } | { ok: false; response: Response };

// Auth treats 400 and 403 as a failed hook, which fails the auth call: the
// loud failure #26 asks for. 200 with an empty body is success.
const json = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });

const fail = (status: number, error: string): Step<never> => ({
  ok: false,
  response: json(status, { error }),
});

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const requireEnv = (name: string): string => {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
};

const verifyPayload = async (request: Request): Promise<Step<HookPayload>> => {
  try {
    const secret = requireEnv("SEND_EMAIL_HOOK_SECRET").replace(
      HOOK_SECRET_PREFIX,
      ""
    );
    const verified = new Webhook(secret).verify(
      await request.text(),
      Object.fromEntries(request.headers)
    );
    return { ok: true, value: hookPayload.parse(verified) };
  } catch (error) {
    return fail(403, `invalid hook request: ${errorMessage(error)}`);
  }
};

const adminClient = (): SupabaseClient =>
  createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

const loadCompany = async (
  supabase: SupabaseClient,
  authUserId: string
): Promise<Step<Company>> => {
  const { data, error } = await supabase
    .from("companies")
    .select("company_id, company_display_name")
    .eq("company_auth_user_id", authUserId)
    .maybeSingle();
  if (error) {
    return fail(500, `company lookup failed: ${error.message}`);
  }
  if (!data) {
    return fail(400, "no company row for the invited auth user");
  }
  return { ok: true, value: data as Company };
};

// The log row goes in before the send, as in sendMail().
const logQueued = async (
  supabase: SupabaseClient,
  plan: SendPlan,
  companyId: string
): Promise<Step<string>> => {
  const { data, error } = await supabase
    .from("outbound_emails")
    .insert({
      outbound_email_company_id: companyId,
      outbound_email_kind: plan.kind,
      outbound_email_status: "queued",
      outbound_email_to: plan.to,
    })
    .select("outbound_email_id")
    .single();
  if (error) {
    return fail(500, `send log failed: ${error.message}`);
  }
  return { ok: true, value: data.outbound_email_id as string };
};

const sendWithResend = async (
  plan: SendPlan,
  company: Company,
  recipients: string[]
): Promise<{ id?: string; message?: string; status: number }> => {
  const from = requireEnv("RESEND_FROM");
  const response = await fetch(RESEND_SEND_URL, {
    body: JSON.stringify({
      from,
      reply_to: senderAddress(from),
      template: {
        id: plan.kind,
        variables: invitationVariables(
          plan.actionUrl,
          company.company_display_name
        ),
      },
      to: recipients,
    }),
    headers: {
      Authorization: `Bearer ${requireEnv("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const result = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
  };
  return { ...result, status: response.status };
};

const settleLog = async (
  supabase: SupabaseClient,
  outboundEmailId: string,
  patch: Record<string, string>
): Promise<Step<null>> => {
  const { error } = await supabase
    .from("outbound_emails")
    .update(patch)
    .eq("outbound_email_id", outboundEmailId);
  return error
    ? fail(500, `send log update failed: ${error.message}`)
    : { ok: true, value: null };
};

const recipientsFor = (plan: SendPlan): Step<string[]> => {
  try {
    const recipients = resolveRecipients(plan.to, {
      APP_ENV: Deno.env.get("APP_ENV"),
      EMAIL_REDIRECT_TO: Deno.env.get("EMAIL_REDIRECT_TO"),
    });
    return { ok: true, value: recipients };
  } catch (error) {
    return fail(500, errorMessage(error));
  }
};

const recordResult = async (
  supabase: SupabaseClient,
  outboundEmailId: string,
  plan: SendPlan,
  result: Awaited<ReturnType<typeof sendWithResend>>
): Promise<Response> => {
  if (!result.id) {
    await settleLog(supabase, outboundEmailId, {
      outbound_email_error: redactRecipient(
        result.message ?? `Resend responded ${result.status}`,
        plan.to
      ),
      outbound_email_status: "failed",
    });
    return json(502, { error: `Resend rejected the ${plan.kind} mail` });
  }
  const settled = await settleLog(supabase, outboundEmailId, {
    outbound_email_resend_id: result.id,
  });
  return settled.ok ? json(200, {}) : settled.response;
};

const deliver = async (plan: SendPlan): Promise<Response> => {
  const recipients = recipientsFor(plan);
  if (!recipients.ok) {
    return recipients.response;
  }
  const supabase = adminClient();
  const company = await loadCompany(supabase, plan.authUserId);
  if (!company.ok) {
    return company.response;
  }
  const log = await logQueued(supabase, plan, company.value.company_id);
  if (!log.ok) {
    return log.response;
  }
  const result = await sendWithResend(plan, company.value, recipients.value);
  return recordResult(supabase, log.value, plan, result);
};

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json(405, { error: "method not allowed" });
  }
  const payload = await verifyPayload(request);
  if (!payload.ok) {
    return payload.response;
  }
  const plan = planEmail(payload.value);
  return plan.status === "reject"
    ? json(400, { error: plan.reason })
    : await deliver(plan);
});
