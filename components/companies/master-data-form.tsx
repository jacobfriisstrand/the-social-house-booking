"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { TextField } from "@/components/forms/text-field";
import { TextareaField } from "@/components/forms/textarea-field";
import { useActionError } from "@/components/forms/use-form-action";
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
import { toast } from "@/components/ui/toast";
import { requestCompanyChange } from "@/lib/companies/change-actions";
import {
  type MemberCompanyValues,
  memberCompanySchema,
} from "@/lib/validation/company";
import { idleFormState } from "@/lib/validation/form-state";
import { messages } from "@/messages/da";
import { masterDataTextFields } from "./company-field-list";

const labels = messages.companyFields;
const copy = messages.companySettings;
const firstFillCopy = messages.masterData;

// Canonical member-facing company form. Both /company and /settings use this
// component and the same action; masterDataComplete only picks the copy. The
// action decides the flow: a first fill saves at once (the invitation's
// sign-up link already verified the email), later changes go through the
// email approval.
export function MasterDataForm({
  defaultValues,
  masterDataComplete,
}: {
  defaultValues: MemberCompanyValues;
  masterDataComplete: boolean;
}) {
  const form = useForm<MemberCompanyValues>({
    defaultValues,
    resolver: zodResolver(memberCompanySchema),
  });
  const [state, formAction, pending] = useActionState(
    requestCompanyChange,
    idleFormState
  );
  const submit = form.handleSubmit((values) =>
    startTransition(() => formAction(values))
  );
  useActionError(state, form);

  // The settings flow sends for approval; the first fill only saves.
  const submitLabel = (isPending: boolean): string => {
    if (masterDataComplete) {
      return isPending ? copy.saving : copy.save;
    }
    return isPending ? firstFillCopy.submitting : firstFillCopy.submit;
  };

  // useActionState is wired directly (not through useFormAction) because the
  // three outcomes carry three different messages.
  useEffect(() => {
    if (state.status === "success") {
      toast.add({
        title: copy.changePending(defaultValues.email),
        type: "success",
      });
    }
    if (state.status === "saved") {
      toast.add({
        title: firstFillCopy.saved,
        type: "success",
      });
    }
    if (state.status === "awaiting_new_email") {
      toast.add({
        title: copy.emailVerificationPending(state.email),
        type: "success",
      });
    }
  }, [state, defaultValues.email]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>
          {masterDataComplete ? copy.description : firstFillCopy.description}
        </CardDescription>
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
          {submitLabel(pending)}
        </Button>
      </CardFooter>
    </Card>
  );
}
