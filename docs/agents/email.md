# Email and the hourly job

Resend integration, templates, the send log, the webhook, and the single scheduled job.

Read `docs/vendor/resend/templates-introduction.md`, `templates-create.md`, `webhooks-introduction.md`, and `docs/vendor/supabase/auth-send-email-hook.md` first. `docs/vendor/resend/schedule-email.md` is kept for reference only — **we do not use Resend scheduling** (max 30 days ahead; bookings go 12 months ahead).

## One sender

`lib/email/send-mail.ts` is the only code in the Next app that calls Resend. Never import `resend` elsewhere. `sendMail({ kind, to, variables, bookingId?, companyId? })` — `kind` is the `outbound_email_kind` value and doubles as the Resend template alias (the two are 1:1). The per-kind variables schema is registered in `emails/templates/registry.ts` by the template that owns the alias. (`sensitive` mail handling is enforced in the template layer when the shared layout lands with #11.)

1. Enforces the spec's common rules: fixed `RESEND_FROM`, greeting addressed to the company display name ("Kære Rituals"), exactly one call-to-action, no payment wording, empty sections hidden, savings line only when a discount applies, `sensitive` flag respected.
2. On `APP_ENV = development`, **replaces every recipient with the comma-separated addresses in `EMAIL_REDIRECT_TO`** and prefixes the subject with `[development]`. This is not optional and not configurable per call.
3. Inserts an `outbound_emails` row (`outbound_email_kind`, `outbound_email_booking_id`, `outbound_email_to`, `outbound_email_resend_id`, `outbound_email_status = 'queued'`), then sends with `template: { id: alias, variables }`.
4. On a Resend error, sets `outbound_email_status = 'failed'` with the error and throws; callers decide whether the user flow continues.

`outbound_emails` has a unique index on `(outbound_email_booking_id, outbound_email_kind)` for kinds that must be sent once (`reminder`, `booking-confirmation`). Retries are therefore safe.

## Templates

- Source of truth: `emails/templates/<alias>.ts`, one per email in Bilag 2 (`docs/spec/bilag-2-mailtekster.md`), registered in `emails/templates/registry.ts`. A template is a plain module: `html` with Resend placeholders (`{{{KEY}}}`), `subject`, and a zod object `variables`. Resend renders it and derives the plain-text part; there is no React Email. Danish copy lives **here**, not in `messages/da.ts`.
- Alias = filename, kebab-case, one per Bilag 2 mail:

  | Bilag 2 | Alias | Sent by |
  |---|---|---|
  | Mail 1 – invitation | `company-invitation` | Send Email Hook (`invite`) |
  | Mail 2 – bekræftelseskode | `verification-code` | app |
  | Mail 3 – nulstilling af password | `password-reset` | Send Email Hook (`recovery`) |
  | Mail 4 – bookingbekræftelse | `booking-confirmation` | app |
  | Mail 5 – påmindelse 24 timer før | `reminder` | hourly job |
  | Mail 6 – bekræftelse på ændring | `booking-changed` | app (admin change) |
  | Mail 7 – afbookingsbekræftelse | `booking-cancelled` | app |
  | Mail 8 – advisering til admin om ny booking | `admin-new-booking` | app |
  | Mail 9 – advisering til admin om afbooking | `admin-booking-cancelled` | app |
  | Mail 10 – advisering om færdig virksomhedsoprettelse | `admin-company-completed` | app |

  Platformbesked 1 (confirmation before cancellation) is an in-app screen, not an email; its copy lives in `messages/da.ts`.
- Every variable is required: the sync script publishes them without fallbacks, so Resend rejects a send with a missing variable instead of sending a half-rendered mail. Values are inserted unescaped by `{{{KEY}}}`, so the sender HTML-escapes them (`sendMail()` callers pass plain text; the Send Email Hook escapes in `handler.ts`).
- `scripts/sync-email-templates.ts` (`npm run email:sync`) reads the registry, creates or updates each Resend template by alias and publishes it. CI runs it on merge to `develop` with the development API key and on merge to `main` with the production key. Both keys belong to the same Resend account; templates are the same content in both. Locally it reads `.env` and `.env.local`.
- Never edit a template in the Resend dashboard; the next sync overwrites it.

## Delivery status

`app/api/webhooks/resend/route.ts` receives Resend events (`email.sent`, `email.delivered`, `email.bounced`, `email.complained`, `email.delivery_delayed`), verifies the signature with `RESEND_WEBHOOK_SECRET`, and updates `outbound_email_status` by `outbound_email_resend_id`. The admin panel shows failed important emails from this table, as the spec requires.

## Auth emails

The Supabase Send Email Hook is the Edge Function `supabase/functions/send-email/` (Deno). It verifies the hook signature (`standardwebhooks`, `SEND_EMAIL_HOOK_SECRET`), picks the alias from `email_data.email_action_type`, calls Resend with the template, and inserts an `outbound_emails` row. It is the only other place that talks to Resend.

- `index.ts` is the Deno wiring (excluded from `tsc`; imports pinned in `deno.json`). `handler.ts` is pure and covered by Vitest.
- Mapped action types: `invite` → `company-invitation` (#26). `recovery` → `password-reset` arrives with #11. Every other action type, and any alias without a registry entry, is answered with a 4xx, which makes Auth fail the call instead of sending a blank mail. `email_change` never fires: admin changes a company's email with `email_confirm: true` (#1).
- The link is `<site_url>/set-password?token_hash=<hash>&type=<action>`, where `site_url` is Auth's per-project value from `config.toml` (`[remotes.<name>.auth]`). The page verifies the token with `verifyOtp` (#1).
- The greeting and `outbound_email_company_id` come from one lookup of `companies` by `company_auth_user_id` with the function's service-role client (allowlist entry 4). An invite for an auth user without a company row is a 400.
- The development redirect applies here too, fail-safe: only `APP_ENV=production` sends to the real recipient; anything else sends to `EMAIL_REDIRECT_TO` and a missing target is an error. The subject is the template's; the function does not prefix it.
- Locally the hook is disabled in the base `config.toml`, so `supabase start` delivers invites to the mail catcher on port 54324. To exercise the function itself, put `APP_ENV`, `EMAIL_REDIRECT_TO`, `RESEND_API_KEY`, `RESEND_FROM` and `SEND_EMAIL_HOOK_SECRET` in `supabase/functions/.env` (gitignored) and run `supabase functions serve send-email`. In the cloud the same five are Edge Function secrets (`docs/agents/deploy.md`); `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected.

## The hourly job

There is exactly one scheduled job.

- **Trigger**: `netlify/functions/send-reminders.mts` with `export const config = { schedule: "@hourly" }`. Its only job is `POST ${NEXT_PUBLIC_SITE_URL}/api/jobs/send-reminders` with `Authorization: Bearer ${JOB_SECRET}`. Netlify runs scheduled functions on the **production** deploy only; on `develop`, call the route manually with the secret.
- **Route**: `app/api/jobs/send-reminders/route.ts`, verifies `JOB_SECRET`, then:
  1. Selects `confirmed` bookings with `booking_start_at` in `(now() + 23h, now() + 24h]` that have no `reminder` row in `outbound_emails`, and sends `reminder` for each. Cancelled bookings never match. The unique index makes double runs harmless.
  2. Releases stale holds: `pending_verification` bookings past `booking_hold_expires_at` → `expired`.
- Must finish well inside Netlify's 30 s function limit; batch by 100 and log counts.
- No croner, no `pg_cron`, no Resend `scheduledAt`. The `route.ts` allowlist is: this route, any future `app/api/jobs/*`, the Resend webhook, and the Sentry webhook (`stack.md`). All user-triggered mutations are Server Actions.
