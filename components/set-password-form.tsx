"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { TextField } from "@/components/forms/text-field";
import { useFormAction } from "@/components/forms/use-form-action";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { setPassword } from "@/lib/auth/actions";
import {
  type SetPasswordLinkValues,
  type SetPasswordValues,
  setPasswordSchema,
} from "@/lib/validation/auth";
import { messages } from "@/messages/da";

const copy = messages.setPassword;

export function SetPasswordForm({ link }: { link: SetPasswordLinkValues }) {
  const form = useForm<SetPasswordValues>({
    defaultValues: {
      ...link,
      password: "",
      passwordConfirm: "",
    },
    resolver: zodResolver(setPasswordSchema),
  });
  const { pending, state, submit } = useFormAction({
    action: setPassword,
    form,
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {link.type === "recovery" &&
        state.status === "error" &&
        state.linkInvalid ? (
          <Alert className="mb-4" variant="destructive">
            <AlertDescription>
              {messages.setPassword.errors.recoveryLinkInvalid}{" "}
              <Link href="/forgot-password">{copy.recoveryLink}</Link>
            </AlertDescription>
          </Alert>
        ) : null}
        <form id="set-password-form" onSubmit={submit}>
          <FieldGroup>
            <TextField
              autoComplete="new-password"
              control={form.control}
              label={copy.password}
              name="password"
              type="password"
            />
            <TextField
              autoComplete="new-password"
              control={form.control}
              label={copy.passwordConfirm}
              name="passwordConfirm"
              type="password"
            />
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Button form="set-password-form" pending={pending} type="submit">
          {pending ? copy.submitting : copy.submit}
        </Button>
      </CardFooter>
    </Card>
  );
}
