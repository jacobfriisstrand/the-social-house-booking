# Bilag 1 — Booking platform version 1.0

> **Language note:** This is an English translation of the client's v1.0 specification. It has been annotated with the decisions recorded in `docs/adr/` so that the resolved outcome of every open question in the original document is unambiguous.

## Purpose

We have collected the functions and business rules for version 1.0 of the booking platform, based on our meeting on 11 August, your follow-up summary, and our subsequent review of the needs.

The purpose is to ensure we share the same understanding of the production-ready version and that the remaining hours are spent on the most important functions.

## Scope

Version 1.0 must be a simple, stable and user-friendly booking system where members can find and book rooms, and where The Social House gets a correct basis for manual invoicing.

The system must **not** handle:

- Payment or payment cards.
- Stripe.
- Automatic integration to e-conomic.
- Member subscriptions.
- Credits.
- Public self-service for external customers.

Invoicing is done manually in e-conomic, based on data from the admin panel.

> **Decision (ADR-0001):** The platform records bookings and prices but never takes payment. Admins invoice manually in e-conomic from the admin panel. Any future payment integration is a separate project with its own spec and estimate.

## Company account and creation

Each member company gets its own company account with one unique username and password.

The company account contains:

- Display name.
- Legal company name.
- Membership status.
- Agreed discount.
- Billing information.
- Billing interval.
- Optional customer number in e-conomic.
- Internal administrative information.

The company's display name is used in the booking platform, the calendar and communication. The legal company name is used for invoicing.

Example:

- Display name: Rituals.
- Legal company name: The company's full registered name.
- Communication: "Dear Rituals".
- Invoicing: The legal company name and CVR number.

Proposed creation flow:

- Admin creates the company with display name, legal company name, contact email, membership status and discount.
- Admin sends an invitation to the company.
- The company chooses a password and fills in its master data.
- There is no public self-registration in version 1.0.

> **Decision (ADR-0004):** Confirmed — one shared company account per company, but every booking is tied to a specific booker whose work email is verified with a six-digit code on each booking. Communication addresses the company ("Dear Rituals"), while admin knows exactly who is responsible for each booking.

The company must fill in, at minimum:

- Legal company name.
- CVR number or VAT number.
- Billing address, postal code, city and country.
- Primary contact person.
- Work email and mobile number.
- Invoice email, or the information needed for electronic invoicing.
- Optional attention, department, PO, reference or cost center.
- Free-text field for special billing information.

Admin must be notified when the company has completed the information.

The company can book once the mandatory fields are filled in. Admin can subsequently check and correct the information.

## The specific booker

Although the company has one company account, each booking must be tied to the specific person making the booking.

The booker enters:

- Full name.
- Work email.
- Mobile number.

The information is used for identification, email confirmation and any contact from The Social House.

The booker's email is confirmed on every booking with a six-digit code. The booking is only final once the code is approved.

The code must be time-limited, and the room must be held temporarily while the code is entered. The system must check availability again before the booking is confirmed.

Booking confirmations and reminders are addressed to the company's display name, not to the specific person.

Example

Peter makes a booking on Rituals' company account and confirms his own work email with a six-digit code.

Admin can see that Peter is responsible for the booking, while the confirmation is addressed:

> Dear Rituals
> Room of Power is now reserved for you …

## Rooms and search

Admin must be able to create and edit rooms with:

- Name.
- Multiple images.
- Description.
- Location or floor.
- Capacity.
- Normal hourly price excl. VAT.
- Opening and closing times.
- Practical information.
- Available add-ons.

A room must be able to be deactivated without losing previous bookings and invoicing history.

The user must be able to either choose a room first, or search by date, start time, end time and participant count and see the rooms that are free and have sufficient capacity.

> **Decision (ADR-0009):** Confirmed — both entry points stay in v1.0: choosing a room first, and searching by date, start/end time and participant count.

## Opening hours and booking period

Admin must be able to change the opening hours on an ongoing basis.

Members must be able to:

- Book the same day if the room is free.
- Book up to 12 months ahead.
- Book in 30-minute intervals.
- Book from 30 minutes up to the duration the opening hours allow.

