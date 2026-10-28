import type { Control, Path } from "react-hook-form";
import { masterDataTextFields } from "@/components/companies/company-field-list";
import { TextField } from "@/components/forms/text-field";
import { TextareaField } from "@/components/forms/textarea-field";
import type { MasterDataValues } from "@/lib/validation/company";
import { messages } from "@/messages/da";

// The field names the master data spans, plus the free-text billing notes
// that rides with them.
type MasterDataFieldName =
  | (typeof masterDataTextFields)[number]["name"]
  | "billingNotes";

// The company's master-data fields as both the admin form and the invitation
// signup render them: the spec-driven text fields (components/companies/
// company-field-list.ts) plus the free-text billing notes. One definition,
// so the two forms cannot drift. A fragment — the form it lands in owns the
// FieldGroup, so the fields space like its own.
export function MasterDataFields<
  Values extends Pick<MasterDataValues, MasterDataFieldName>,
>({ control }: { control: Control<Values> }) {
  return (
    <>
      {/* The casts mirror membership-field.tsx: inside a generic component
          the spec's literal names stay deferred Paths, so relate them
          explicitly. */}
      {masterDataTextFields.map((spec) => (
        <TextField
          control={control}
          key={spec.name}
          {...spec}
          name={spec.name as Path<Values>}
        />
      ))}
      <TextareaField
        control={control}
        label={messages.companyFields.billingNotes}
        name={"billingNotes" as Path<Values>}
        required={false}
      />
    </>
  );
}
