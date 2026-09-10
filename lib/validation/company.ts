// Company schemas (#1), shared by the client forms and the server actions;
// the action re-parses on the server, always (docs/agents/ui.md).
// Strings are trimmed; optional fields stay "" in the form and become null
// on the row (lib/domain/company-master-data.ts).
import { z } from "zod";
import { messages } from "@/messages/da";

const { errors } = messages.companyFields;
const SHORT_MAX = 200;
const LONG_MAX = 1000;

const required = z
  .string()
  .trim()
  .min(1, errors.required)
  .max(SHORT_MAX, errors.tooLong);
const optional = z.string().trim().max(SHORT_MAX, errors.tooLong);
const optionalLong = z.string().trim().max(LONG_MAX, errors.tooLong);
const email = z.email(errors.emailInvalid);

export const membershipStatusValues = ["member", "external"] as const;

// What admin sets at creation and may change later; the trigger
// companies_guard_self_escalation keeps companies away from the last two.
const accountFields = {
  discountPercent: z
    .number(errors.discountInvalid)
    .int(errors.discountInvalid)
    .min(0, errors.discountInvalid)
    .max(100, errors.discountInvalid),
  displayName: required,
  email,
  membershipStatus: z.enum(membershipStatusValues),
};

// The nine mandatory fields: the booking gate (#1, Bilag 1).
const masterDataFields = {
  billingAddress: required,
  billingCity: required,
  billingCountry: required,
  billingPostalCode: required,
  contactName: required,
  contactPhone: required,
  cvrNumber: required,
  invoiceEmail: email,
  legalName: required,
};

const optionalFields = {
  attention: optional,
  billingNotes: optionalLong,
  department: optional,
  reference: optional,
};

export const masterDataKeys = Object.keys(masterDataFields) as Array<
  keyof typeof masterDataFields
>;

export const createCompanySchema = z.object({
  ...accountFields,
  legalName: required,
});

export const masterDataSchema = z.object({
  ...masterDataFields,
  ...optionalFields,
});

// Admin may leave master data blank until the company completes it; once
// company_master_data_completed_at is set, the action re-checks the nine with
// masterDataSchema so they never go blank again.
export const adminCompanySchema = z.object({
  ...accountFields,
  ...optionalFields,
  billingAddress: optional,
  billingCity: optional,
  billingCountry: optional,
  billingPostalCode: optional,
  companyId: z.guid(),
  contactName: optional,
  contactPhone: optional,
  cvrNumber: optional,
  economicCustomerNumber: optional,
  internalNote: optionalLong,
  invoiceEmail: z.union([z.literal(""), email]),
  legalName: optional,
});

export type CreateCompanyValues = z.infer<typeof createCompanySchema>;
export type MasterDataValues = z.infer<typeof masterDataSchema>;
export type AdminCompanyValues = z.infer<typeof adminCompanySchema>;
