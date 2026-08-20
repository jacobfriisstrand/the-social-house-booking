# The Social House — Booking Platform

A meeting-room booking platform where member companies book rooms and The Social House invoices them manually in e-conomic.

## Language

### Companies and accounts

**Company** (virksomhed):
The organisation that holds an account and books rooms. One account per company, with one shared username and password.
_Avoid_: business, customer, client, account, organisation

**Member company** (medlemsvirksomhed):
A company with a membership agreement, entitled to a discount on room rental.
_Avoid_: member

**External company** (ekstern virksomhed):
A company with no membership, paying full room price. Created by admin only — no public self-registration in v1.0.
_Avoid_: external customer, guest, walk-in

**Display name** (visningsnavn):
The short name shown in the platform, calendar, and all communication (e.g. "Rituals").
_Avoid_: brand name, trading name

**Legal company name** (juridisk virksomhedsnavn):
The company's full registered name, used only for invoicing.
_Avoid_: registered name, official name

**Membership status** (medlemsstatus):
Whether a company is an active member, and on what terms. Managed by admin.

**Discount** (rabat):
The percentage off room rental a member receives. Applies to room rental only — never add-ons, catering, or services.
_Avoid_: reduction, rebate, markdown

**Member price** (medlemspris):
The room rental price after the member's discount is applied.
_Avoid_: discounted price, net price

### Rooms and availability

**Room** (lokale):
A bookable meeting room with a name, images, description, location/floor, capacity, hourly price excl. VAT, opening hours, practical notes, and add-ons. Can be deactivated without losing history.
_Avoid_: venue, space, meeting room

**Opening hours** (åbningstider):
The hours a room can be booked. Admin-editable; every booking must fit within them.

**Buffer**:
A 30-minute, non-billable block reserved automatically after every booking. Blocks the room, is never billed, is not part of the booked time, and is removed on cancellation and moved with the booking on admin changes.
_Avoid_: turnaround, padding, gap

**Capacity** (kapacitet):
The maximum number of participants a room holds.

### Bookings

**Booking**:
A reservation of one room for a date, start time, and end time, always tied to a company and a booker.
_Avoid_: reservation, appointment

**Booker**:
The specific person who makes a booking (full name, work email, mobile), distinct from the company account. Their work email is verified with a code on every booking.
_Avoid_: user, contact, member

**Verification code** (bekræftelseskode):
A six-digit, time-limited code sent to the booker's work email; the booking is final only once the code is entered. The room is held temporarily while the code is entered.
_Avoid_: OTP, confirmation code, token

**Participant count** (deltagerantal):
The number of people attending, entered at booking. Drives capacity checks and per-participant add-on pricing.

**Booking number** (bookingnummer):
A unique, human-readable identifier shown in mail and the admin panel.

**Cancellation** (afbooking):
Calling off a booking via a secure link. Frees the room and buffer immediately; the booking stays in history.
_Avoid_: cancel, no-show, delete

**Cancellation fee** (afbestillingsgebyr):
The amount charged on cancellation, computed on the member price: free more than 72h before, 50% from 24–72h before, 100% less than 24h before. Excl. VAT.
_Avoid_: penalty, charge, late fee

**Add-on** (tilvalg):
An extra service selectable on a booking (e.g. extra screen, lunch). Priced either as a fixed total or per participant. Never discounted.
_Avoid_: extra, option, service

**Catering** (forplejning):
Food and drink, ordered only through The Social House. External food, drink, or catering is not allowed unless agreed.
_Avoid_: food service, hospitality

**House Service**:
A fixed add-on (500 kr excl. VAT) where The Social House prepares and resets the room. For small meetings: max 5 participants, max 4 hours, no catering.

**House Host**:
A fixed add-on (1,000 kr excl. VAT per event day) providing hosting during the meeting. For >5 participants, catering, >4 hours, or special setups. Admin can adjust the price per booking.

**House Event**:
An internal The Social House event that blocks selected rooms and is not part of the invoicing basis.
_Avoid_: internal booking, block, closure

**Practical notes**:
Free text the member fills in — allergies, accessibility needs, practical wishes. Visible to admin.
_Avoid_: notes, requests, comments

**Internal admin note**:
Free text visible only to admin, never to the member.

**Member booking overview** (bookingoversigt):
The member's own view of upcoming, past, and cancelled bookings — room, date/time, responsible booker, price, discount, add-ons, cancellation fee, and status. Lets the company see the basis for a later invoice.

### Pricing and invoicing

**VAT** (moms):
All prices in the platform are shown and calculated excl. VAT. VAT is added later during manual invoicing.
_Avoid_: tax, sales tax

**Room price** (lokalepris):
The room's standard hourly price excl. VAT.

**Historical price**:
The room price, discount, add-on prices, expected total, and cancellation terms frozen when a booking is confirmed. Later changes never alter confirmed bookings.
_Avoid_: price history, snapshot

**Invoicing** (fakturering):
Manual creation of invoices in e-conomic from admin-panel data. The platform never handles payment.
_Avoid_: billing, payment, charging

**Invoicing status** (faktureringsstatus):
One of "Not invoiced" (ikke faktureret), "Invoiced" (faktureret), or "Not invoicable" (ikke fakturerbar).

**Invoicing basis** (faktureringsgrundlag):
The amount ready to invoice for a booking or period, excl. VAT.

**Monthly booking economy** (månedens samlede bookingøkonomi):
A cross-company admin view of one month's totals: bookings, booked room hours, room-rental value after discounts, add-ons, cancellation fees, and invoicing basis excl. VAT, split between members and external customers.

**Invoice date / number** (fakturadato / fakturanummer):
Recorded when admin marks bookings as invoiced.

### Channels

**Reminder** (påmindelse):
A mail sent 24 hours before a meeting, with booking details, the cancellation link, and the cancellation rules. Never sent for cancelled bookings.
_Avoid_: notification, alert

**Notice board** (opslagstavle):
The front page: today's bookings, free rooms, when occupied rooms free up, practical notices, and House Events.

**Outlook calendar**:
The shared calendar `booking@thesocialhouse.dk` that mirrors all bookings and House Events one-way (platform → Outlook).