All bookings must use the same availability, regardless of whether they are created by a member or admin. The system must prevent overlapping bookings of the same room.

## Buffer and return of the room

After every booking, a 30-minute buffer is automatically reserved.

The buffer:

- Blocks the room.
- Is not billed.
- Does not count as the customer's booked time.
- Is removed on cancellation.
- Moves with the booking on an admin edit.
- Must be able to fit within the room's closing time.

> **Decision (ADR-0002):** Confirmed — 30-minute non-billable buffer after every booking; removed on cancellation, moved with the booking on admin edits.

Example

A member books 10:00–12:00 and is billed for two hours. The room can first be booked again from 12:30.

The buffer is used to end the meeting, air out the room and return it to the house standard, so it stands inviting and ready for the next meeting.

The booker must, as a starting point:

- Put tables and chairs back.
- Remove own materials.
- Remove service and waste.
- Air out the room.
- Leave the room inviting and ready for the next user.

Ordinary cleaning and vacuuming is not the booker's responsibility.

If the room is not returned as agreed, The Social House can invoice documented extra time and any external costs to return the room to the house standard.

The amount is assessed case by case and added manually by admin with a short explanation. No automatic price calculation should be developed for this in version 1.0.

> **Decision (ADR-0010):** Confirmed — admin can add a manual amount with a short explanatory note after a booking has been held; no automatic price calculation in v1.0.

## Prices and discounts

All prices are shown excl. VAT.

The discount applies to room rental only. There is no member discount on catering, services or other add-ons.

> **Decision (ADR-0007):** Confirmed — discount applies to room rental only, never to add-ons, catering or services.

The price overview must show:

- The room's ordinary price.
- The company's discount.
- The member price.
- The savings achieved.
- Add-ons without discount.
- Total expected amount excl. VAT.

Example

Room of Power costs 800 kr per hour excl. VAT. The company books three hours and has 50% member discount:

- Ordinary room price: 2,400 kr.
- Member discount: 1,200 kr.
- Member price: 1,200 kr excl. VAT.
- Catering and service are added on top without discount.

The company must be able to have, at minimum, one fixed discount on room rental.

At the meeting we discussed the possibility that a specific company could have a special price on a specific room — for example free use of the company's own room and ordinary member discount on the house's other rooms.

> **Decision (ADR-0017):** Deferred to v2.0 — v1.0 supports only a single per-company discount on room rental. Per-company-per-room special prices are out of scope for v1.0.

## Historical prices

When a booking is confirmed, the following are saved:

- The current room price.
- The discount used.
- The price of add-ons.
- The expected total amount.
- The current cancellation terms.

Later changes must not change already confirmed bookings.

> **Decision (ADR-0005):** Confirmed — price snapshot at booking confirmation: room price, discount, add-on prices, expected total and cancellation terms are frozen; later changes affect only new bookings.

Example

A member books at 400 kr per hour. The price later changes to 450 kr per hour. The existing booking keeps the price of 400 kr, while new bookings use the new price.

## Add-ons

Admin must be able to create and edit add-ons with:

- Name.
- Description.
- Price excl. VAT.
- Whether the price is fixed or per participant.
- Whether the add-on is active.

It must be clearly shown whether an add-on has a fixed price or a per-participant price. At the meeting it was clarified that catering is calculated per person.

> **Decision (ADR-0011):** Confirmed — add-ons support both fixed and per-participant pricing, clearly distinguished in the admin panel. Add-ons are never discounted.

Example

- Extra screen: Fixed price of 500 kr excl. VAT.
- Lunch: 225 kr per participant excl. VAT.
- Ten participants with lunch: 10 × 225 kr = 2,250 kr excl. VAT.

## House Service — we prepare the room

House Service costs 500 kr excl. VAT and is intended for smaller meetings with at most five participants, at most four hours, and no lunch or other substantial catering.

House Service includes:

- Standard setup of the room.
- Handling of ordered coffee, tea and water.
- Clearing of service and waste.
- Airing out.
- Returning the room to the house standard after the meeting.

