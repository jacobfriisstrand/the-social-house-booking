"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { masterDataTextFields } from "./company-field-list";
import { MembershipField } from "./membership-field";

const labels = messages.companyFields;
const copy = messages.companies;

// Admin review and correction of every field, including the login email.
// onSaved lets a parent (the company sheet) close itself once a save lands;
// the success toast is fired here by useFormAction.
export function CompanyForm({
  defaultValues,
  onSaved,
}: {
  defaultValues: AdminCompanyValues;
  onSaved?: () => void;
}) {
  const form = useForm<AdminCompanyValues>({
    defaultValues,
    resolver: zodResolver(adminCompanySchema),
  });
  const { pending, state, submit } = useFormAction({
    action: updateCompany,
    form,
    successMessage: copy.saved,
  });
  const membershipStatus = useWatch({
    control: form.control,
    name: "membershipStatus",
  });

  useEffect(() => {
    if (state.status === "success") {
      onSaved?.();
    }
  }, [state, onSaved]);

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
            <MembershipField control={form.control} />
            <TextField
              control={form.control}
              disabled={membershipStatus === "external"}
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
              required={false}
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
              required={false}
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
