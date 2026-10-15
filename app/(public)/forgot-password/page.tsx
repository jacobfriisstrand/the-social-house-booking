import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { messages } from "@/messages/da";

export const metadata: Metadata = {
  title: messages.forgotPassword.title,
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
