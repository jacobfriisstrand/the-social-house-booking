"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { SelectField } from "@/components/forms/select-field";
import { TextField } from "@/components/forms/text-field";
import { TextareaField } from "@/components/forms/textarea-field";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { updateCompany } from "@/lib/companies/admin-actions";
import {
  type AdminCompanyValues,
  adminCompanySchema,
} from "@/lib/validation/company";
import { messages } from "@/messages/da";
import {
  masterDataTextFields,
  membershipStatusItems,
} from "./company-field-list";

const labels = messages.companyFields;
const copy = messages.companies;

// Admin review and correction of every field, including the login email.
export function CompanyForm({
  defaultValues,
}: {
  defaultValues: AdminCompanyValues;
}) {
  const form = useForm<AdminCompanyValues>({
    defaultValues,
    resolver: zodResolver(adminCompanySchema),
  });
  const { pending, submit } = useFormAction({
    action: updateCompany,
    form,
    successMessage: copy.saved,
  });

  return (
    <form className="flex flex-col gap-6" onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>{copy.sections.account}</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <TextField
              control={form.control}
              label={labels.email}
              name="email"
              type="email"
            />
            <TextField
              control={form.control}
              label={labels.displayName}
              name="displayName"
            />
            <SelectField
              control={form.control}
              items={membershipStatusItems}
              label={labels.membershipStatus}
              name="membershipStatus"
            />
            <TextField
              control={form.control}
              label={labels.discountPercent}
              name="discountPercent"
              type="number"
            />
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{copy.sections.masterData}</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {masterDataTextFields.map((spec) => (
              <TextField control={form.control} key={spec.name} {...spec} />
            ))}
            <TextareaField
              control={form.control}
              label={labels.billingNotes}
              name="billingNotes"
            />
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{copy.sections.internal}</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <TextField
              control={form.control}
              label={labels.economicCustomerNumber}
              name="economicCustomerNumber"
            />
            <TextareaField
              control={form.control}
              label={labels.internalNote}
              name="internalNote"
            />
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button pending={pending} type="submit">
            {pending ? copy.saving : copy.save}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
