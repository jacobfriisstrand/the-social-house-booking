"use client";

// #125: the signed-in admin changes their own password. Success clears the
// fields and toasts; the session stays valid, so no re-login follows.
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { TextField } from "@/components/forms/text-field";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { changePassword } from "@/lib/auth/actions";
import {
  type ChangePasswordValues,
  changePasswordSchema,
} from "@/lib/validation/auth";
import { messages } from "@/messages/da";

const labels = messages.settings;
const copy = messages.setPassword;

export function ChangePasswordForm() {
  const form = useForm<ChangePasswordValues>({
    defaultValues: { password: "", passwordConfirm: "" },
    resolver: zodResolver(changePasswordSchema),
  });
  const { pending, state, submit } = useFormAction({
    action: changePassword,
    form,
    successMessage: labels.passwordSaved,
  });

  useEffect(() => {
    if (state.status === "success") {
      form.reset();
    }
  }, [state, form]);

  return (
    <form className="flex flex-col gap-6" onSubmit={submit}>
      <FieldGroup>
        <TextField
          autoComplete="new-password"
          control={form.control}
          label={labels.password}
          name="password"
          type="password"
        />
        <TextField
          autoComplete="new-password"
          control={form.control}
          label={labels.passwordConfirm}
          name="passwordConfirm"
          type="password"
        />
      </FieldGroup>
      <Button className="w-fit" pending={pending} type="submit">
        {pending ? copy.submitting : copy.submit}
      </Button>
    </form>
  );
}
