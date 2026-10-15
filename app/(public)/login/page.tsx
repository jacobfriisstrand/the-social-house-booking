import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/auth/get-session";
import { safeNextPath } from "@/lib/auth/next-path";
import { isDevelopment } from "@/lib/env";

// A link that carries `next` (the booking link in Mail 4, 5 and 6, #88)
// passes a visitor who is already logged in straight on; everyone else logs
// in first and lands there afterwards.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ "email-changed"?: string; next?: string }>;
}) {
  const { "email-changed": emailChanged, next } = await searchParams;
  const nextPath = safeNextPath(next);
  if (nextPath && (await getSession())) {
    redirect(nextPath);
  }
  return (
    <LoginForm
      emailChanged={emailChanged}
      isDevelopment={isDevelopment}
      next={nextPath ?? undefined}
    />
  );
}
