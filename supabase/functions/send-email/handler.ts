// Pure part of the Auth Send Email Hook: payload schema, action-type mapping,
// the set-password link, the development redirect and variable escaping.
// No Deno APIs, so Vitest covers it (handler.test.ts); index.ts does the I/O.
// Contract with #1: the link opens app/(public)/set-password, which verifies
// token_hash with verifyOtp. The base is Auth's site_url, set per remote in
// supabase/config.toml.
import { z } from "zod";

export const hookPayload = z.object({
  email_data: z.object({
    email_action_type: z.string(),
    site_url: z.string(),
    token_hash: z.string(),
  }),
  user: z.object({ email: z.string(), id: z.string() }),
});

export type HookPayload = z.infer<typeof hookPayload>;

export type EmailPlan =
  | {
      actionUrl: string;
      authUserId: string;
      kind: "company-invitation";
      status: "send";
      to: string;
    }
  | { reason: string; status: "reject" };

const SET_PASSWORD_PATH = "/set-password";
const TRAILING_SLASHES = /\/+$/;

export const buildActionUrl = ({
  email_action_type,
  site_url,
  token_hash,
}: HookPayload["email_data"]): string => {
  const base = site_url.replace(TRAILING_SLASHES, "");
  const query = new URLSearchParams({ token_hash, type: email_action_type });
  return `${base}${SET_PASSWORD_PATH}?${query.toString()}`;
};

// Only `invite` is mapped (#26). `recovery` arrives with #11; every other
// action type (email_change, signup, magiclink, …) is rejected so a
// misconfiguration fails the auth call instead of sending a blank mail.
export const planEmail = (payload: HookPayload): EmailPlan => {
  const { email_data, user } = payload;
  if (email_data.email_action_type !== "invite") {
    return {
      reason: `unsupported email_action_type "${email_data.email_action_type}"`,
      status: "reject",
    };
  }
  return {
    actionUrl: buildActionUrl(email_data),
    authUserId: user.id,
    kind: "company-invitation",
    status: "send",
    to: user.email,
  };
};

// Same rule as sendMail() (docs/agents/email.md): outside production every
// mail goes to EMAIL_REDIRECT_TO. Fail-safe: an unset APP_ENV redirects too,
// and a missing redirect target is a config error, never a real send.
export const resolveRecipients = (
  to: string,
  env: { APP_ENV?: string; EMAIL_REDIRECT_TO?: string }
): string[] => {
  if (env.APP_ENV === "production") {
    return [to];
  }
  const targets = (env.EMAIL_REDIRECT_TO ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
  if (targets.length === 0) {
    throw new Error(
      "EMAIL_REDIRECT_TO is not set, so mail cannot be redirected outside production"
    );
  }
  return targets;
};

// "The Social House <booking@tsh-dev.jacobfri.is>" -> the bare address.
const ANGLE_BRACKET = /<([^>]+)>/;
export const senderAddress = (from: string): string =>
  ANGLE_BRACKET.exec(from)?.[1] ?? from.trim();

// Resend inserts {{{KEY}}} unescaped, so values are escaped here before they
// reach the HTML template.
const HTML_SPECIALS = /[&<>"']/g;
const HTML_ENTITIES: Record<string, string> = {
  "'": "&#39;",
  '"': "&quot;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};
export const escapeHtml = (value: string): string =>
  value.replace(HTML_SPECIALS, (char) => HTML_ENTITIES[char] ?? char);

export const invitationVariables = (
  actionUrl: string,
  companyDisplayName: string
): Record<string, string> => ({
  ACTION_URL: escapeHtml(actionUrl),
  COMPANY_DISPLAY_NAME: escapeHtml(companyDisplayName),
});

// Never echo a recipient address into a log row (docs/agents/stack.md).
export const redactRecipient = (text: string, recipient: string): string =>
  recipient ? text.replaceAll(recipient, "[recipient]") : text;
