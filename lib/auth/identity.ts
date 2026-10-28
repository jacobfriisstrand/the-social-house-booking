// Who the shell header's chip shows (DESIGN.md, "Shell"): the signed-in
// account's display name and login email — the company's shared account
// (visningsnavn + company email) or the admin registry row. The auth
// user's email is the company's contact email (docs/agents/auth.md), so
// the email is always the identity one logged in with. A missing row (an
// admin who has not been registered yet, a company row behind its gate)
// falls back to the login email rather than rendering an empty chip.
import { cache } from "react";
import type { CompanyRow } from "@/lib/domain/company-master-data";
import { createClient } from "@/lib/supabase/server";
import { getOwnCompany } from "./require-company";

export interface SignedInIdentity {
  displayName: string;
  email: string;
}

interface SignedInIdentityInput {
  adminDisplayName?: string | null;
  company?: Pick<CompanyRow, "company_display_name" | "company_email"> | null;
  isAdmin: boolean;
  sessionEmail: string;
}

// Pure so the branches are testable without Supabase
// (docs/agents/testing.md).
export function pickSignedInIdentity({
  adminDisplayName,
  company,
  isAdmin,
  sessionEmail,
}: SignedInIdentityInput): SignedInIdentity {
  if (isAdmin) {
    return {
      displayName: adminDisplayName ?? sessionEmail,
      email: sessionEmail,
    };
  }
  return {
    displayName: company?.company_display_name ?? sessionEmail,
    email: company?.company_email ?? sessionEmail,
  };
}

// One identity read per request: the page header asks on every page, and
// getOwnCompany's cache() collapses the read with the layout's guard, so
// company pages pay no extra round trip; admin pages add one indexed
// lookup of the admins registry.
export const getSignedInIdentity = cache(
  async (): Promise<SignedInIdentity> => {
    const { company, session } = await getOwnCompany();
    if (session.appRole !== "admin") {
      return pickSignedInIdentity({
        company,
        isAdmin: false,
        sessionEmail: session.email,
      });
    }

    // Admins have no company row; their display name lives in the admins
    // registry, which the admin session itself may read
    // (policies/admins.sql).
    const supabase = await createClient();
    const { data: admin, error } = await supabase
      .from("admins")
      .select("admin_display_name")
      .eq("admin_auth_user_id", session.userId)
      .maybeSingle();
    if (error) {
      throw new Error(
        `could not read the admin display name: ${error.message}`
      );
    }
    return pickSignedInIdentity({
      adminDisplayName: admin?.admin_display_name,
      isAdmin: true,
      sessionEmail: session.email,
    });
  }
);
