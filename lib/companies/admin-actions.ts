"use server";

// Admin company actions (#1): create + invite, re-invite, and edit including
// the login email. The companies row is always written under the admin's
// session and RLS; only the Auth admin API needs the service-role client
// (allowlist entry 5, docs/agents/supabase.md).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  adminValuesToUpdate,
  hasAllMasterData,
} from "@/lib/domain/company-master-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  type AdminCompanyValues,
  adminCompanySchema,
  type CreateCompanyValues,
  createCompanySchema,
  masterDataSchema,
} from "@/lib/validation/company";
import { type FormState, invalidFormState } from "@/lib/validation/form-state";
import { messages } from "@/messages/da";

export type CreateCompanyState = FormState<CreateCompanyValues>;
export type AdminCompanyState = FormState<AdminCompanyValues>;
export type ResendInvitationState = FormState<never>;

const { errors } = messages.companies;
const UNIQUE_VIOLATION = "23505";
const AUTH_EMAIL_EXISTS = "email_exists";

type Step<Ok> = { ok: true; value: Ok } | { error: string; ok: false };

// 1. Auth user, unconfirmed and without any mail; the invite sends Mail 1.
const createAuthUser = async (email: string): Promise<Step<string>> => {
  const created = await createAdminClient().auth.admin.createUser({
    email,
    email_confirm: false,
  });
  if (created.error) {
    const taken = created.error.code === AUTH_EMAIL_EXISTS;
    return {
      error: taken ? errors.emailTaken : errors.createFailed,
      ok: false,
    };
  }
  return { ok: true, value: created.data.user.id };
};

// 2. The companies row under the admin's session. On failure the auth user
// is removed again so the email is free for a retry.
const insertCompany = async (
  values: CreateCompanyValues,
  authUserId: string
): Promise<Step<string>> => {
  const supabase = await createClient();
  const inserted = await supabase
    .from("companies")
    .insert({
      company_auth_user_id: authUserId,
      company_discount_percent: values.discountPercent,
      company_display_name: values.displayName,
      company_email: values.email,
      company_legal_name: values.legalName,
      company_membership_status: values.membershipStatus,
    })
    .select("company_id")
    .single();
  if (inserted.error) {
    await createAdminClient().auth.admin.deleteUser(authUserId);
    const taken = inserted.error.code === UNIQUE_VIOLATION;
    return {
      error: taken ? errors.emailTaken : errors.createFailed,
      ok: false,
    };
  }
  return { ok: true, value: inserted.data.company_id };
};

// 3. The invite. On failure the company exists and admin re-sends from its
// page, which shows the failure.
const inviteQuery = async (email: string): Promise<string> => {
  const invited = await createAdminClient().auth.admin.inviteUserByEmail(email);
  return invited.error ? "?invite=failed" : "";
};

// Order matters (docs/handover): the auth user must exist before the row
// (FK), and the row before the invite, because the Send Email Hook looks the
// company up for the greeting and refuses otherwise.
export async function createCompany(
  _prevState: CreateCompanyState,
  values: CreateCompanyValues
): Promise<CreateCompanyState> {
  await requireAdmin();
  const parsed = createCompanySchema.safeParse(values);
  if (!parsed.success) {
    return invalidFormState(parsed.error, errors.createFailed);
  }
  const created = await createAuthUser(parsed.data.email);
  if (!created.ok) {
    return { error: created.error, status: "error" };
  }
  const inserted = await insertCompany(parsed.data, created.value);
  if (!inserted.ok) {
    return { error: inserted.error, status: "error" };
  }
  const query = await inviteQuery(parsed.data.email);
  redirect(`/admin/companies/${inserted.value}${query}`);
}

// Same call as the first invite; Auth issues a fresh single-use link. Fails
// once the company has set its password (then it is a password reset, #11).
export async function resendInvitation(
  companyId: string,
  _prevState: ResendInvitationState
): Promise<ResendInvitationState> {
  await requireAdmin();
  const id = z.guid().safeParse(companyId);
  if (!id.success) {
    return { error: errors.notFound, status: "error" };
  }
  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("company_email")
    .eq("company_id", id.data)
    .maybeSingle();
  if (!company) {
    return { error: errors.notFound, status: "error" };
  }
  const invited = await createAdminClient().auth.admin.inviteUserByEmail(
    company.company_email
  );
  if (invited.error) {
    return { error: errors.resendFailed, status: "error" };
  }
  return { status: "success" };
}

