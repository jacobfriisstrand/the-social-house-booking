"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createChangeToken, hashChangeToken } from "@/lib/domain/change-token";
import {
  type CompanyChangeValues,
  companyToMemberValues,
} from "@/lib/domain/company-master-data";
import { sendMail } from "@/lib/email/send-mail";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  companyChangeBeforeSchema,
  type MemberCompanyValues,
  memberCompanySchema,
} from "@/lib/validation/company";
import { type FormState, invalidFormState } from "@/lib/validation/form-state";
import { messages } from "@/messages/da";

const TOKEN_MINUTES = 30;
const TOKEN_MS = TOKEN_MINUTES * 60 * 1000;
const requestIdSchema = z.guid();

export type CompanyChangeState = FormState<MemberCompanyValues>;

const actionUrl = (requestId: string, rawToken: string): string =>
  `${env.NEXT_PUBLIC_SITE_URL}/company-change/${requestId}?token=${encodeURIComponent(rawToken)}`;

const jsonValues = (values: CompanyChangeValues): Record<string, string> =>
  values;

export async function requestCompanyChange(
  _prevState: CompanyChangeState,
  values: MemberCompanyValues
): Promise<CompanyChangeState> {
  const { company } = await (async () => {
    const supabase = await createClient();
    const { data: session } = await supabase.auth.getUser();
    if (!session.user) {
      return { company: null };
    }
    const { data: ownCompany } = await supabase
      .from("companies")
      .select("*")
      .eq("company_auth_user_id", session.user.id)
      .maybeSingle();
    return { company: ownCompany };
  })();
  if (!company) {
    return {
      error: messages.companySettings.errors.requestFailed,
      status: "error",
    };
  }

  const parsed = memberCompanySchema.safeParse(values);
  if (!parsed.success) {
    return invalidFormState(
      parsed.error,
      messages.companySettings.errors.requestFailed
    );
  }

  const token = createChangeToken();
  const inserted = await createAdminClient().rpc(
    "create_company_change_request",
    {
      p_after_values: jsonValues(parsed.data),
      p_before_values: jsonValues(companyToMemberValues(company)),
      p_company_id: company.company_id,
      p_current_email: company.company_email,
      p_proposed_email: parsed.data.email,
    }
  );
  if (inserted.error) {
    return {
      error: messages.companySettings.errors.requestFailed,
      status: "error",
    };
  }

  const tokenRow = await createAdminClient()
    .from("company_change_tokens")
    .insert({
      company_change_token_expires_at: new Date(
        Date.now() + TOKEN_MS
      ).toISOString(),
      company_change_token_hash: token.hash,
      company_change_token_kind: "current_email",
      company_change_token_request_id: inserted.data,
    });
  if (tokenRow.error) {
    return {
      error: messages.companySettings.errors.requestFailed,
      status: "error",
    };
  }

  try {
    await sendMail({
      companyId: company.company_id,
      kind: "company-change-review",
      to: company.company_email,
      variables: {
        ACTION_URL: actionUrl(inserted.data, token.raw),
        COMPANY_DISPLAY_NAME: company.company_display_name,
        VALID_MINUTES: TOKEN_MINUTES,
      },
    });
  } catch {
    await createAdminClient()
      .from("company_change_requests")
      .update({ company_change_request_status: "rejected" })
      .eq("company_change_request_id", inserted.data);
    return {
      error: messages.companySettings.errors.requestFailed,
      status: "error",
    };
  }

  return { status: "success" };
}

export interface CompanyChangeReview {
  after: MemberCompanyValues;
  before: MemberCompanyValues;
  requestId: string;
  status: "pending" | "awaiting_new_email";
}

