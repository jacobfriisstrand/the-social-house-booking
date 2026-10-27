import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/auth/get-session";
import { safeNextPath } from "@/lib/auth/next-path";
import { isDevelopment } from "@/lib/env";
import { messages } from "@/messages/da";

// The set-password action flags which password event landed here; the page
// maps the flag to the matching notice.
const passwordNotice = (
  created?: string,
  changed?: string
): string | undefined => {
  if (created) {
    return messages.login.passwordCreatedAlert;
  }
  if (changed) {
    return messages.login.passwordChangedAlert;
  }
  return undefined;
};

export const metadata: Metadata = {
  title: messages.login.title,
};

// A link that carries `next` (the booking link in Mail 4, 5 and 6, #88)
// passes a visitor who is already logged in straight on; everyone else logs
// in first and lands there afterwards. The set-password action lands here
// after the first password: the notice tells the company which password to
// use and what follows the login.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    "email-changed"?: string;
    next?: string;
    "password-changed"?: string;
    "password-created"?: string;
  }>;
}) {
  const {
    "email-changed": emailChanged,
    next,
    "password-changed": passwordChanged,
    "password-created": passwordCreated,
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
      passwordNotice={passwordNotice(passwordCreated, passwordChanged)}
    />
  );
}
