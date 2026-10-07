# GDPR data inventory

Date: 2026-10-05. Applies to version 1.0 of the booking platform, as the code stands on this date.

Bilag 1, "Booking terms and personal data", asks for an overview of four things. This document gives it.

1. Which personal and company data the platform stores.
2. Which external services and data processors it uses.
3. Where the data is stored.
4. How data can be exported, corrected and deleted.

Sections 1 to 3 are for The Social House's management. Sections 4 to 6 are procedures for a developer. Section 7 collects everything marked "To confirm", for The Social House to answer.

The Danish "GDPR overview" text that companies read in the platform lives in the table `terms_versions` under the name "GDPR overview", and admin edits it there. Write that text from this document. When a table or a service changes, update both.

## 1. Data we store

Everything below lives in the production Supabase project, `the-social-house-production`. Logins are in Supabase Auth, room photos in Supabase Storage, and the rest in the Postgres database.

"The company" below means anyone with the company's login. A company has one shared login, so everyone at the company who knows the password can read all of the company's bookings, including the bookers' names, emails, phone numbers and practical notes.

| Data | What it holds | Whose data | Why we keep it | Who can read it |
|---|---|---|---|---|
| Company master data, `companies` | Login email, display name, legal company name, CVR number, contact person's name and mobile, invoicing address, invoice email, att. line, department, reference, invoicing notes, e-conomic customer number, membership status, discount, internal admin note | The company. The contact person, and often the login email, identify a person. | Login, mail to the company, invoicing in e-conomic | The company, admin |
| Logins, Supabase Auth `auth.users` | Email, password as a one-way hash, sign-in times. Supabase Auth also keeps sessions and an audit log with IP address and browser. | One login per company, one per admin | Signing in | Nobody inside the platform. Developers with production access. |
| Admins, `admins` | Display name, link to the login | The Social House staff | Admin access | Admin |
| Bookings, `bookings` | Booker's full name, work email and mobile, participant count, reference, practical notes, internal admin note, room, time, prices, cancellation, invoice number and date | The booker, who is a person at the company, and the company | Running the meeting, reaching the booker, invoicing, cancellation fees | The company, its own bookings only. Admin. |
| Booking history, `booking_history` | Every change to a booking with old and new value, booker details and notes included, and which login made the change | Booker, company | The trail Bilag 1 requires for cancellations and corrections | Admin |
| Add-on lines and manual amounts, `booking_addons`, `manual_amounts` | Prices, the short note on a manual amount, the admin who added it | Company, admin | Invoicing basis | The company, its own bookings only. Admin. |
| Verification codes, `verification_codes` | The code as a one-way hash, expiry time, attempts | No personal data in the row. It links to a booking. | Proving the booker's work email | Admin. The server code reads it. |
| Company change requests, `company_change_requests`, `company_change_tokens` | Current and proposed login email, a before-and-after copy of the master data, approval links stored as hashes | Company, contact person | The current login email must approve every change | Server code only. No login can read it. |
| Terms acceptances, `terms_acceptances` | Company, booking, the accepted version, time of acceptance | Company | Bilag 1 requires the time and the version | The company, its own. Admin. |
| Email log, `outbound_emails` | Recipient address, type of mail, Resend id, delivery status, error text. The mail body is not stored. | Booker, company, admin | Send each mail once. Show admin which mails failed. | The company, rows linked to it. Admin. |

Notes on the table:

