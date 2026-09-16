// Route-group guard: every page and server action under (company) requires a
// session; layouts are not a security boundary, actions re-check
// (docs/agents/auth.md). The gated group renders the app shell (#55).
import { AppShell } from "@/components/shell/app-shell";
import { sidebarDefaultOpen } from "@/components/shell/sidebar-cookie";
import { requireCompletedCompany } from "@/lib/auth/require-company";
import { getWifiSettings } from "@/lib/settings/data";
import { createClient } from "@/lib/supabase/server";

export default async function GatedCompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireCompletedCompany();
  const wifi = await getWifiSettings(await createClient());
  return (
    <AppShell
      defaultOpen={await sidebarDefaultOpen()}
      isAdmin={session.appRole === "admin"}
      wifi={wifi}
    >
      {children}
    </AppShell>
  );
}
