// Guard for app/(company)/*: layouts are not a security boundary, so every
// server action in the group calls this too (docs/agents/auth.md).
// React cache() makes the layout's guard and the page's guard share one
// session read per request instead of paying the round trip twice.

import { redirect } from "next/navigation";
import { cache } from "react";
import { getSession, type Session } from "./get-session";

export const requireSession = cache(async (): Promise<Session> => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
});
