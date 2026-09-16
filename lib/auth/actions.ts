"use server";

// Email + password login (issue #25 as revised: email is the only login
// credential). @supabase/ssr sets the session cookies; the schema is parsed
// again on the server (docs/agents/ui.md). The generic error message covers
// every failure so the form never discloses whether an email exists.
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  type LoginValues,
  loginSchema,
  type SetPasswordValues,
  setPasswordSchema,
} from "@/lib/validation/auth";
import type { FormState } from "@/lib/validation/form-state";
import { messages } from "@/messages/da";

export type LoginState =
  | { status: "idle" }
  | { status: "error"; error: string };

// The first schema message wins; anything else reads as a generic failure so
// the form never discloses whether an email exists.
const issueMessage = (error: z.ZodError): string =>
  error.issues[0]?.message ?? messages.login.failed;

export async function logIn(
  _prevState: LoginState,
  values: LoginValues
): Promise<LoginState> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return { error: issueMessage(parsed.error), status: "error" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: messages.login.failed, status: "error" };
  }

  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type SetPasswordState = FormState<SetPasswordValues>;

// Invite (and later recovery) link → password (#1). verifyOtp consumes the
// single-use token_hash and starts the session; the password is then set on
// that session. Both happen here, in the action, because a Server Component
// render cannot write the session cookies.
export async function setPassword(
  _prevState: SetPasswordState,
  values: SetPasswordValues
): Promise<SetPasswordState> {
  const parsed = setPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return {
      error: messages.setPassword.errors.saveFailed,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      status: "error",
    };
  }

  const supabase = await createClient();
  const verified = await supabase.auth.verifyOtp({
    token_hash: parsed.data.tokenHash,
    type: parsed.data.type,
  });
  if (verified.error) {
    return { error: messages.setPassword.errors.linkInvalid, status: "error" };
  }

  const updated = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (updated.error) {
    return { error: messages.setPassword.errors.saveFailed, status: "error" };
  }

  redirect("/");
}
