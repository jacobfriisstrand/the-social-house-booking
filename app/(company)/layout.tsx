// Route-group guard: every page and server action under (company) requires a
// session; layouts are not a security boundary, actions re-check
// (docs/agents/auth.md).
import { requireSession } from "@/lib/auth/require-session";

export default async function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  return <>{children}</>;
}
