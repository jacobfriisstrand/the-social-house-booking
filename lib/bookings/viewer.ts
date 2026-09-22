// Who is booking (#4): a company books for itself at its discount; an admin
// books on a company's behalf (ADR-0023) and picks the company in the
// dialog. Only companies with complete master data are offered, since the
// action refuses the others (#1).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Session } from "@/lib/auth/get-session";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export interface CompanyOption {
  companyId: string;
  discountPercent: number;
  displayName: string;
  membershipStatus: "external" | "member";
}

export type BookingViewer =
  | { companies: CompanyOption[]; kind: "admin" }
  | { discountPercent: number; kind: "company" };

async function listBookingCompanies(
  supabase: Client
): Promise<CompanyOption[]> {
  const { data } = await supabase
    .from("companies")
    .select(
      "company_id, company_display_name, company_membership_status, company_discount_percent"
    )
    .not("company_master_data_completed_at", "is", null)
    .order("company_display_name")
    // Bounded: the admin booking dialog's company picker is catalogue-sized.
    .limit(500);
  return (data ?? []).map((company) => ({
    companyId: company.company_id,
    discountPercent: company.company_discount_percent,
    displayName: company.company_display_name,
    membershipStatus: company.company_membership_status,
  }));
}

export async function getBookingViewer(
  supabase: Client,
  session: Session
): Promise<BookingViewer> {
  if (session.appRole === "admin") {
    return { companies: await listBookingCompanies(supabase), kind: "admin" };
  }
  const { data } = await supabase
    .from("companies")
    .select("company_discount_percent")
    .eq("company_auth_user_id", session.userId)
    .maybeSingle();
  return {
    discountPercent: data?.company_discount_percent ?? 0,
    kind: "company",
  };
}

// The discount a price row shows: null for an admin, who has no company.
export const viewerDiscount = (viewer: BookingViewer): number | null =>
  viewer.kind === "company" ? viewer.discountPercent : null;
