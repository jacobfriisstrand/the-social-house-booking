"use server";

import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  type ForgotPasswordValues,
  forgotPasswordSchema,
} from "@/lib/validation/auth";
import { type FormState, invalidFormState } from "@/lib/validation/form-state";
import { messages } from "@/messages/da";

export type ForgotPasswordState = FormState<ForgotPasswordValues>;
export type CompanyPasswordResetState = FormState<never>;

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  values: ForgotPasswordValues
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return invalidFormState(
      parsed.error,
      messages.forgotPassword.genericSuccess
    );
  }
  const supabase = await createClient();
  // Auth performs the existence check and only sends to the matching Auth
  // email. Keeping the lookup inside Auth preserves the same response for
  // known and unknown addresses without requiring a privileged database read.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/set-password`,
  });
  return { status: "success" };
}

export async function requestCompanyPasswordReset(
  _prevState: CompanyPasswordResetState,
  _formData: FormData
): Promise<CompanyPasswordResetState> {
  const { company } = await (async () => {
    const client = await createClient();
    const { data: session } = await client.auth.getUser();
    if (!session.user) {
      return { company: null };
    }
    const { data } = await client
      .from("companies")
      .select("company_email")
      .eq("company_auth_user_id", session.user.id)
      .maybeSingle();
    return { company: data };
  })();
  if (!company) {
    return {
      error: messages.companySettings.errors.requestFailed,
      status: "error",
    };
  }
  const client = await createClient();
  const reset = await client.auth.resetPasswordForEmail(company.company_email, {
    redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/set-password`,
  });
  return reset.error
    ? { error: messages.companySettings.errors.requestFailed, status: "error" }
    : { status: "success" };
}

export async function finishPasswordReset(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}