The booker can then leave the room without clearing or putting furniture back.

Coffee, tea, water and other catering are billed separately.

## House Host — personal hosting during the meeting

House Host has a standard price of 1,000 kr excl. VAT per event day and is relevant for:

- More than five participants.
- Lunch or other serving-requiring catering.
- Meetings over four hours.
- Special setup or practical needs.

House Host includes:

- Preparation and agreed setup.
- Handling and clearing of ordered catering.
- Practical help at relevant times.
- Coordination of special wishes.
- Airing out.
- Returning the room to the house standard after the meeting.

It is not a dedicated employee available exclusively all day.

For more than 15 participants or complex needs, price and staffing are agreed separately. Admin must be able to adjust the price on the specific booking.

Example

A company books a room 10:00–14:00 for ten participants and orders lunch. The system shows House Host at a standard price of 1,000 kr excl. VAT. Ali can then contact the company about setup, lunch and special needs.

To keep version 1.0 simple, House Service and House Host are created as ordinary add-ons with description and price.

The system can show guidance text about when House Host is recommended.

> **Decision (ADR-0015):** Confirmed — House Service and House Host are ordinary add-ons with description and price, plus optional guidance text. No automatic recommendation or pre-selection in v1.0.

## Catering and hospitality

Coffee, tea, water, lunch, other catering and hospitality must be ordered through The Social House.

It is not allowed to bring your own food, drinks, external catering or external hospitality staff, unless otherwise agreed in advance.

The rule must appear in the booking flow and in the booking confirmation. The booker must actively accept it.

## The booking's information

A booking must contain, at minimum:

- Company.
- Responsible booker.
- Work email and mobile number.
- Room.
- Date and time.
- Participant count.
- Optional PO, reference or cost center.
- Selected add-ons.
- The room's ordinary price.
- Discount and member price.
- Total expected amount excl. VAT.
- Booking status.
- Invoicing status.
- Creation and any cancellation time.

There must be two different free-text fields:

- One field the member fills in with allergies, accessibility needs or practical wishes.
- One internal admin field the member cannot see.

> **Decision (ADR-0012):** Confirmed — two separate free-text fields: one member-facing (allergies, accessibility, practical wishes) and one internal admin-only note.

## Cancellation

The booker must be able to cancel through a secure link in the booking confirmation and the reminder email.

The link leads to a confirmation page where the current fee is shown before the cancellation is completed.

The cancellation fee is calculated on the actual room price after member discount:

- More than 72 hours before: free.
- From 24 hours up to and including 72 hours before: 50%.
- Less than 24 hours before: 100%.

All cancellation fees are shown and calculated excl. VAT. VAT is added at the subsequent invoicing in e-conomic.

The system's registered cancellation time is decisive.

> **Decision (ADR-0006):** Confirmed — cancellation fee computed on the member price (room price after discount), not the list price. Add-on and catering costs already incurred are handled separately.

When a booking is cancelled:

- The room and the buffer are released immediately.
- The booking is kept in history.
- The cancellation time is recorded.
- The fee is calculated automatically.
- The booking's row in the admin panel is updated.
- The member and admin receive a confirmation.
- The scheduled reminder is removed.
- The calendar entry is updated.

Example

A member has booked a room at a member price of 1,200 kr excl. VAT and cancels 48 hours before:

- Cancellation fee: 600 kr excl. VAT.
- The room is released immediately.
- The fee is included in the company's invoicing basis.

If another company subsequently books the room, it pays its own ordinary price and any member discount. The original company's fee of 600 kr excl. VAT is unchanged.

There is no offsetting between the two bookings.

Any costs for already ordered catering or service are handled separately.

## Rebooking and errors

Version 1.0 does not include a separate self-service rebooking function.

The member can cancel and create a new booking. The ordinary cancellation rules apply.

Admin must be able to help correct an obvious error. If the error is discovered and corrected immediately after the booking, admin can manually waive a fee.

All changes must be kept in history.

## The company's own bookings

The company must be able to see its own upcoming and past bookings.

The overview must show:

