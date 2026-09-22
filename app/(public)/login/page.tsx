import { LoginForm } from "@/components/login-form";
import { isDevelopment } from "@/lib/env";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ "email-changed"?: string }>;
}) {
  const { "email-changed": emailChanged } = await searchParams;
  return (
    <LoginForm emailChanged={emailChanged} isDevelopment={isDevelopment} />
  );
}
