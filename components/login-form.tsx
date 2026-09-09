"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useActionState, useEffect } from "react";
import {
  Controller,
  type ControllerFieldState,
  type ControllerRenderProps,
  useForm,
} from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type LoginState, logIn } from "@/lib/auth/actions";
import type { LoginValues } from "@/lib/validation/auth";
import { loginSchema } from "@/lib/validation/auth";
import { messages } from "@/messages/da";

const initialState: LoginState = { status: "idle" };

interface FieldRender<K extends keyof LoginValues> {
  field: ControllerRenderProps<LoginValues, K>;
  fieldState: ControllerFieldState;
}

function EmailField({ field, fieldState }: FieldRender<"email">) {
  return (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor="login-email">{messages.login.email}</FieldLabel>
      <Input
        {...field}
        aria-invalid={fieldState.invalid}
        autoComplete="email"
        id="login-email"
        name={field.name}
        type="email"
      />
      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
    </Field>
  );
}

function PasswordField({ field, fieldState }: FieldRender<"password">) {
  return (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor="login-password">
        {messages.login.password}
      </FieldLabel>
      <Input
        {...field}
        aria-invalid={fieldState.invalid}
        autoComplete="current-password"
        id="login-password"
        name={field.name}
        type="password"
      />
      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
    </Field>
  );
}

export function LoginForm({ isDevelopment }: { isDevelopment: boolean }) {
  const [state, formAction, pending] = useActionState(logIn, initialState);
  const form = useForm<LoginValues>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(loginSchema),
  });
  const handleSubmit = form.handleSubmit((values) =>
    startTransition(() => formAction(values))
  );

  useEffect(() => {
    if (state.status === "error") {
      form.setError("root", { message: state.error });
    }
  }, [state, form]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>The Social House</CardTitle>
          </CardHeader>
          <CardContent>
            <form id="login-form" onSubmit={handleSubmit}>
              <FieldGroup>
                <Controller
                  control={form.control}
                  name="email"
                  render={EmailField}
                />
                <Controller
                  control={form.control}
                  name="password"
                  render={PasswordField}
                />
                {state.status === "error" ? (
                  <Alert variant="destructive">
                    <AlertDescription>{state.error}</AlertDescription>
                  </Alert>
                ) : null}
              </FieldGroup>
            </form>
          </CardContent>
          <CardFooter>
            <Button form="login-form" pending={pending} type="submit">
              {pending ? messages.login.submitting : messages.login.submit}
            </Button>
          </CardFooter>
        </Card>

        {isDevelopment ? (
          <Card>
            <CardHeader>
              <CardTitle>{messages.login.seedHint}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="flex flex-col gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">
                    {messages.login.seedAdminLabel}
                  </dt>
                  <dd className="font-mono">{messages.login.seedAdminEmail}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {messages.login.seedMemberLabel}
                  </dt>
                  <dd className="font-mono">
                    {messages.login.seedMemberEmail}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {messages.login.seedExternalLabel}
                  </dt>
                  <dd className="font-mono">
                    {messages.login.seedExternalEmail}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
