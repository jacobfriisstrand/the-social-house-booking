// Route-group guard: app_role = 'admin' in the JWT (docs/agents/auth.md).
// Renders the app shell with the admin nav group (#55).
import { AppShell } from "@/components/shell/app-shell";
import { sidebarDefaultOpen } from "@/components/shell/sidebar-cookie";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <AppShell defaultOpen={await sidebarDefaultOpen()} isAdmin>
      {children}
    </AppShell>
  );
}
