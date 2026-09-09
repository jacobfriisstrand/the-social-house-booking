import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isDevelopment } from "@/lib/env";
import { messages } from "@/messages/da";
import { DemoForm } from "./form";

export const metadata: Metadata = {
  title: messages.demo.title,
};

// Forms baseline (issue #30): the reference wiring for react-hook-form + zod +
// Server Action with useActionState. The booking form replaces this as its pattern source.
// Only available in development — agents use it as a reference, not end users.
export default function DemoFormsPage() {
  if (!isDevelopment) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-4 py-10">
      <DemoForm />
    </main>
  );
}
