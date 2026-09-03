// Guard for app/(company)/*: layouts are not a security boundary, so every
// server action in the group calls this too (docs/agents/auth.md).
import { redirect } from "next/navigation";
import { getSession, type Session } from "./get-session";

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
