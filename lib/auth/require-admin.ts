// Guard for app/(admin)/*: a session is not enough, the JWT must carry
// app_role = 'admin' (docs/agents/auth.md). Non-admins land in the company
// area instead of an error page.
import { redirect } from "next/navigation";
import { getSession } from "./get-session";
import { requireSession } from "./require-session";

export async function requireAdmin() {
  const session = await requireSession();
  if (session.appRole !== "admin") {
    redirect("/?unauthorized=1");
  }
  return session;
}

// The API variant for route handlers (#123): a download link fetched
// outside an admin session gets HTTP statuses, not a redirect to a page —
// 401 without a session, 403 with a session but without the role. Null
// means proceed.
import { messages } from "@/messages/da";

export async function requireAdminApi(): Promise<Response | null> {
  const session = await getSession();
  if (!session) {
    return new Response(messages.common.loginRequired, { status: 401 });
  }
  if (session.appRole !== "admin") {
    return new Response(messages.common.adminOnly, { status: 403 });
  }
  return null;
}
