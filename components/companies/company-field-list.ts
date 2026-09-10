// Field descriptors shared by the admin company form and the company's own
// master-data form (#1): same labels, same order, one place to change.
import type { TextFieldProps } from "@/components/forms/text-field";
import type { AdminCompanyValues } from "@/lib/validation/company";
import { messages } from "@/messages/da";

type FieldSpec<Name extends keyof AdminCompanyValues> = Omit<
  TextFieldProps<Pick<AdminCompanyValues, Name>>,
  "control"
> & { name: Name };

const labels = messages.companyFields;

// The nine mandatory fields, then the optional ones.
export const masterDataTextFields = [
  { autoComplete: "organization", label: labels.legalName, name: "legalName" },
  { label: labels.cvrNumber, name: "cvrNumber" },
  { autoComplete: "name", label: labels.contactName, name: "contactName" },
  {
    autoComplete: "tel",
    label: labels.contactPhone,
    name: "contactPhone",
    type: "tel",
  },
  { label: labels.invoiceEmail, name: "invoiceEmail", type: "email" },
  {
    autoComplete: "street-address",
    label: labels.billingAddress,
    name: "billingAddress",
  },
  {
    autoComplete: "postal-code",
    label: labels.billingPostalCode,
    name: "billingPostalCode",
  },
  {
    autoComplete: "address-level2",
    label: labels.billingCity,
    name: "billingCity",
  },
  {
    autoComplete: "country-name",
    label: labels.billingCountry,
    name: "billingCountry",
  },
  { label: labels.attention, name: "attention" },
  { label: labels.department, name: "department" },
  { label: labels.reference, name: "reference" },
] as const satisfies readonly FieldSpec<
  | "attention"
  | "billingAddress"
  | "billingCity"
  | "billingCountry"
  | "billingPostalCode"
  | "contactName"
  | "contactPhone"
  | "cvrNumber"
  | "department"
  | "invoiceEmail"
  | "legalName"
  | "reference"
>[];

export const membershipStatusItems = [
  { label: messages.companies.membership.member, value: "member" },
  { label: messages.companies.membership.external, value: "external" },
];
