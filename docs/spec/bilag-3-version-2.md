# Bilag 3 — Preliminary version 2.0

> **Language note:** This is an English translation of the client's preliminary v2.0 specification. v2.0 is out of scope for the current effort and has no committed estimate or delivery date.

This bilag collects the ideas and requirements that we have noted as relevant for a later version 2.0.

The list is preliminary. The purpose is to show the direction and ensure that v1.0 is built so that the functions can later be added without a complete rework.

## Payment

- Payment of bookings via card or MobilePay.
- Automatic invoicing in e-conomic.

## Company and members

- Public self-service for external customers.
- More granular roles and permissions within a company account.
- Multiple bookers or users per company account with individual login.
- Approval flow where a booking requires internal approval before it is confirmed.
- Recurring bookings.

## Prices and agreements

- Per-company-per-room special prices, for example free use of a company's own room.

> **Decision (ADR-0017):** Confirmed deferred — this specific feature is noted here and formally deferred from v1.0.

## Booking and rooms

- Two-way Outlook/calendar sync with conflict and double-booking handling.

> **Decision (ADR-0003):** Confirmed deferred — two-way sync requires conflict and double-booking handling.

- Room packages.
- Rebooking function.
- Waiting list.
- Automatic price calculation for non-standard returns of rooms.

## Communication

- Complete English user journey (signup, booking, error messages, confirmation code, booking confirmation, reminder, cancellation).

> **Decision (ADR-0016):** Confirmed deferred — English user journey deferred pending a separate hours estimate and written agreement.

## Administration and overview

- Export to Excel or CSV.
- Dashboard with statistics and key figures.
- Notifications and internal task flows for House Service, House Host and catering.

## Out of scope

The following have been discussed and are explicitly out of scope for v1.0 and not planned for v2.0 in this document:

- Member subscriptions and credits.
- Integration to other calendar or ERP systems than Outlook and e-conomic.