- **Practical notes may hold health data.** Bookers write allergies and accessibility needs there. Health data is a special category under GDPR article 9. Practical notes never go into an email. The admin mail about a new booking only says whether notes exist, and the Sentry filter removes them too.
- **Internal admin notes are hidden, not protected.** The platform never shows the internal note on a company or a booking to the company. But the database protects whole rows, not single columns. A company that queries the database API with its own login can read the internal notes on its own rows. Write nothing there that the company may not read.
- **Other companies see very little.** Every logged-in company sees room, date, time and the display name of the company behind each booking, through the `calendar_entries` view. That view never includes booker details, participants or notes, which matches Bilag 1, "Visible information for members".
- **Terms acceptance is recorded per booking.** When the booker clicks "Book nu", the platform writes one row for the booking terms and one for the privacy policy, each with the version shown and the time. Only bookings a company makes itself get these rows. A booking admin enters on a company's behalf records none (decided in #15).
- **Data that is not personal.** Rooms, room photos, opening hours, special closing days, the add-on catalogue, House Events, notices, the Wi-Fi settings and the terms texts in `terms_versions`. Room photos are public links, so do not upload photos where people can be recognised.
- **In the browser.** The platform sets Supabase's login cookies and one cookie that remembers whether the side menu is open. It has no analytics or tracking. Fonts are served from the site itself.

## 2. Processors and where data is stored

| Service | What it does here | Personal data it receives | Location |
|---|---|---|---|
| Supabase | Database, logins, room photo storage, and the `send-email` Edge Function that sends login emails | Everything in section 1 | Project `the-social-house-production`, ref `rukxjslnbhsqdzmeenbn`, on the Pro plan. To confirm: the region. Issue #15 requires an EU region. The repository records no region for production. The setup script only tells whoever creates the development project to pick `eu-central-1`, which is Frankfurt. |
| Resend | Sends every email, from the platform and from Supabase Auth, and reports delivery status back | Recipient addresses, the company display name, verification codes, cancellation and approval links. Admin mails about new and cancelled bookings carry the booker's name, and the one about a new booking also the booker's email and phone. The admin mail about a completed company carries its login email, contact person's name and phone, and invoice email. | To confirm: the region of the sending domain. To confirm: production sends from `booking@thesocialhouse.dk` at go-live, as `.env.example` says. |
| Netlify | Hosts the website and runs its server code and the hourly scheduled function | All personal data passes through on its way to and from the database. Netlify sees each visitor's IP address. The platform's own code writes no logs. | To confirm: the functions region and how long Netlify keeps request logs. |
| Sentry | Collects errors from the browser and the server | Error type and code location, browser, page address, `company_id` and `booking_number`. Before sending, the filter in `lib/sentry/scrub.ts` drops the signed-in identity, cookies and request bodies, and blanks every field named like email, phone, name, practical notes or internal note. | Organisation `the-social-house`, project `tsh-booking`. A repository note in `docs/vendor/sentry/webhooks.md` says the organisation is in Sentry's EU region. To confirm: the production DSN points at the EU region. |
| GitHub | Source code, issue tracker, automated checks | No personal data by design. Each new Sentry error opens a GitHub issue with the error title and code location. | The repository is public, checked 2026-10-05. Issue titles from Sentry are therefore public too. |

The Sentry filter works on field names. It does not read inside an error message, so code must never put personal data into one. The rule is in `docs/agents/stack.md`.

Two systems are not processors of this platform in v1.0:

- **e-conomic.** Admin copies invoicing data into e-conomic by hand, as ADR-0001 decides. The platform has no connection to it. What happens to the data in e-conomic belongs in The Social House's own records.
- **Microsoft Outlook.** Bilag 1 and ADR-0003 describe a one-way sync of bookings to the calendar `booking@thesocialhouse.dk`. It is not built yet. When it is, Microsoft becomes a processor and this document needs a new row.

**Development is separate.** Local development, the `develop` branch and pull-request previews use their own Supabase project, `the-social-house-development`. Every email sent from development goes to the addresses in `EMAIL_REDIRECT_TO`, never to the real recipient. Development should hold test data only.

## 3. Retention

Nothing in the platform deletes personal data on a schedule. This is what the code does today.

