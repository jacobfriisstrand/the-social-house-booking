# Email and the hourly job

Resend integration, templates, the send log, the webhook, and the single scheduled job.

Read `docs/vendor/resend/templates-introduction.md`, `templates-create.md`, `webhooks-introduction.md`, and `docs/vendor/supabase/auth-send-email-hook.md` first. `docs/vendor/resend/schedule-email.md` is kept for reference only — **we do not use Resend scheduling** (max 30 days ahead; bookings go 12 months ahead).

## One sender

`lib/email/sendMail.ts` is the only code in the Next app that calls Resend. Never import `resend` elsewhere. `sendMail({ template, to, variables, bookingId?, companyId?, kind, sensitive? })`:

1. Enforces the spec's common rules: fixed `RESEND_FROM`, greeting addressed to the company display name ("Kære Rituals"), exactly one call-to-action, no payment wording, empty sections hidden, savings line only when a discount applies, `sensitive` flag respected.
2. On `APP_ENV = development`, **replaces every recipient with `EMAIL_REDIRECT_TO`** and prefixes the subject with `[development]`. This is not optional and not configurable per call.
3. Inserts an `outbound_emails` row (`outbound_email_kind`, `outbound_email_booking_id`, `outbound_email_to`, `outbound_email_resend_id`, `outbound_email_status = 'queued'`), then sends with `template: { id: alias, variables }`.
4. On a Resend error, sets `outbound_email_status = 'failed'` with the error and throws; callers decide whether the user flow continues.

`outbound_emails` has a unique index on `(outbound_email_booking_id, outbound_email_kind)` for kinds that must be sent once (`reminder`, `booking-confirmation`). Retries are therefore safe.

## Templates

- Source of truth: `emails/templates/<alias>.tsx`, React Email, one per email in Bilag 2 (`docs/spec/bilag-2-mailtekster.md`). Danish copy lives **here**, not in `messages/da.ts`.
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
- Variables are declared next to the template as a zod schema (`emails/templates/<alias>.variables.ts`); `sendMail` is typed by alias. Resend rejects a send with a missing variable and no fallback, so every variable either is required in the schema or declares a `fallback_value`.
- `scripts/sync-email-templates.ts` (`npm run email:sync`) renders each template, then creates or updates the Resend template by alias and publishes it. CI runs it on merge to `develop` with the development API key and on merge to `main` with the production key. Both keys belong to the same Resend account; templates are the same content in both.
- Never edit a template in the Resend dashboard; the next sync overwrites it.

## Delivery status

`app/api/webhooks/resend/route.ts` receives Resend events (`email.sent`, `email.delivered`, `email.bounced`, `email.complained`, `email.delivery_delayed`), verifies the signature with `RESEND_WEBHOOK_SECRET`, and updates `outbound_email_status` by `outbound_email_resend_id`. The admin panel shows failed important emails from this table, as the spec requires.

## Auth emails

The Supabase Send Email Hook is the Edge Function `supabase/functions/send-email/` (Deno). It verifies the hook signature (`standardwebhooks`, `SEND_EMAIL_HOOK_SECRET`), picks the alias from `email_data.email_action_type` (`invite` → `company-invitation`, `recovery` → `password-reset`, …), calls Resend with the template, and inserts an `outbound_emails` row. It is the only other place that talks to Resend. Its secrets are set with `supabase secrets set`, per project.

## The hourly job

There is exactly one scheduled job.

- **Trigger**: `netlify/functions/send-reminders.mts` with `export const config = { schedule: "@hourly" }`. Its only job is `POST ${NEXT_PUBLIC_SITE_URL}/api/jobs/send-reminders` with `Authorization: Bearer ${JOB_SECRET}`. Netlify runs scheduled functions on the **production** deploy only; on `develop`, call the route manually with the secret.
- **Route**: `app/api/jobs/send-reminders/route.ts`, verifies `JOB_SECRET`, then:
  1. Selects `confirmed` bookings with `booking_start_at` in `(now() + 23h, now() + 24h]` that have no `reminder` row in `outbound_emails`, and sends `reminder` for each. Cancelled bookings never match. The unique index makes double runs harmless.
  2. Releases stale holds: `pending_verification` bookings past `booking_hold_expires_at` → `expired`.
- Must finish well inside Netlify's 30 s function limit; batch by 100 and log counts.
- No croner, no `pg_cron`, no Resend `scheduledAt`. The `route.ts` allowlist is: this route, any future `app/api/jobs/*`, and the Resend webhook. All user-triggered mutations are Server Actions.
