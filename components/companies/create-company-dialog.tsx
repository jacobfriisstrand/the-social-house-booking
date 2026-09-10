"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { SelectField } from "@/components/forms/select-field";
import { TextField } from "@/components/forms/text-field";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { createCompany } from "@/lib/companies/admin-actions";
import {
  type CreateCompanyValues,
  createCompanySchema,
} from "@/lib/validation/company";
import { messages } from "@/messages/da";
import { membershipStatusItems } from "./company-field-list";

const defaultValues: CreateCompanyValues = {
  discountPercent: 0,
  displayName: "",
  email: "",
  legalName: "",
  membershipStatus: "external",
};

const labels = messages.companyFields;

// Create + invite. The action redirects to the new company's page on
// success, so the dialog only ever shows errors.
export function CreateCompanyDialog() {
  const form = useForm<CreateCompanyValues>({
    defaultValues,
    resolver: zodResolver(createCompanySchema),
  });
  const { pending, submit } = useFormAction({ action: createCompany, form });

  return (
    <Dialog>
      <DialogTrigger render={<Button />}>
        {messages.companies.create}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{messages.companies.create}</DialogTitle>
          <DialogDescription>
            {messages.companies.createDescription}
          </DialogDescription>
        </DialogHeader>
        <form id="create-company-form" onSubmit={submit}>
          <FieldGroup>
            <TextField
              autoComplete="off"
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
            <TextField
              control={form.control}
              label={labels.legalName}
              name="legalName"
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
        </form>
        <DialogFooter>
          <Button form="create-company-form" pending={pending} type="submit">
            {pending
              ? messages.companies.createSubmitting
              : messages.companies.createSubmit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