interface CurrentCompany {
  company_auth_user_id: string;
  company_email: string;
  company_master_data_completed_at: string | null;
}

type CompletionCheck =
  | { completedAt: string | null; ok: true }
  | { ok: false; state: AdminCompanyState };

// Once complete, the nine mandatory fields never go blank again. Admin
// filling in the last field completes the company too; Mail 10 is the
// company's own completion advisory, so it is not sent from here.
const completionCheck = (
  values: AdminCompanyValues,
  current: CurrentCompany
): CompletionCheck => {
  const completedAt = current.company_master_data_completed_at;
  if (!completedAt) {
    return {
      completedAt: hasAllMasterData(values) ? new Date().toISOString() : null,
      ok: true,
    };
  }
  const strict = masterDataSchema.safeParse(values);
  if (!strict.success) {
    return {
      ok: false,
      state: invalidFormState(strict.error, errors.saveFailed),
    };
  }
  return { completedAt, ok: true };
};

// The login email lives in two places: the row (unique, under RLS) and the
// auth user. The row goes first so a duplicate is caught by the constraint;
// if Auth then refuses, the row is put back. Returns the error to show.
const changeLoginEmail = async (
  values: AdminCompanyValues,
  current: CurrentCompany
): Promise<string | null> => {
  const changed = await createAdminClient().auth.admin.updateUserById(
    current.company_auth_user_id,
    { email: values.email, email_confirm: true }
  );
  if (!changed.error) {
    return null;
  }
  const supabase = await createClient();
  await supabase
    .from("companies")
    .update({ company_email: current.company_email })
    .eq("company_id", values.companyId);
  return errors.emailChangeFailed;
};

const persistCompany = async (
  values: AdminCompanyValues,
  current: CurrentCompany,
  completedAt: string | null
): Promise<string | null> => {
  const supabase = await createClient();
  const updated = await supabase
    .from("companies")
    .update({
      ...adminValuesToUpdate(values),
      company_master_data_completed_at: completedAt,
    })
    .eq("company_id", values.companyId);
  if (updated.error) {
    const taken = updated.error.code === UNIQUE_VIOLATION;
    return taken ? errors.emailTaken : errors.saveFailed;
  }
  if (values.email === current.company_email) {
    return null;
  }
  return changeLoginEmail(values, current);
};

type Prepared =
  | { completedAt: string | null; current: CurrentCompany; ok: true }
  | { ok: false; state: AdminCompanyState };

const prepareUpdate = async (values: AdminCompanyValues): Promise<Prepared> => {
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("companies")
    .select(
      "company_auth_user_id, company_email, company_master_data_completed_at"
    )
    .eq("company_id", values.companyId)
    .maybeSingle();
  if (!current) {
    return { ok: false, state: { error: errors.notFound, status: "error" } };
  }
  const check = completionCheck(values, current);
  return check.ok
    ? { completedAt: check.completedAt, current, ok: true }
    : check;
};

export async function updateCompany(
  _prevState: AdminCompanyState,
  values: AdminCompanyValues
): Promise<AdminCompanyState> {
  await requireAdmin();
  const parsed = adminCompanySchema.safeParse(values);
  if (!parsed.success) {
    return invalidFormState(parsed.error, errors.saveFailed);
  }
  const prepared = await prepareUpdate(parsed.data);
  if (!prepared.ok) {
    return prepared.state;
  }
  const failure = await persistCompany(
    parsed.data,
    prepared.current,
    prepared.completedAt
  );
  if (failure) {
    return { error: failure, status: "error" };
  }
  revalidatePath("/admin/companies");
  revalidatePath(`/admin/companies/${parsed.data.companyId}`);
  return { status: "success" };
}
