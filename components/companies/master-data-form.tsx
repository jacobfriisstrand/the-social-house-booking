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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { saveMasterData } from "@/lib/companies/master-data-actions";
import {
  type MasterDataValues,
  masterDataSchema,
} from "@/lib/validation/company";
import { messages } from "@/messages/da";
import { masterDataTextFields } from "./company-field-list";

const labels = messages.companyFields;
const copy = messages.masterData;

// The company's own master data. The login email is shown, not edited
// (admin changes it in v1.0). On first completion the action redirects home.
export function MasterDataForm({
  defaultValues,
  email,
}: {
  defaultValues: MasterDataValues;
  email: string;
}) {
  const form = useForm<MasterDataValues>({
    defaultValues,
    resolver: zodResolver(masterDataSchema),
  });
  const { pending, submit } = useFormAction({
    action: saveMasterData,
    form,
    successMessage: copy.saved,
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
            <Field>
              <FieldLabel htmlFor="field-email">{labels.email}</FieldLabel>
              <Input
                disabled
                id="field-email"
                name="email"
                readOnly
                type="email"
                value={email}
              />
              <FieldDescription>{copy.emailHint}</FieldDescription>
            </Field>
            {masterDataTextFields.map((spec) => (
              <TextField control={form.control} key={spec.name} {...spec} />
            ))}
            <TextareaField
              control={form.control}
              label={labels.billingNotes}
              name="billingNotes"
            />
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Button form="master-data-form" pending={pending} type="submit">
          {pending ? copy.submitting : copy.submit}
        </Button>
      </CardFooter>
    </Card>
  );
}
