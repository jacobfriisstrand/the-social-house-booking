// The only code in the Next app that calls Resend (docs/agents/email.md).
// Writes the outbound_emails send log, enforces the global send rules (fixed
// sender, development redirect, once-only kinds), and throws on failure so
// callers decide whether the user flow continues.
import { Resend } from "resend";
import {
  emailTemplates,
  type OutboundEmailKind,
} from "@/emails/templates/registry";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SendMailInput {
  bookingId?: string;
  companyId?: string;
  kind: OutboundEmailKind;
  to: string;
  variables: Record<string, string | number>;
}

export interface SentMail {
  outboundEmailId: string;
  resendId: string;
}

let client: Resend | undefined;

const resendClient = () => {
  if (!env.RESEND_API_KEY) {
    throw new Error("sendMail: RESEND_API_KEY is not set");
  }
  client ??= new Resend(env.RESEND_API_KEY);
  return client;
};

// "The Social House <booking@tsh-dev.jacobfri.is>" -> the bare address, for
// reply-to.
const ANGLE_BRACKET = /<([^>]+)>/;
const senderAddress = (from: string): string =>
  ANGLE_BRACKET.exec(from)?.[1] ?? from.trim();

// In development every mail goes to EMAIL_REDIRECT_TO instead of the real
// recipient (docs/agents/email.md); an unset target is a config error, never
// a real send.
const developmentRecipients = (): string[] => {
  const targets = env.EMAIL_REDIRECT_TO;
  if (!targets) {
    throw new Error(
      "sendMail: EMAIL_REDIRECT_TO is not set, so mail cannot be redirected in development"
    );
  }
  return targets
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
};

const redactRecipient = (text: string, recipient: string): string =>
  recipient ? text.replaceAll(recipient, "[recipient]") : text;

// Resend renders {{{KEY}}} in the body, but the subject is passed
// explicitly per send, so placeholders there are substituted here.
const PLACEHOLDER = /\{\{\{(\w+)\}\}\}/g;
const renderSubject = (
  subject: string,
  variables: Record<string, string | number>
): string =>
  subject.replace(PLACEHOLDER, (match, key: string) =>
    key in variables ? String(variables[key]) : match
  );

export const sendMail = async ({
  bookingId,
  companyId,
  kind,
  to,
  variables,
}: SendMailInput): Promise<SentMail> => {
  const template = emailTemplates[kind];
  if (!template) {
    throw new Error(`sendMail: no template registered for "${kind}"`);
  }
  const parsedVariables = template.variables.parse(variables);
  const resend = resendClient();
  const recipients =
    env.APP_ENV === "development" ? developmentRecipients() : [to];
  const renderedSubject = renderSubject(template.subject, parsedVariables);
  const subject =
    env.APP_ENV === "development"
      ? `[development] ${renderedSubject}`
      : renderedSubject;

  // The log row goes in before the send: the once-only index
  // (reminder, booking-confirmation) aborts a double send before Resend is
  // called, so retries are safe.
  const admin = createAdminClient();
  const insert = await admin
    .from("outbound_emails")
    .insert({
      outbound_email_booking_id: bookingId ?? null,
      outbound_email_company_id: companyId ?? null,
      outbound_email_kind: kind,
      outbound_email_status: "queued",
      outbound_email_to: to,
    })
    .select("outbound_email_id")
    .single();
  if (insert.error) {
    if (insert.error.code === "23505") {
      throw new Error(
        `sendMail: a "${kind}" email for booking ${bookingId} was already logged; the once-only index prevented a duplicate`
      );
    }
    throw new Error(
      `sendMail: could not write the send log: ${insert.error.message}`
    );
  }
  const outboundEmailId = insert.data.outbound_email_id;

  const { data, error } = await resend.emails.send({
    from: env.RESEND_FROM,
    replyTo: senderAddress(env.RESEND_FROM),
    subject,
    template: { id: kind, variables: parsedVariables },
    to: recipients,
  });
  if (error || !data) {
    const message = redactRecipient(
      error?.message ?? "unknown Resend error",
      to
    );
    await admin
      .from("outbound_emails")
      .update({
        outbound_email_error: message,
        outbound_email_status: "failed",
      })
      .eq("outbound_email_id", outboundEmailId);
    throw new Error(`sendMail: Resend rejected the "${kind}" mail: ${message}`);
  }

  const update = await admin
    .from("outbound_emails")
    .update({ outbound_email_resend_id: data.id })
    .eq("outbound_email_id", outboundEmailId);
  if (update.error) {
    throw new Error(
      `sendMail: could not store the Resend id for "${kind}": ${update.error.message}`
    );
  }
  return { outboundEmailId, resendId: data.id };
};
