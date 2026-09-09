import { LoginForm } from "@/components/login-form";
import { isDevelopment } from "@/lib/env";

export default function LoginPage() {
  return <LoginForm isDevelopment={isDevelopment} />;
}
