# Auth

Supabase Auth, adapted to the domain: one shared account per company, admins on the same login, bookers verified per booking without an account.

Read `docs/vendor/supabase/auth-custom-access-token-hook.md` and `auth-send-email-hook.md` before changing anything here.

## Accounts

| Who | Auth user? | How they get in |
|---|---|---|
| Company (member or external) | Yes — one `auth.users` row per company | Email + password on `/login` |
| Admin | Yes — rows in `admins`, JWT claim `app_role = 'admin'` | Same `/login` form |
| Booker | **No** | Six-digit verification code sent to their work email on every booking (ADR-0004) |

No public self-registration (ADR-0008): `enable_signup = false` in `supabase/config.toml`. Companies are created by admin, which calls `auth.admin.inviteUserByEmail`; the Send Email Hook delivers Mail 1 with a link to `app/(public)/set-password?token_hash=…&type=invite`, and that page verifies the token with `verifyOtp` and takes the password (#1). The link base is the hook payload's `redirect_to`, which Auth fills from `site_url`, set per cloud project under `[remotes.<name>.auth]` in `config.toml`. The payload's `site_url` field is Auth's own API URL and must not be used.

## Email login

Email is the only login credential (decided 2026-09-03, revising #25's username agreement; there is no unique username).

- The auth user's email **is** the company's real contact email (`companies.company_email`), so password reset works unchanged. Same for admins.
- The `/login` server action calls `signInWithPassword({ email, password })` with the normal server client — no service-role lookup step. On any failure (unknown email or wrong password), return the same generic error so the form never discloses whether an email exists.
- `company_display_name` / `admin_display_name` are for showing people, never for signing in.

## Roles in the JWT

The Custom Access Token Hook is a Postgres function `public.custom_access_token_hook(event jsonb) returns jsonb` that copies `app_role` from `auth.users.raw_app_meta_data` into the claims. It is declared in `supabase/schemas/functions/custom_access_token_hook.sql` with the grants the vendor doc requires (`grant execute … to supabase_auth_admin; revoke … from authenticated, anon, public`).

- `app_role` is `'admin'` or absent. It is written only by `supabase/seed.sql` (local) or `scripts/create-admin.ts` (cloud, uses `auth.admin.createUser` with `app_metadata: { app_role: 'admin' }`). No UI writes it in v1.0.
- Server code checks the role with `lib/auth/getSession()` → `session.appRole`. Do not decode the JWT by hand in components.
- RLS policies read `(auth.jwt() ->> 'app_role') = 'admin'`.

- Server code checks the role with `getSession()` from `lib/auth/get-session.ts` → `session.appRole`. Do not decode the JWT by hand in components.

- `app/(company)/*`: requires a session. `app/(admin)/*`: requires `app_role = 'admin'`. Both enforced in the route-group layout via `lib/auth/requireSession()` / `requireAdmin()`, and again inside every server action (layouts are not a security boundary).
- `app/(public)/*`: notice board, cancellation link pages, the forms demo. No session. Booker verification is not a public page: it is the verification step inside the booking dialog, under the company's session (#2).
- Use `@supabase/ssr` cookie handling exactly as in `docs/vendor/supabase/`; refresh the session in `proxy.ts` (Next 16's name for the former middleware — check `node_modules/next/dist/docs/`).

## Booker verification and holds

Built in #2. Code in `lib/bookings/actions.ts` (Server Actions), rules in `lib/domain/verification.ts`, the code itself in `lib/bookings/verification-code.ts`, the UI in `components/bookings/verification-step.tsx`. Until the booking dialog (#4) exists, `app/(company)/(gated)/demo/booking` (development only, behind the session and the master-data gate like the real flow) is the form that starts the flow.

- "Book nu" → `createHold()` inserts a `pending_verification` booking with `booking_hold_expires_at = now() + 10 minutes` and the price snapshot, under the company's session and RLS. The database's no-overlap constraint is the availability check: an `exclusion_violation` (23P01) reads as "Lokalet er ikke ledigt". The action then stores a code and sends Mail 2 via `sendMail()` (template `verification-code`, greeting the company display name, recipient the booker's work email). If the mail fails, the hold is released at once.
- The code is six digits from `crypto.randomInt`, stored in `verification_codes` as a SHA-256 hash bound to the booking id, compared with `timingSafeEqual`. Only this table goes through the service-role client (allowlist entry 1); it is admin-only under RLS because the booker is not an auth user.
- Rules: ten-minute window shared by the code and the hold, five attempts, then the hold is released (`expired`). A consumed or expired code is dead whatever is typed. "Send ny kode" (`resendCode()`) issues a new code and moves the hold to the new window; at most three resends per booking.
- `verifyCode()` confirms: status → `confirmed` only where the row is still `pending_verification` with a live hold, so a hold that died meanwhile fails with "Reservationen er udløbet". The room-free trigger re-runs on the status change, which is the spec's second availability check. The snapshot freezes by trigger (ADR-0005). Mail 4 and Mail 8 are wired at this point by #11.
- Expired holds are ignored by availability and cleaned up by the hourly job (`email.md`).
- Admin books on a company's behalf with `createAdminBooking()` in `lib/bookings/admin-actions.ts` (#14): the row is inserted as `confirmed` under the admin's session, with no hold and no code (ADR-0023). External companies only ever get bookings this way (ADR-0008). Until #4's dialog grows a company selector, `app/(admin)/admin/demo/booking` (development only) is the form; #4 deletes both demo routes and `components/bookings/dev-fields.tsx`.

## Auth emails

Supabase's own SMTP is disabled. Every auth email goes through the Send Email Hook → `supabase/functions/send-email` (Deno Edge Function) → Resend, using the same template aliases as the app and logging to `outbound_emails`. `invite` maps to `company-invitation` and `recovery` maps to `password-reset`; member email changes use the two-step app flow instead of Auth's `email_change`. Locally the hook is off and the mail catcher on port 54324 receives auth mail. See `email.md`.
