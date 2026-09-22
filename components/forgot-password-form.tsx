"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { TextField } from "@/components/forms/text-field";
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
import { requestPasswordReset } from "@/lib/auth/recovery-actions";
import {
  type ForgotPasswordValues,
  forgotPasswordSchema,
} from "@/lib/validation/auth";
import { messages } from "@/messages/da";

export function ForgotPasswordForm() {
  const form = useForm<ForgotPasswordValues>({
    defaultValues: { email: "" },
    resolver: zodResolver(forgotPasswordSchema),
  });
  const { pending, submit } = useFormAction({
    action: requestPasswordReset,
    form,
    successMessage: messages.forgotPassword.genericSuccess,
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{messages.forgotPassword.title}</CardTitle>
          <CardDescription>
            {messages.forgotPassword.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form id="forgot-password-form" onSubmit={submit}>
            <FieldGroup>
              <TextField
                control={form.control}
                label={messages.forgotPassword.email}
                name="email"
                type="email"
              />
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter>
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button
              className="flex-1"
              form="forgot-password-form"
              pending={pending}
              type="submit"
            >
              {pending
                ? messages.forgotPassword.submitting
                : messages.forgotPassword.submit}
            </Button>
            <Button
              className="flex-1"
              render={<Link href="/login" />}
              variant="secondary"
            >
              {messages.forgotPassword.backToLogin}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </main>
  );
}