| Data | What happens | Kept for |
|---|---|---|
| Bookings, booker details, practical notes | Nothing deletes a booking. A cancelled booking stays as history. The database grants no delete right on bookings to any login. | No limit |
| Unconfirmed bookings, called holds | A hold lasts 10 minutes. After that its status becomes "expired", but the booker's name, email and phone stay on the row. | No limit |
| Booking history | Rows are only ever added. Old values of booker details and notes stay here even after the booking is corrected. | No limit |
| Verification codes | Stored as a hash. A code dies after 10 minutes or 5 wrong attempts. The row stays. | No limit, but no personal data in the row |
| Company change requests | The approval link expires after 30 minutes. The request and its before-and-after copy of the master data stay. | No limit |
| Email log | Nothing deletes it. | No limit |
| Terms acceptances | Nothing deletes them. They are the proof Bilag 1 asks for. | No limit |
| Manual amounts | Admin can remove one while the booking still waits for its invoice. | No limit otherwise |
| Login sessions | End when the company or admin signs out. Production signs a login out after 7 days without activity. | Until sign-out or 7 days idle |
| Supabase backups and Auth audit log, Resend, Netlify and Sentry | Each provider's own rules | To confirm |

The status change from hold to "expired" happens on the next write to the row, or when `expire_stale_holds()` runs. The hourly job is meant to call it through `app/api/jobs/send-reminders`, which is not in the repository yet. Either way, nothing is deleted.

**The Social House needs to set retention periods.** Our suggestion:

- Delete expired holds after a short period, for example 30 days. They never became bookings, and nothing needs them.
- Once a booking is invoiced and the period is closed, keep the amounts but anonymise the booker's details and practical notes, as in section 6.1.
- Delete email log rows and finished change requests after, for example, 12 months.
- To confirm with The Social House and its accountant: Danish bookkeeping rules may require keeping the invoicing basis for a number of years. That decides how long the amounts and invoice numbers stay.

Any cleanup built later belongs in the existing hourly job. AGENTS.md allows only that one scheduled job.

## 4. Export

**In the platform today.** A company sees its own bookings in the member booking overview and its master data on its settings page. Admin sees every company on the Virksomheder page and every booking in the admin booking list. Nobody can download anything. There is no export feature.

**By hand.** A developer exports with `psql` against the production database. Use `psql` for all three procedures in this document, not the Supabase dashboard; AGENTS.md forbids changing anything there. Start a read-only transaction, so nothing can change by mistake. Each query writes one CSV file.

```sql
\set company_id '00000000-0000-0000-0000-000000000000'
\pset format csv
begin read only;

\o company.csv
select * from public.companies where company_id = :'company_id';
\o login.csv
select u.id, u.email, u.created_at, u.last_sign_in_at
  from auth.users u
  join public.companies c on c.company_auth_user_id = u.id
  where c.company_id = :'company_id';
\o bookings.csv
select * from public.bookings where booking_company_id = :'company_id';
\o booking_history.csv
select h.* from public.booking_history h
  join public.bookings b on b.booking_id = h.booking_history_booking_id
  where b.booking_company_id = :'company_id';
\o booking_addons.csv
select a.* from public.booking_addons a
  join public.bookings b on b.booking_id = a.booking_addon_booking_id
  where b.booking_company_id = :'company_id';
\o manual_amounts.csv
select m.* from public.manual_amounts m
  join public.bookings b on b.booking_id = m.manual_amount_booking_id
  where b.booking_company_id = :'company_id';
\o terms_acceptances.csv
select * from public.terms_acceptances where terms_acceptance_company_id = :'company_id';
\o change_requests.csv
select * from public.company_change_requests where company_change_request_company_id = :'company_id';
\o emails.csv
select * from public.outbound_emails where outbound_email_company_id = :'company_id';
\o

rollback;
```

For one booker instead of a whole company, select bookings with `lower(booking_booker_email) = lower(:'email')`, booking history by those booking ids, and email log rows with `lower(outbound_email_to) = lower(:'email')`.

