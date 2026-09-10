// Template registry for outbound mail (docs/agents/email.md). One entry per
// template alias in emails/templates/<alias>.tsx; sendMail() refuses kinds
// without an entry, so a template lands in the same PR that first sends it.
// The alias values are the same kebab-case names as the outbound_email_kind
// enum, and the sync script (#11) reads these entries to create or update the
// Resend template by alias.
import type { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";

export type OutboundEmailKind =
  Database["public"]["Enums"]["outbound_email_kind"];

export interface EmailTemplate {
  subject: string;
  variables: z.ZodType<Record<string, string | number>>;
}

export const emailTemplates: Partial<Record<OutboundEmailKind, EmailTemplate>> =
  {};
