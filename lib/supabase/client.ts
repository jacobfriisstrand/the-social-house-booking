// Browser client — publishable key, RLS enforced. Client components only when
// unavoidable (realtime, optimistic UI); prefer the server client
// (docs/agents/supabase.md).
"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env-client";
import type { Database } from "./database.types";

export function createClient() {
  const publishableKey = publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set");
  }

  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey
  );
}
