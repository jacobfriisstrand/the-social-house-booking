// Master-data rules for companies (#1): which fields make the data complete,
// and the mapping between form values ("" for blank) and the companies row
// (null for blank). Pure; the server actions in lib/companies/ call this.
import type { Database } from "@/lib/supabase/database.types";
import {
  type AdminCompanyValues,
  type MasterDataValues,
  masterDataKeys,
} from "@/lib/validation/company";
import { messages } from "@/messages/da";
import { escapeHtml } from "@/supabase/functions/send-email/handler";

export type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];
export type CompanyUpdate = Database["public"]["Tables"]["companies"]["Update"];

const orNull = (value: string): string | null => (value === "" ? null : value);
const orEmpty = (value: string | null): string => value ?? "";

// The gate: company_master_data_completed_at is set the first time all nine
// mandatory fields are present.
export const hasAllMasterData = (
  values: Pick<MasterDataValues, (typeof masterDataKeys)[number]>
): boolean => masterDataKeys.every((key) => values[key].trim() !== "");

const masterDataUpdate = (
  values: Omit<MasterDataValues, "invoiceEmail"> & { invoiceEmail: string }
): CompanyUpdate => ({
  company_attention: orNull(values.attention),
  company_billing_address: orNull(values.billingAddress),
  company_billing_city: orNull(values.billingCity),
  company_billing_country: orNull(values.billingCountry),
  company_billing_notes: orNull(values.billingNotes),
  company_billing_postal_code: orNull(values.billingPostalCode),
  company_contact_name: orNull(values.contactName),
  company_contact_phone: orNull(values.contactPhone),
  company_cvr_number: orNull(values.cvrNumber),
  company_department: orNull(values.department),
  company_invoice_email: orNull(values.invoiceEmail),
  company_legal_name: orNull(values.legalName),
  company_reference: orNull(values.reference),
});

export const masterDataToUpdate = (values: MasterDataValues): CompanyUpdate =>
  masterDataUpdate(values);

export const adminValuesToUpdate = (
  values: AdminCompanyValues
): CompanyUpdate => ({
  ...masterDataUpdate(values),
  company_discount_percent: values.discountPercent,
  company_display_name: values.displayName,
  company_economic_customer_number: orNull(values.economicCustomerNumber),
  company_email: values.email,
  company_internal_note: orNull(values.internalNote),
  company_membership_status: values.membershipStatus,
});

export const companyToMasterDataValues = (
  row: CompanyRow
): MasterDataValues => ({
  attention: orEmpty(row.company_attention),
  billingAddress: orEmpty(row.company_billing_address),
  billingCity: orEmpty(row.company_billing_city),
  billingCountry:
    row.company_billing_country ?? messages.companyFields.defaultCountry,
  billingNotes: orEmpty(row.company_billing_notes),
  billingPostalCode: orEmpty(row.company_billing_postal_code),
  contactName: orEmpty(row.company_contact_name),
  contactPhone: orEmpty(row.company_contact_phone),
  cvrNumber: orEmpty(row.company_cvr_number),
  department: orEmpty(row.company_department),
  invoiceEmail: orEmpty(row.company_invoice_email),
  legalName: orEmpty(row.company_legal_name),
  reference: orEmpty(row.company_reference),
});

export const companyToAdminValues = (row: CompanyRow): AdminCompanyValues => ({
  ...companyToMasterDataValues(row),
  billingCountry: orEmpty(row.company_billing_country),
  companyId: row.company_id,
  discountPercent: row.company_discount_percent,
  displayName: row.company_display_name,
  economicCustomerNumber: orEmpty(row.company_economic_customer_number),
  email: row.company_email,
  internalNote: orEmpty(row.company_internal_note),
  membershipStatus: row.company_membership_status,
});

// Mail 10 variables (#1). Resend inserts {{{KEY}}} unescaped, so every value
// is escaped here; the hook's escapeHtml is the one implementation.
const text = (value: string | null): string => escapeHtml(value ?? "");

// company_billing_interval is text with one value in v1.0
// (supabase/schemas/companies.sql); this is its Danish label in Mail 10.
const billingMethodLabels: Record<string, string> = {
  monthly: "Månedlig fakturering",
};

// "Faktura-e-mail eller EAN": EAN and similar go in the billing notes.
const invoiceDetails = (row: CompanyRow): string => {
  const email = row.company_invoice_email ?? "";
  return row.company_billing_notes
    ? `${email} (${row.company_billing_notes})`
    : email;
};

export const companyCompletedVariables = (
  row: CompanyRow,
  actionUrl: string
): Record<string, string> => ({
  ACTION_URL: text(actionUrl),
  COMPANY_BILLING_METHOD: text(
    billingMethodLabels[row.company_billing_interval] ??
      row.company_billing_interval
  ),
  COMPANY_CONTACT_NAME: text(row.company_contact_name),
  COMPANY_CONTACT_PHONE: text(row.company_contact_phone),
  COMPANY_CVR_NUMBER: text(row.company_cvr_number),
  COMPANY_DISPLAY_NAME: text(row.company_display_name),
  COMPANY_EMAIL: text(row.company_email),
  COMPANY_INVOICE_DETAILS: text(invoiceDetails(row)),
  COMPANY_LEGAL_NAME: text(row.company_legal_name),
});
