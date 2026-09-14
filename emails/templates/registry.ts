// Template registry for outbound mail (docs/agents/email.md). One entry per
// template alias in emails/templates/<alias>.ts; sendMail() and the Send
// Email Hook refuse kinds without an entry, so a template lands in the same
// PR that first sends it. The alias values are the same kebab-case names as
// the outbound_email_kind enum, and scripts/sync-email-templates.ts reads
// these entries to create or update the Resend template by alias.
import type { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import { adminCompanyCompleted } from "./admin-company-completed.ts";
import { companyInvitation } from "./company-invitation.ts";

export type OutboundEmailKind =
  Database["public"]["Enums"]["outbound_email_kind"];

export interface EmailTemplate {
  // Resend template body with {{{KEY}}} placeholders; the sync script
  // derives the variable list from `variables`.
  html: string;
  // May carry {{{KEY}}} placeholders too; sendMail() substitutes them before
  // the send, since it passes the subject explicitly.
  subject: string;
  variables: z.ZodObject<Record<string, z.ZodString | z.ZodNumber>>;
}

export const emailTemplates: Partial<Record<OutboundEmailKind, EmailTemplate>> =
  {
    "admin-company-completed": adminCompanyCompleted,
    "company-invitation": companyInvitation,
  };
