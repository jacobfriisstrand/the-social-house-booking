"use server";

// Email + password login (issue #25 as revised: email is the only login
// credential). @supabase/ssr sets the session cookies; the schema is parsed
// again on the server (docs/agents/ui.md). The generic error message covers
// every failure so the form never discloses whether an email exists.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation/auth";
import { messages } from "@/messages/da";

export interface LoginState {
  error?: string;
}

export async function logIn(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? messages.login.failed };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: messages.login.failed };
  }

  redirect(
    data.user.app_metadata.app_role === "admin" ? "/admin" : "/bookings"
  );
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
