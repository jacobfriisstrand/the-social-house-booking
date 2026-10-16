// Read-side for the admin Virksomheder list (#123): every company in
// display-name order — the exact read the companies page renders and the
// CSV export downloads, so the two cannot drift apart.
import type { SupabaseClient } from "@supabase/supabase-js";
import { rowsOrThrow } from "@/lib/bookings/rows";
import type { CompanyRow } from "@/lib/domain/company-master-data";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export async function listAdminCompanies(
  supabase: Client
): Promise<CompanyRow[]> {
  return rowsOrThrow(
    await supabase
      .from("companies")
      .select("*")
      .order("company_display_name")
      // ponytail: hard cap at 500 rows — the list is catalogue-sized; paginate in a follow-up if a tenant ever approaches the cap.
      .limit(500),
    "companies"
  );
}
