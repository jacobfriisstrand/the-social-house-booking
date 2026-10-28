import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/auth/get-session";
import { safeNextPath } from "@/lib/auth/next-path";
import { isDevelopment } from "@/lib/env";
import { messages } from "@/messages/da";

export const metadata: Metadata = {
  title: messages.login.title,
};

// A link that carries `next` (the booking link in Mail 4, 5 and 6, #88)
// passes a visitor who is already logged in straight on; everyone else logs
// in first and lands there afterwards. The recovery flow's set-password
// action lands here after the password change: the notice tells the user
// which password to use now. An invitation never lands here — its page
// completes the account in one step and goes straight into the app.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    "email-changed"?: string;
    next?: string;
    "password-changed"?: string;
  }>;
}) {
  const {
    "email-changed": emailChanged,
    next,
    "password-changed": passwordChanged,
  } = await searchParams;
  const nextPath = safeNextPath(next);
  if (nextPath && (await getSession())) {
    redirect(nextPath);
  }
  return (
    <LoginForm
      emailChanged={emailChanged}
      isDevelopment={isDevelopment}
      next={nextPath ?? undefined}
      passwordNotice={
        passwordChanged ? messages.login.passwordChangedAlert : undefined
      }
    />
  );
}
