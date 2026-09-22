"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requestCompanyPasswordReset } from "@/lib/auth/recovery-actions";
import type { FormState } from "@/lib/validation/form-state";
import { messages } from "@/messages/da";

const initialState: FormState<never> = { status: "idle" };

export function CompanySecuritySection() {
  const [state, formAction, pending] = useActionState(
    requestCompanyPasswordReset,
    initialState
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{messages.companySettings.securityTitle}</CardTitle>
        <CardDescription>
          {messages.companySettings.securityWarning}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state.status === "success" ? (
          <p className="text-sm">{messages.companySettings.passwordLinkSent}</p>
        ) : null}
        {state.status === "error" ? (
          <p className="text-destructive text-sm">{state.error}</p>
        ) : null}
      </CardContent>
      <CardFooter>
        <form action={formAction}>
          <Button pending={pending} type="submit">
            {pending
              ? messages.companySettings.passwordLinkSending
              : messages.companySettings.passwordLink}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
