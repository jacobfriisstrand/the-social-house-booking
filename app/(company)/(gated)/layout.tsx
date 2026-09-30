// Route-group guard: every page and server action under (company) requires a
// session; layouts are not a security boundary, actions re-check
// (docs/agents/auth.md). The gated group renders the app shell (#55). The
// sidebar's count badge rides the layout, so Bookinger shows the number of
// upcoming bookings on every page (RLS keeps the count inside the company).
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppShell } from "@/components/shell/app-shell";
import { sidebarDefaultOpen } from "@/components/shell/sidebar-cookie";
import type { Session } from "@/lib/auth/get-session";
import {
  getOwnCompany,
  requireCompletedCompany,
} from "@/lib/auth/require-company";
import {
  countOutstandingInvoices,
  countUpcomingOwnBookings,
} from "@/lib/bookings/data";
import { getWifiSettings } from "@/lib/settings/data";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export default async function GatedCompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireCompletedCompany();
  const supabase = await createClient();
  const [wifi, badgeCounts] = await Promise.all([
    getWifiSettings(supabase),
    sidebarBadgeCounts(session, supabase),
  ]);
  return (
    <AppShell
      badgeCounts={badgeCounts}
      defaultOpen={await sidebarDefaultOpen()}
      isAdmin={session.appRole === "admin"}
      wifi={wifi}
    >
      {children}
    </AppShell>
  );
}

// Admin sessions pass the company gate without a company row; their badge
// counts the admin worklist, wired with the admin Bookinger page.
async function sidebarBadgeCounts(
  session: Session,
  supabase: SupabaseClient<Database>
): Promise<Record<string, number>> {
  if (session.appRole === "admin") {
    // Admin sessions pass the company gate without a company row; the
    // admin group still renders and counts the invoicing worklist.
    return {
      "/admin/bookings": await countOutstandingInvoices(supabase),
    };
  }
  const { company } = await getOwnCompany();
  return company
    ? {
        "/bookings": await countUpcomingOwnBookings(
          supabase,
          company.company_id
        ),
      }
    : {};
}