The files include the internal admin notes. Read them before sending. The developer hands the files to The Social House, which answers the request.

## 5. Correction

| What | Who corrects it | How |
|---|---|---|
| Company master data, contact person, invoice email, login email | The company | On its settings page. The change takes effect only when the current login email approves it through a link that is valid for 30 minutes. A new login email must confirm the change as well. Code: `lib/companies/change-actions.ts`. |
| The same fields, plus display name, membership status, discount, e-conomic customer number, internal admin note | Admin | In the company's panel on the Virksomheder page. The change takes effect at once. A new login email is changed in Supabase Auth too. Code: `lib/companies/admin-actions.ts`. |
| Password | The company | "Glemt adgangskode?" on the login page, or the security section of its settings page |
| Booker name, email, phone, practical notes or reference on a booking | Developer | No screen exists. After a booking is made, neither the company nor admin can edit these fields. |
| Admin display name | Developer | No screen exists. |

A developer corrects a booking by its booking number. The booking history records the old and the new value automatically.

```sql
begin;
update public.bookings
  set booking_booker_phone = '+45 12 34 56 78'
  where booking_number = 'B-2610-0042';
commit;
```

## 6. Deletion

The platform has no delete feature for companies, bookers or bookings. Bookings have no delete right at all, by design, because they are invoicing history. The procedures below are manual. A developer runs them with `psql` against production, each inside one transaction. Test the script on a local database first.

Two copies outlive any deletion. Rows stay in Supabase backups until those expire, and Resend keeps its own copy of sent mail.

### 6.1 Erase one booker and keep the bookings

Use this when a person asks to be erased and the bookings must stay for invoicing. Updating a booking makes the history trigger store the old values once more, so the script cleans the history after the update.

```sql
\set email 'anna@firma.dk'
begin;

create temp table erased on commit drop as
  select booking_id from public.bookings
  where lower(booking_booker_email) = lower(:'email');

update public.bookings b
  set booking_booker_name = 'Slettet',
      booking_booker_email = 'slettet@example.invalid',
      booking_booker_phone = '-',
      booking_practical_notes = null
  from erased e
  where b.booking_id = e.booking_id;

-- Removes the booker keys from every history row of these bookings,
-- including the row the update above just added.
update public.booking_history h
  set booking_history_change = h.booking_history_change
    - array['booking_booker_name', 'booking_booker_email',
            'booking_booker_phone', 'booking_practical_notes']
  from erased e
  where h.booking_history_booking_id = e.booking_id;

update public.outbound_emails
  set outbound_email_to = 'slettet@example.invalid'
  where lower(outbound_email_to) = lower(:'email');

commit;
```

Then read `booking_reference` and `booking_internal_note` on the same bookings by hand, since free text can name the person. If the person is also the company's contact person or login email, correct the company as in section 5. Then delete the company's finished rows in `company_change_requests`, which hold copies of the old master data.

### 6.2 Delete a company and everything about it

Foreign keys set the order. These references block a delete, so the rows that point at the company go first:

- `terms_acceptances` points at `companies` and `bookings`.
- `outbound_emails` points at `companies` and `bookings`.
- `bookings` points at `companies`.
- `company_change_requests` points at `companies`.
- `companies` points at the Supabase Auth login.

Deleting a booking also deletes its add-on lines, history, manual amounts and verification codes. Deleting a change request also deletes its tokens.

```sql
\set company_id '00000000-0000-0000-0000-000000000000'
begin;

delete from public.terms_acceptances
  where terms_acceptance_company_id = :'company_id';

delete from public.outbound_emails
  where outbound_email_company_id = :'company_id'
     or outbound_email_booking_id in (
       select booking_id from public.bookings
       where booking_company_id = :'company_id');

delete from public.bookings
  where booking_company_id = :'company_id';

delete from public.company_change_requests
  where company_change_request_company_id = :'company_id';

delete from public.companies
  where company_id = :'company_id'
  returning company_auth_user_id;

commit;
```

