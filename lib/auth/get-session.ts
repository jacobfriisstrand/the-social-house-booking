// Reads the verified JWT claims of the current session via the server client
// (docs/agents/auth.md). appRole comes from the custom access token hook's
// app_role claim, written only by seed.sql and scripts/create-admin.ts.
import { createClient } from "@/lib/supabase/server";

export interface Session {
  appRole?: string;
  email: string;
  userId: string;
}

// app_role is an untyped JSON claim, so it is narrowed explicitly.
const appRoleOf = (claims: Record<string, unknown>): string | undefined =>
  typeof claims.app_role === "string" ? claims.app_role : undefined;

export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) {
    return null;
  }

  return {
    appRole: appRoleOf(claims),
    email: claims.email ?? "",
    userId: claims.sub,
  };
}
