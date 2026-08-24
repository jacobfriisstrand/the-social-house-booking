# Auth

Supabase Auth, adapted to the domain: one shared account per company, admins on the same login, bookers verified per booking without an account.

Read `docs/vendor/supabase/auth-custom-access-token-hook.md` and `auth-send-email-hook.md` before changing anything here.

## Accounts

| Who | Auth user? | How they get in |
|---|---|---|
| Company (member or external) | Yes — one `auth.users` row per company | Username + password on `/login` |
| Admin | Yes — rows in `admins`, JWT claim `app_role = 'admin'` | Same `/login` form |
| Booker | **No** | Six-digit verification code sent to their work email on every booking (ADR-0004) |

No public self-registration (ADR-0008): `enable_signup = false` in `supabase/config.toml`. Companies are created by admin, which sends the "invitation to the company's creation" email; the company sets its password from that invite.

## Username login

Supabase Auth has no username concept. Mapping:

- The auth user's email **is** the company's real contact email (`companies.company_email`), so password reset works unchanged.
- `companies.company_username` is unique and is what the login form asks for.
- The login server action resolves username → email with the service-role client (allowlisted, see `supabase.md`), then calls `signInWithPassword({ email, password })` with the normal server client. On a miss, return the same generic error as a wrong password.
- Admins have a username too (`admins.admin_username`); the same lookup checks both tables.

Never expose the resolved email to the client and never accept an email in the login form.

## Roles in the JWT

The Custom Access Token Hook is a Postgres function `public.custom_access_token_hook(event jsonb) returns jsonb` that copies `app_role` from `auth.users.raw_app_meta_data` into the claims. It is declared in `supabase/schemas/functions/custom_access_token_hook.sql` with the grants the vendor doc requires (`grant execute … to supabase_auth_admin; revoke … from authenticated, anon, public`).

- `app_role` is `'admin'` or absent. It is written only by `supabase/seed.sql` (local) or `scripts/create-admin.ts` (cloud, uses `auth.admin.createUser` with `app_metadata: { app_role: 'admin' }`). No UI writes it in v1.0.
- Server code checks the role with `lib/auth/getSession()` → `session.appRole`. Do not decode the JWT by hand in components.
- RLS policies read `(auth.jwt() ->> 'app_role') = 'admin'`.

## Route protection

- `app/(company)/*`: requires a session. `app/(admin)/*`: requires `app_role = 'admin'`. Both enforced in the route-group layout via `lib/auth/requireSession()` / `requireAdmin()`, and again inside every server action (layouts are not a security boundary).
- `app/(public)/*`: notice board, booker verification pages, cancellation link pages. No session.
- Use `@supabase/ssr` cookie handling exactly as in `docs/vendor/supabase/`; refresh the session in `proxy.ts` (Next 16's name for the former middleware — check `node_modules/next/dist/docs/`).

## Booker verification and holds

- Booking form → server action creates a `pending_verification` booking with `booking_hold_expires_at = now() + 10 minutes` and sends the code via `sendMail()` (template `verification-code`).
- The code is a six-digit string, single-use, stored in `verification_codes` (see #2: `verification_code_booking_id`, `verification_code_expires_at`, `verification_code_attempts`, `verification_code_consumed_at`). Max 5 attempts, then the hold is released.
- Entering the code confirms the booking: status → `confirmed`, price snapshot frozen (ADR-0005), confirmation emails sent.
- Expired holds are ignored by availability and cleaned up by the hourly job (`email.md`).

## Auth emails

Supabase's own SMTP is disabled. Every auth email (invite, password reset, email change) goes through the Send Email Hook → `supabase/functions/send-email` (Deno Edge Function) → Resend, using the same template aliases as the app and logging to `outbound_emails`. See `email.md`.