- Upcoming bookings.
- Past bookings.
- Cancelled bookings.
- Room, date and time.
- Responsible booker.
- Price and member discount.
- Add-ons.
- Any cancellation fee.
- Booking status.

The overview must let the company see the basis for a later invoice itself.

> **Decision (ADR-0013):** Confirmed — member booking-overview table: upcoming, past and cancelled bookings in a simple table (room, date/time, booker, price, discount, add-ons, cancellation fee, status).

## Emails

Version 1.0 must send:

- Invitation to the company's creation.
- Confirmation code.
- Booking confirmation to the work email used.
- Notification to admin about new booking.
- Confirmation on change or cancellation.
- Reminder 24 hours before the meeting.
- Notification to admin when a company has completed its information.

Cancelled bookings must not receive reminders.

The system must record whether an important email was sent or failed.

All user-facing emails are addressed to the company's display name, e.g. "Dear Rituals" or "Dear Det Lille Akademi". The specific booker's work email is used as the recipient address, but the person's name is not used as the greeting.

The final wording is described in Bilag 2 — Email texts, booking platform version 1.0.

> **Implementation note (email foundation split).** The send mechanism — Resend integration, the `outbound_emails` send log, and a shared `sendMail()` helper that enforces the common rules (sender, one CTA, no-payment wording, hidden empty sections, savings conditional, sensitive-data flag) — is delivered first, in milestone M1, so early features (invite, confirmation code) can send real mail. The 10 email templates' exact Danish copy, the 24h reminder, and the in-app platform message are delivered later, in milestone M5. See GitHub issues #17 (email foundation) and #11 (templates + reminder).
>
> **Implementation note (reminder mechanism).** The 24h reminder is sent by exactly one scheduled job: a Netlify scheduled function (`@hourly`) that POSTs to `/api/jobs/send-reminders`. No Resend `scheduledAt` (30-day max vs 12-month bookings), no croner, no pg_cron, no Vercel cron. See `docs/agents/email.md`.

## Calendar and notice board

Admin must have:

- A colour-coded calendar overview.
- A table overview.
- Day, week and month view.
- Filtering on room and period.

The front page must have a simple notice board with:

- Today's bookings.
- Free rooms.
- When occupied rooms become free.
- Practical messages from The Social House.
- House Events.

Admin must be able to create a House Event with:

- Date and time.
- Affected rooms.
- Optional title.
- Short explanation.

A House Event blocks the selected rooms and is not part of the invoicing basis.

Example

House Event — 3 Days of Design

"The Eatery is used for 3 Days of Design. Room of Art and Room of Power can be booked as normal."

## Visible information for members

Other members can see:

- Room.
- Date and time.
- The company's display name.
- Whether the entry is a booking or a House Event.

Other members cannot see:

- The specific booker's name.
- Email or phone number.
- The meeting's purpose.
- Participant list.
- Catering.
- Special needs.
- Internal notes.

The specific booker's name and contact details are only visible to admin and on the company's own booking overview.

## Outlook 365

All bookings must be shown in the Outlook calendar:

`booking@thesocialhouse.dk`

The integration is one-way:

- Bookings are sent from the platform to Outlook.
- Changes update the same calendar entry.
- Cancellations update or remove the same calendar entry.
- House Events are also shown.
- No duplicates may occur.
- Outlook does not send bookings back to the platform.

> **Decision (ADR-0003):** Confirmed — one-way platform → Outlook sync for the shared `booking@thesocialhouse.dk` calendar, including House Events; Outlook never writes back. Two-way sync is deferred to v2.0.

## External customers

External customers do not get public access to create bookings themselves in version 1.0.

Admin must be able to create an external company and its booking in the same system, so external bookings use the same availability and do not create double bookings.

External bookings are registered at full room price without member discount.

> **Decision (ADR-0008):** Confirmed — external companies and their bookings are created by admin in the same system; no public self-registration. External self-service is deferred to v2.0.

## Admin panel and invoicing basis

The purpose of the invoicing view is that admin can quickly and safely form the basis for the company's monthly invoice without invoicing the same booking twice.