Then delete the login with the Supabase Auth admin API: `auth.admin.deleteUser(<company_auth_user_id>)`. Supabase removes the login's sessions with it. The call needs the service-role key, and no script for it exists yet. Write one like `scripts/create-admin.ts`, which builds its own client in a separate process, and add it to the service-role list in `docs/agents/supabase.md`.

This also deletes the terms acceptances, which are the proof of what the company accepted. Do it only when nothing requires keeping them.

### 6.3 Close a company and keep its bookings

The schema cannot do this cleanly today. Each company row requires a login, so the login cannot be deleted while the company row exists. The company row cannot go while bookings point at it. The closest option today:

1. Erase the booker details on each of the company's bookings, as in 6.1.
2. In the company's panel on the Virksomheder page, replace the login email, contact person, phone and invoice email with placeholders, and clear the notes. The panel refuses empty required fields once a company's master data is complete, so use placeholders, not blanks.
3. Delete the company's rows in `company_change_requests`. They hold copies of the old master data.
4. Block the login with the Auth admin API, `updateUserById` with a `ban_duration`, and end its sessions with `revoke_company_sessions`.

A clean fix needs a schema change, for example letting a company exist without a login. That is a decision for section 7.

### 6.4 Remove an admin

Delete the `admins` row, then the login. Three columns point at an admin's login and block that delete: `booking_history_changed_by`, `booking_invoiced_by` and `manual_amount_created_by`. Set them to null first. That loses the record of who did what, so blocking the login as in 6.3 is often the better choice.

### If The Social House wants a delete button

Build it as a Server Action under the admin's login. AGENTS.md allows no new `route.ts` files. Deleting the Supabase Auth login needs the service-role client, which means a new entry on the list in `docs/agents/supabase.md`.

## 7. Open points for The Social House

Each point needs an answer or a decision before go-live.

1. **Supabase region.** To confirm: the production project runs in an EU region, as issue #15 requires.
2. **Supabase backups and logs.** To confirm: how long backups of production are kept, and how long Supabase keeps the Auth audit log and API logs.
3. **Resend region and account.** To confirm: the region of the production sending domain, and that production sends from `booking@thesocialhouse.dk` on The Social House's own account at go-live.
4. **Resend retention.** To confirm: how long Resend keeps sent mail, and whether a single mail can be deleted there on request.
5. **Netlify.** To confirm: the functions region and how long request logs are kept.
6. **Sentry.** To confirm: the production DSN points at Sentry's EU region, and how long Sentry keeps events.
7. **Public GitHub repository.** To confirm: that error titles from Sentry may appear in public GitHub issues. If not, make the repository private or stop the automatic issues.
8. **Data processing agreements.** To confirm: The Social House has a data processing agreement with Supabase, Resend, Netlify and Sentry, and knows which account owns each service.
9. **Retention periods.** To decide: how long to keep bookings, booker details, expired holds, booking history, the email log, change requests and terms acceptances. To confirm with The Social House and its accountant: what Danish bookkeeping rules require for the invoicing basis.
10. **Health data in practical notes.** To confirm: the legal basis for storing allergies and accessibility needs, and whether the booking dialog should tell bookers to write only what the meeting needs.
11. **Internal admin notes.** To decide: is it acceptable that a company can read its own internal notes through the database API? If not, a developer must add column-level protection.
12. **Closing a company and keeping its bookings.** To decide: is 6.3 good enough, or should the schema let a company exist without a login?
13. **Access to production.** To confirm: who holds production database access to run the procedures in sections 4 to 6, and where each request and its handling is logged.
14. **Outlook sync.** When the sync in ADR-0003 is built, Microsoft becomes a processor. Update this document then.
15. **Development data.** To confirm: the development project holds test data only, and no real company or booker data is ever copied into it.
