// Refreshes the Supabase session cookies on every matched request, following
// the @supabase/ssr cookie contract (docs/agents/auth.md). proxy.ts is Next
// 16's renamed middleware. Cookie writes land on the response so Server
// Components can also write them when possible.
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
// The proxy is bundled for the edge runtime, where only NEXT_PUBLIC_* keys
// exist (statically inlined at build); the server schema in lib/env.ts would
// throw on the required server keys — deploy previews crashed on exactly
// that (no NEXT_PUBLIC_SITE_URL there). lib/env-client.ts validates the same
// keys the proxy needs and is built from member reads Turbopack can inline.
import { publicEnv } from "@/lib/env-client";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const publishableKey = publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (publishableKey) {
    const supabase = createServerClient(
      publicEnv.NEXT_PUBLIC_SUPABASE_URL,
      publishableKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value } of cookiesToSet) {
              request.cookies.set(name, value);
            }
            response = NextResponse.next({ request });
            for (const { name, value, options } of cookiesToSet) {
              response.cookies.set(name, value, options);
            }
          },
        },
      }
    );

    // Rotates/refreshes the session cookies when they are near expiry.
    await supabase.auth.getClaims();
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
