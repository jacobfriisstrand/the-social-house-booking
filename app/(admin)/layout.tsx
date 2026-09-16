// Route-group guard: app_role = 'admin' in the JWT (docs/agents/auth.md).
// Renders the app shell with the admin nav group (#55).
import { AppShell } from "@/components/shell/app-shell";
import { sidebarDefaultOpen } from "@/components/shell/sidebar-cookie";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listRoomOptions } from "@/lib/rooms/public-data";
import { getWifiSettings } from "@/lib/settings/data";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  const supabase = await createClient();
  const [wifi, rooms] = await Promise.all([
    getWifiSettings(supabase),
    listRoomOptions(supabase),
  ]);
  return (
    <AppShell
      defaultOpen={await sidebarDefaultOpen()}
      isAdmin
      rooms={rooms}
      wifi={wifi}
    >
      {children}
    </AppShell>
  );
}