The view must open with the current month by default. Admin must also be able to choose another month or a free period.

Admin must be able to filter on:

- Month or free period.
- Company.
- Room.
- Invoicing status.

The invoicing statuses are:

- Not invoiced.
- Invoiced.
- Not invoicable.

As a starting point, one booking per row is shown with:

- Date.
- Start and end time.
- Company.
- Room.
- Number of billable hours.
- Normal hourly price.
- Discount percentage.
- Room rental after discount.
- Add-ons.
- Cancellation fee.
- Total amount excl. VAT.
- Invoicing status.

Example of a booking row

Room of Power is booked for three hours:

- Company: Rituals.
- Room: Room of Power.
- Date and time: 14 September 10:00–13:00.
- Number of hours: 3.
- Normal hourly price: 800 kr excl. VAT.
- Normal room price: 2,400 kr excl. VAT.
- Discount: 50%.
- Room rental after discount: 1,200 kr excl. VAT.
- House Service: 500 kr excl. VAT.
- Cancellation fee: 0 kr.
- Total amount: 1,700 kr excl. VAT.
- Invoicing status: Not invoiced.

At the bottom of the selected view, admin must be able to see:

- Total billable hours.
- Total room rental after discounts.
- Total add-ons.
- Total cancellation fees.
- Total invoicing basis excl. VAT.

The statement must be viewable both for the selected company and split by the rooms the company has used.

Example of a monthly statement

A company has used in September:

- Room of Power: 6 hours.
- Room of Art: 3 hours.
- Room of Exploration: 2 hours.

Admin can see hours, prices, discounts and amounts for each room, as well as the total invoicing basis for the company.

## The month's total booking economy

The admin panel in version 1.0 must show a total economic monthly overview across all companies with:

- Total number of bookings.
- Total booked room hours.
- Total booking value for room rental after discounts, excl. VAT.
- Total add-ons and services, excl. VAT.
- Total cancellation fees, excl. VAT.
- Total invoicing basis, excl. VAT.
- Split between members and external customers.

Admin must be able to go back and forth between months and follow the development in booking activity and booking value over time.

The overview is calculated by the month in which the meeting is held. Future bookings can be shown separately as expected booking value, but must not be counted in the amount ready for invoicing.

> **Decision (ADR-0014):** Confirmed — cross-company monthly booking-economy overview with the listed totals and the member-vs-external split. Future bookings appear separately as expected value and never count toward the amount ready to invoice.

Future bookings must not be marked as invoiced. An ordinary booking becomes invoicable when the booking's end time has passed.

A cancellation fee becomes invoicable when the cancellation has been completed and the fee calculated.

Admin must be able to select multiple bookings and mark them as invoiced together.

When marking as invoiced, the following are recorded:

- Invoice date.
- Invoice number.
- Who changed the status.
- When the status was changed.

The ordinary administrative information and notes can sit under "See details" and do not need to take up space in the primary invoicing overview.

Payment and reminders are handled in e-conomic and are not recorded in the booking system.

Export to Excel or CSV is not a requirement for version 1.0 if the function requires further development.

## Language

Danish is the primary language and standard.

A complete English user journey can be added if it can be delivered within the remaining time. An English version must cover creation, booking, error messages, confirmation code, booking confirmation, reminder and cancellation.

> **Decision (ADR-0016):** Deferred — v1.0 ships in Danish only; a complete English user journey is deferred pending a separate hours estimate and written agreement.

## Booking terms and personal data

The Social House delivers booking and cancellation terms as well as a privacy policy.

At booking, the user must actively confirm:

> I accept The Social House's booking and cancellation terms and confirm that I have read the privacy policy.

The system must record the time and the version of the terms that were accepted.

The delivery must include an overview of:

- Which personal and company data the system stores.
- Which external services and data processors are used.
- Where data is stored.
- How data can be exported, corrected and deleted.

## Mobile and user experience

The platform must work on mobile phone, tablet and computer.

It is a responsive web platform, not an App Store app. The user must be able to save a link to the platform on the phone's home screen.