export async function getCompanyChangeReview(
  requestId: string,
  rawToken: string
): Promise<CompanyChangeReview | null> {
  const parsedId = requestIdSchema.safeParse(requestId);
  if (!(parsedId.success && rawToken)) {
    return null;
  }
  const request = await createAdminClient()
    .from("company_change_requests")
    .select(
      "company_change_request_id, company_change_request_before_values, company_change_request_after_values, company_change_request_status"
    )
    .eq("company_change_request_id", parsedId.data)
    .maybeSingle();
  if (
    request.error ||
    !request.data ||
    !["pending", "awaiting_new_email"].includes(
      request.data.company_change_request_status
    )
  ) {
    return null;
  }
  const token = await createAdminClient()
    .from("company_change_tokens")
    .select("company_change_token_expires_at")
    .eq("company_change_token_request_id", parsedId.data)
    .eq("company_change_token_kind", "current_email")
    .eq("company_change_token_hash", hashChangeToken(rawToken))
    .is("company_change_token_consumed_at", null)
    .maybeSingle();
  if (
    token.error ||
    !token.data ||
    new Date(token.data.company_change_token_expires_at) <= new Date()
  ) {
    return null;
  }

  const before = companyChangeBeforeSchema.safeParse(
    request.data.company_change_request_before_values
  );
  const after = memberCompanySchema.safeParse(
    request.data.company_change_request_after_values
  );
  return before.success && after.success
    ? {
        after: after.data,
        before: before.data,
        requestId: parsedId.data,
        status: request.data.company_change_request_status as
          | "pending"
          | "awaiting_new_email",
      }
    : null;
}

export async function isNewEmailChangeToken(
  requestId: string,
  rawToken: string
): Promise<boolean> {
  const parsedId = requestIdSchema.safeParse(requestId);
  if (!(parsedId.success && rawToken)) {
    return false;
  }
  const token = await createAdminClient()
    .from("company_change_tokens")
    .select("company_change_token_expires_at")
    .eq("company_change_token_request_id", parsedId.data)
    .eq("company_change_token_kind", "new_email")
    .eq("company_change_token_hash", hashChangeToken(rawToken))
    .is("company_change_token_consumed_at", null)
    .maybeSingle();
  return Boolean(
    token.data &&
      new Date(token.data.company_change_token_expires_at) > new Date()
  );
}

export async function approveCompanyChange(
  requestId: string,
  rawToken: string
): Promise<{ email?: string; error?: string; success: boolean }> {
  const parsedId = requestIdSchema.safeParse(requestId);
  if (!(parsedId.success && rawToken)) {
    return {
      error: messages.companyChangeReview.errors.invalid,
      success: false,
    };
  }
  const admin = createAdminClient();
  const result = await admin.rpc("apply_company_change_request", {
    p_request_id: parsedId.data,
    p_token_hash: hashChangeToken(rawToken),
  });
  if (result.error) {
    return {
      error: messages.companyChangeReview.errors.failed,
      success: false,
    };
  }
  const response = result.data as {
    company_id: string;
    current_email: string;
    error?: string;
    next_step: "awaiting_new_email" | "committed";
    proposed_email: string;
  };
  if (response.error) {
    return {
      error: messages.companyChangeReview.errors.invalid,
      success: false,
    };
  }
  if (response.next_step === "committed") {
    return { success: true };
  }

  const request = await admin
    .from("company_change_requests")
    .select("company_change_request_id, company_change_request_company_id")
    .eq("company_change_request_id", parsedId.data)
    .single();
  if (request.error) {
    return {
      error: messages.companyChangeReview.errors.failed,
      success: false,
    };
  }
  const token = createChangeToken();
  const created = await admin.from("company_change_tokens").insert({
    company_change_token_expires_at: new Date(
      Date.now() + TOKEN_MS
    ).toISOString(),
    company_change_token_hash: token.hash,
    company_change_token_kind: "new_email",
    company_change_token_request_id: parsedId.data,
  });
  if (created.error) {
    return {
      error: messages.companyChangeReview.errors.failed,
      success: false,
    };
  }
  const company = await admin
    .from("companies")
    .select("company_display_name")
    .eq("company_id", request.data.company_change_request_company_id)
    .single();
  if (company.error) {
    return {
      error: messages.companyChangeReview.errors.failed,
      success: false,
    };
  }
  try {
    await sendMail({
      companyId: request.data.company_change_request_company_id,
      kind: "company-change-new-email",
      to: response.proposed_email,
      variables: {
        ACTION_URL: actionUrl(parsedId.data, token.raw),
        COMPANY_DISPLAY_NAME: company.data.company_display_name,
        VALID_MINUTES: TOKEN_MINUTES,
      },
    });
  } catch {
    await admin
      .from("company_change_requests")
      .update({ company_change_request_status: "rejected" })
      .eq("company_change_request_id", parsedId.data);
    return {
      error: messages.companyChangeReview.errors.failed,
      success: false,
    };
  }
  return {
    email: response.proposed_email,
    success: true,
  };
}

