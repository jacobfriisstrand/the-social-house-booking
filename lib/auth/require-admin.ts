// Guard for app/(admin)/*: a session is not enough, the JWT must carry
// app_role = 'admin' (docs/agents/auth.md). Non-admins land in the company
// area instead of an error page.
import { redirect } from "next/navigation";
import { requireSession } from "./require-session";

export async function requireAdmin() {
  const session = await requireSession();
  if (session.appRole !== "admin") {
    redirect("/bookings");
  }
  return session;
}
