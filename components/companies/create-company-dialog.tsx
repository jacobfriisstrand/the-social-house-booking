"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
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
import { MembershipField } from "./membership-field";

const defaultValues: CreateCompanyValues = {
  discountPercent: 0,
  displayName: "",
  email: "",
  legalName: "",
  membershipStatus: "member",
};

const labels = messages.companyFields;

// Create, and for a member also invite (#14: an external company gets no
// invite). The action redirects to the new company's page on success, so
// the dialog only ever shows errors.
export function CreateCompanyDialog() {
  const form = useForm<CreateCompanyValues>({
    defaultValues,
    resolver: zodResolver(createCompanySchema),
  });
  const { pending, submit } = useFormAction({ action: createCompany, form });
  const membershipStatus = useWatch({
    control: form.control,
    name: "membershipStatus",
  });

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
            <MembershipField control={form.control} />
            <TextField
              control={form.control}
              disabled={membershipStatus === "external"}
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
              : messages.companies.createSubmit[membershipStatus]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