export async function verifyNewCompanyEmail(
  requestId: string,
  rawToken: string
): Promise<{ error?: string; success: boolean }> {
  const parsedId = requestIdSchema.safeParse(requestId);
  if (!(parsedId.success && rawToken)) {
    return {
      error: messages.companyChangeReview.errors.invalid,
      success: false,
    };
  }
  const admin = createAdminClient();
  const request = await admin
    .from("company_change_requests")
    .select(
      "company_change_request_company_id, company_change_request_current_email, company_change_request_proposed_email, company_change_request_before_values"
    )
    .eq("company_change_request_id", parsedId.data)
    .eq("company_change_request_status", "awaiting_new_email")
    .single();
  if (request.error) {
    return {
      error: messages.companyChangeReview.errors.invalid,
      success: false,
    };
  }
  const company = await admin
    .from("companies")
    .select("company_auth_user_id")
    .eq("company_id", request.data.company_change_request_company_id)
    .single();
  if (company.error) {
    return {
      error: messages.companyChangeReview.errors.failed,
      success: false,
    };
  }
  const authUpdate = await admin.auth.admin.updateUserById(
    company.data.company_auth_user_id,
    {
      email: request.data.company_change_request_proposed_email,
      email_confirm: true,
    }
  );
  if (authUpdate.error) {
    return {
      error: messages.companyChangeReview.errors.failed,
      success: false,
    };
  }
  const committed = await admin.rpc("commit_company_email_change", {
    p_request_id: parsedId.data,
    p_token_hash: hashChangeToken(rawToken),
  });
  if (committed.error) {
    await admin.auth.admin.updateUserById(company.data.company_auth_user_id, {
      email: request.data.company_change_request_current_email,
      email_confirm: true,
    });
    return {
      error: messages.companyChangeReview.errors.failed,
      success: false,
    };
  }
  await admin.rpc("revoke_company_sessions", {
    p_auth_user_id: company.data.company_auth_user_id,
  });
  await sendCompletionNotices(
    request.data.company_change_request_company_id,
    request.data.company_change_request_current_email,
    request.data.company_change_request_proposed_email
  );
  redirect(
    `/login?email-changed=${encodeURIComponent(
      request.data.company_change_request_proposed_email
    )}`
  );
}

const sendCompletionNotices = async (
  companyId: string,
  oldEmail: string,
  newEmail: string
): Promise<void> => {
  const company = await createAdminClient()
    .from("companies")
    .select("company_display_name")
    .eq("company_id", companyId)
    .single();
  if (company.error) {
    return;
  }
  try {
    await Promise.all(
      [oldEmail, newEmail].map((to) =>
        sendMail({
          companyId,
          kind: "company-change-completed",
          to,
          variables: {
            COMPANY_DISPLAY_NAME: company.data.company_display_name,
            NEW_EMAIL: newEmail,
          },
        })
      )
    );
  } catch {
    // Best-effort: a rejected send is already logged as failed in
    // outbound_emails, and the commit itself must not fail on a notice.
  }
};
