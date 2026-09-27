// Company guards (#1). requireOwnCompany() loads the caller's companies row
// for the master-data page and action. requireCompletedCompany() is the
// booking gate: company_master_data_completed_at must be set before any
// (company) page other than /company renders, and before a booking is
// created (#2/#4 call it inside their actions). Admins have no company row
// and pass through.

import { redirect } from "next/navigation";
import { cache } from "react";
import type { CompanyRow } from "@/lib/domain/company-master-data";
import { createClient } from "@/lib/supabase/server";
import type { Session } from "./get-session";
import { requireSession } from "./require-session";

// One companies read per request: the gated layout (requireCompletedCompany)
// and the page (requireOwnCompany) both guard, and React cache() collapses
// the duplicate session + companies round trips into one.
const loadOwnCompany = cache(
  async (): Promise<{ company: CompanyRow | null; session: Session }> => {
    const session = await requireSession();
    if (session.appRole === "admin") {
      return { company: null, session };
    }
    const supabase = await createClient();
    const { data: company } = await supabase
      .from("companies")
      .select("*")
      .eq("company_auth_user_id", session.userId)
      .maybeSingle();
    return { company: company ?? null, session };
  }
);

export async function requireOwnCompany(): Promise<{
  company: CompanyRow;
  session: Session;
}> {
  const { company, session } = await loadOwnCompany();
  if (!company) {
    // Admins have no company row and no member pages; a session without a
    // company row has nothing to show either — RLS hides everything anyway.
    redirect(session.appRole === "admin" ? "/admin" : "/login");
  }
  return { company, session };
}

export async function requireCompletedCompany(): Promise<Session> {
  const { company, session } = await loadOwnCompany();
  if (session.appRole === "admin") {
    return session;
  }
  if (!company?.company_master_data_completed_at) {
    redirect("/company");
  }
  return session;
}
