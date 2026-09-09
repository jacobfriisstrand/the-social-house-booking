import { isDevelopment } from "@/lib/env";
import { LoginForm } from "../../../components/login-form";

export default function LoginPage() {
  return <LoginForm isDevelopment={isDevelopment} />;
}
