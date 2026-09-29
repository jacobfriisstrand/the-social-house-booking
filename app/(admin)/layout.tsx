// Route-group guard: app_role = 'admin' in the JWT (docs/agents/auth.md).
// Renders the app shell with the admin nav group (#55). The sidebar's
// count badge rides the layout: Bookinger shows the number of ended
// bookings still waiting for an invoice, on every admin page.
import { AppShell } from "@/components/shell/app-shell";
import { sidebarDefaultOpen } from "@/components/shell/sidebar-cookie";
import { requireAdmin } from "@/lib/auth/require-admin";
import { countOutstandingInvoices } from "@/lib/bookings/data";
import { getWifiSettings } from "@/lib/settings/data";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  const supabase = await createClient();
  const [wifi, outstandingInvoices] = await Promise.all([
    getWifiSettings(supabase),
    countOutstandingInvoices(supabase),
  ]);
  return (
    <AppShell
      badgeCounts={{ "/admin/bookings": outstandingInvoices }}
      defaultOpen={await sidebarDefaultOpen()}
      isAdmin
      wifi={wifi}
    >
      {children}
    </AppShell>
  );
}
