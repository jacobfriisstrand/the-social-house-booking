"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { TextField } from "@/components/forms/text-field";
import { TextareaField } from "@/components/forms/textarea-field";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { requestCompanyChange } from "@/lib/companies/change-actions";
import {
  type MemberCompanyValues,
  memberCompanySchema,
} from "@/lib/validation/company";
import { messages } from "@/messages/da";
import { masterDataTextFields } from "./company-field-list";

const labels = messages.companyFields;
const copy = messages.companySettings;

// Canonical member-facing company form. Both /company and /settings use this
// component and the same approval action.
export function MasterDataForm({
  defaultValues,
}: {
  defaultValues: MemberCompanyValues;
}) {
  const form = useForm<MemberCompanyValues>({
    defaultValues,
    resolver: zodResolver(memberCompanySchema),
  });
  const { pending, submit } = useFormAction({
    action: requestCompanyChange,
    form,
    successMessage: messages.companySettings.changePending(defaultValues.email),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="master-data-form" onSubmit={submit}>
          <FieldGroup>
            <TextField
              autoComplete="email"
              control={form.control}
              label={labels.email}
              name="email"
              type="email"
            />
            {masterDataTextFields.map((spec) => (
              <TextField control={form.control} key={spec.name} {...spec} />
            ))}
            <TextareaField
              control={form.control}
              label={labels.billingNotes}
              name="billingNotes"
              required={false}
            />
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Button form="master-data-form" pending={pending} type="submit">
          {pending ? copy.saving : copy.save}
        </Button>
      </CardFooter>
    </Card>
  );
}
