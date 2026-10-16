"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useForm, useWatch } from "react-hook-form";
import { TextField } from "@/components/forms/text-field";
import { useActionError } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { createCompany } from "@/lib/companies/admin-actions";
import {
  type CreateCompanyValues,
  createCompanySchema,
} from "@/lib/validation/company";
import { idleFormState } from "@/lib/validation/form-state";
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
// invite), in a right-hand sheet like the company edit — the user asked for
// a sheet here, bending DESIGN.md's "dialogs for flows the user starts".
// useActionState is wired directly (not through useFormAction) because the
// created state carries the invite-failed flag. On success the sheet closes
// and the list refreshes; a failed first invite sends the list the
// ?invite=failed alert, as before.
export function CreateCompanySheet() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const form = useForm<CreateCompanyValues>({
    defaultValues,
    resolver: zodResolver(createCompanySchema),
  });
  const [state, formAction, pending] = useActionState(
    createCompany,
    idleFormState
  );
  const membershipStatus = useWatch({
    control: form.control,
    name: "membershipStatus",
  });

  const submit = form.handleSubmit((values) =>
    startTransition(() => formAction(values))
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next) {
        form.reset();
      }
    },
    [form]
  );

  useActionError(state, form);

  useEffect(() => {
    if (state.status !== "created") {
      return;
    }
    toast.add({ title: messages.companies.created, type: "success" });
    setOpen(false);
    form.reset();
    if (state.inviteFailed) {
      router.push("/admin/companies?invite=failed");
      return;
    }
    router.refresh();
  }, [state, form, router]);

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger render={<Button />}>
        {messages.companies.create}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-full gap-0 overflow-y-auto max-md:top-0 max-md:left-0 max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{messages.companies.create}</DialogTitle>
          <DialogDescription>
            {messages.companies.createDescription}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-6 px-4 pb-8" onSubmit={submit}>
          <Card>
            <CardContent>
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
            </CardContent>
            <CardFooter>
              <Button pending={pending} type="submit">
                {pending
                  ? messages.companies.createSubmitting
                  : messages.companies.createSubmit[membershipStatus]}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </DialogContent>
    </Dialog>
  );
}
