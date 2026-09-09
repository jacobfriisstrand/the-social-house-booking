"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type LoginState, logIn } from "@/lib/auth/actions";
import { messages } from "@/messages/da";

const initial: LoginState = {};

export function LoginForm({ isDevelopment }: { isDevelopment: boolean }) {
  const [state, formAction] = useActionState(logIn, initial);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>The Social House</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={formAction}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">
                    {messages.login.email}
                  </FieldLabel>
                  <Input
                    autoComplete="email"
                    id="email"
                    name="email"
                    required
                    type="email"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">
                    {messages.login.password}
                  </FieldLabel>
                  <Input
                    autoComplete="current-password"
                    id="password"
                    name="password"
                    required
                    type="password"
                  />
                </Field>
                {state.error ? (
                  <Alert variant="destructive">
                    <AlertDescription>{state.error}</AlertDescription>
                  </Alert>
                ) : null}
                <Button className="w-full" type="submit">
                  {messages.login.submit}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
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
