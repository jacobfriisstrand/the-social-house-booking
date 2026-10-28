"use server";

// Email + password login (issue #25 as revised: email is the only login
// credential). @supabase/ssr sets the session cookies; the schema is parsed
// again on the server (docs/agents/ui.md). The generic error message covers
// every failure so the form never discloses whether an email exists.
import { redirect } from "next/navigation";
import type { z } from "zod";
import { safeNextPath } from "@/lib/auth/next-path";
import { requestCompanyChange } from "@/lib/companies/change-actions";
import { createClient } from "@/lib/supabase/server";
import {
  type AcceptInvitationValues,
  acceptInvitationSchema,
  type ChangePasswordValues,
  changePasswordSchema,
  type LoginValues,
  loginSchema,
  type SetPasswordValues,
  setPasswordSchema,
} from "@/lib/validation/auth";
import type { FormState } from "@/lib/validation/form-state";
import { idleFormState, invalidFormState } from "@/lib/validation/form-state";
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

  const { email, next, password } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: messages.login.failed, status: "error" };
  }

  redirect(safeNextPath(next) ?? "/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type SetPasswordState = FormState<SetPasswordValues>;

// Runs on the verified session; Auth rejects reusing the current password
// (422 same_password), which gets its own message instead of a generic one.
// After the password is set the session is dropped and the user lands on the
// login page, whose notice says which password to use now.
const updatePassword = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  password: string
): Promise<SetPasswordState> => {
  const updated = await supabase.auth.updateUser({ password });
  if (updated.error) {
    return {
      error:
        updated.error.code === "same_password"
          ? messages.setPassword.errors.samePassword
          : messages.setPassword.errors.saveFailed,
      status: "error",
    };
  }

  await supabase.auth.signOut({ scope: "global" });
  redirect("/login?password-changed=1");
};

// Recovery link → password (#11). verifyOtp or the PKCE code exchange
// consumes the single-use link value and starts the session; the password is
// then set on that session. Both happen here, in the action, because a
// Server Component render cannot write the session cookies. The invite case
// is acceptInvitation below: onboarding never routes through the login page.
export async function setPassword(
  _prevState: SetPasswordState,
  values: SetPasswordValues
): Promise<SetPasswordState> {
  const parsed = setPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return invalidFormState(
      parsed.error,
      messages.setPassword.errors.saveFailed
    );
  }

  const supabase = await createClient();
  const verified = parsed.data.code
    ? await supabase.auth.exchangeCodeForSession(parsed.data.code)
    : await supabase.auth.verifyOtp({
        token_hash: parsed.data.tokenHash ?? "",
        type: parsed.data.type,
      });
  if (verified.error) {
    // The link value is single-use: a failed password save burns it. The
    // session the first verification started is still alive in the cookies
    // (a failed exchange removes only the verifier), so a retry continues on
    // that session instead of blaming the link.
    const { data: current } = await supabase.auth.getUser();
    if (current.user) {
      return updatePassword(supabase, parsed.data.password);
    }
    return {
      error: messages.setPassword.errors.recoveryLinkInvalid,
      linkInvalid: true,
      status: "error",
    };
  }

  return updatePassword(supabase, parsed.data.password);
}

export type AcceptInvitationState = FormState<AcceptInvitationValues>;

// The invitation link (#1): one submit sets the shared password and fills the
// company's master data, and the company lands logged in — no login bounce,
// no password-created notice. verifyOtp consumes the single-use token_hash
// and starts the session here, in the action, because a Server Component
// render cannot write the session cookies.
export async function acceptInvitation(
  _prevState: AcceptInvitationState,
  values: AcceptInvitationValues
): Promise<AcceptInvitationState> {
  const parsed = acceptInvitationSchema.safeParse(values);
  if (!parsed.success) {
    return invalidFormState(
      parsed.error,
      messages.setPassword.errors.saveFailed
    );
  }

  const supabase = await createClient();
  const verified = await supabase.auth.verifyOtp({
    token_hash: parsed.data.tokenHash,
    type: parsed.data.tokenType,
  });
  if (verified.error) {
    // The token is single-use: a partial failure (the password saved, the
    // data step did not) leaves a burnt link on the session the first submit
    // started, so a retry continues on that session instead of blaming the
    // link. Without a live session the link is dead and needs a new invite.
    const { data: current } = await supabase.auth.getUser();
    if (!current.user) {
      return {
        error: messages.setPassword.errors.linkInvalid,
        linkInvalid: true,
        status: "error",
      };
    }
  }

  const updated = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  // Auth rejects reusing the current password (422 same_password); on an
  // invitation that means an earlier submit of this form already set it, and
  // only the data step below remains.
  if (updated.error && updated.error.code !== "same_password") {
    return {
      error: messages.setPassword.errors.saveFailed,
      status: "error",
    };
  }

  const { data: current } = await supabase.auth.getUser();
  if (!current.user) {
    return {
      error: messages.setPassword.errors.linkInvalid,
      linkInvalid: true,
      status: "error",
    };
  }
  const { data: company } = await supabase
    .from("companies")
    .select("company_email, company_master_data_completed_at")
    .eq("company_auth_user_id", current.user.id)
    .maybeSingle();
  if (!company) {
    // The invite hook refuses to send when no company row matches the
    // address, so a missing row means the invitation is dead.
    return {
      error: messages.companies.errors.notFound,
      status: "error",
    };
  }
  // The link verified the invited address, so the save commits at once: the
  // first-fill branch of requestCompanyChange. The form carries no email —
  // the invited address is the login — so the row's address completes the
  // member values and no new-email verification can get in the way. The
  // password and link fields are not member values and stop here. A row
  // that is already complete skips the step: an earlier submit committed it
  // and only the password had anything left to do. One redirect closes
  // every path, so it stays the last statement.
  if (!company.company_master_data_completed_at) {
    const {
      password: _password,
      passwordConfirm: _passwordConfirm,
      tokenHash: _tokenHash,
      tokenType: _tokenType,
      ...data
    } = parsed.data;
    const saved = await requestCompanyChange(idleFormState, {
      ...data,
      email: company.company_email,
    });
    if (saved.status === "error") {
      return saved;
    }
  }
  redirect("/?signed-up=1");
}

export type ChangePasswordState = FormState<ChangePasswordValues>;

// #125: a signed-in user changes their own password on the active session —
// Supabase's default authorization (the session already proves the
// identity), so no current-password re-entry. updateUser keeps the session
// valid, so there is no re-login after the change. Unlike the recovery
// flow's updatePassword above, this one neither signs out nor redirects.
export async function changePassword(
  _prevState: ChangePasswordState,
  values: ChangePasswordValues
): Promise<ChangePasswordState> {
  const parsed = changePasswordSchema.safeParse(values);
  if (!parsed.success) {
    return invalidFormState(
      parsed.error,
      messages.setPassword.errors.saveFailed
    );
  }

  const supabase = await createClient();
  const updated = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (updated.error) {
    return {
      error:
        updated.error.code === "same_password"
          ? messages.setPassword.errors.samePassword
          : messages.setPassword.errors.saveFailed,
      status: "error",
    };
  }
  return { status: "success" };
}
