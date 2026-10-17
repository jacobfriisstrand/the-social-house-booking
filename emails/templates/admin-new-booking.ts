// Bilag 2, Mail 8 — copy verbatim from docs/spec/bilag-2-mailtekster.md.
// Sent by the app to ADMIN_NOTIFY_EMAIL whenever a booking is confirmed —
// by the member's code or by an admin booking on a company's behalf
// (ADR-0023). The booker's practical note is echoed in the SERVICE block
// so the admin reads it directly (Bilag 2 Mail 8 amended to match).
// Resend inserts {{{KEY}}} unescaped, so every value is escaped in
// adminNewBookingVariables() — the hook's escapeHtml is the one
// implementation.

import { z } from "zod";
import { hoursBetween } from "../../lib/domain/time.ts";
import { formatDate, formatTime } from "../../lib/format.ts";
import { escapeHtml } from "../../supabase/functions/send-email/handler.ts";
import {
  type BookingPriceAddOnLine,
  bookingPriceTableHtml,
} from "./booking-sections.ts";
import {
  emailButton,
  emailHeading,
  emailLayout,
  emailNotice,
  emailParagraph,
  emailRule,
} from "./layout.ts";
import type { EmailTemplate } from "./registry";

const text = (value: string): string => escapeHtml(value);

const jaNej = (yes: boolean): string => (yes ? "Ja" : "Nej");

// The booker's note keeps its line breaks, same as the reminder template.
const LINE_BREAK = /\r?\n/g;

const hoursFormatter = new Intl.NumberFormat("da-DK", {
  maximumFractionDigits: 2,
});

export interface AdminNewBookingInput {
  actionUrl: string;
  addOnLines: BookingPriceAddOnLine[];
  bookerEmail: string;
  bookerName: string;
  bookerPhone: string;
  bookingEndAt: string;
  bookingExpectedTotalOre: number;
  bookingNumber: string;
  bookingParticipantCount: number;
  bookingPracticalNotes: string | null;
  bookingRoomPriceOre: number;
  bookingStartAt: string;
  companyDisplayName: string;
  companyLegalName: string | null;
  discountPercent: number;
  hasCatering: boolean;
  hasHouseHost: boolean;
  hasHouseService: boolean;
  roomName: string;
}

// The PRISOVERSIGT section: the shared booking price table with the admin
// labels (Bilag 2, Mail 8).
export const adminNewBookingPriceOverviewHtml = (
  input: AdminNewBookingInput
): string =>
  bookingPriceTableHtml(
    {
      addOnLines: input.addOnLines,
      discountPercent: input.discountPercent,
      expectedTotalOre: input.bookingExpectedTotalOre,
      roomPriceOre: input.bookingRoomPriceOre,
    },
    { discount: "Rabat", memberPrice: "Lokaleleje efter rabat" }
  );

// SERVICE OG PRAKTISKE BEHOV: the flags plus the booker's own note, shown
// verbatim so the admin reads it without opening the admin panel (the mail
// no longer hides the content behind a Ja/Nej — spec Bilag 2 Mail 8 was
// amended for this). When House Host or catering is present, the block
// still carries the highlighted follow-up line (Bilag 2: "skal dette
// fremhæves tydeligt"); the note itself is the follow-up for notes.
export const adminNewBookingServiceHtml = (
  input: AdminNewBookingInput
): string => {
  const notes = input.bookingPracticalNotes?.trim() ?? "";
  const followUp: string[] = [];
  if (input.hasHouseHost) {
    followUp.push("House Host");
  }
  if (input.hasCatering) {
    followUp.push("forplejning");
  }
  const notice =
    followUp.length === 0
      ? ""
      : emailNotice(
          `Følg personligt op: ${text(followUp.join(", "))} er registreret.`
        );
  return (
    emailParagraph(
      `House Service: <strong>${jaNej(input.hasHouseService)}</strong><br>` +
        `House Host: <strong>${jaNej(input.hasHouseHost)}</strong><br>` +
        `Forplejning: <strong>${jaNej(input.hasCatering)}</strong><br>` +
        `Særlige praktiske oplysninger registreret: <strong>${jaNej(
          Boolean(notes)
        )}</strong>`
    ) +
    (notes
      ? emailParagraph(
          `Bemærkninger:<br><strong>${text(notes).replace(LINE_BREAK, "<br>")}</strong>`
        )
      : "") +
    notice
  );
};

export const adminNewBookingVariables = (
  input: AdminNewBookingInput
): Record<string, string> => ({
  ACTION_URL: input.actionUrl,
  BOOKER_EMAIL: text(input.bookerEmail),
  BOOKER_NAME: text(input.bookerName),
  BOOKER_PHONE: text(input.bookerPhone),
  BOOKING_DATE: text(formatDate(input.bookingStartAt)),
  BOOKING_HOURS: text(
    hoursFormatter.format(
      hoursBetween(new Date(input.bookingStartAt), new Date(input.bookingEndAt))
    )
  ),
  BOOKING_NUMBER: text(input.bookingNumber),
  BOOKING_PARTICIPANTS: text(String(input.bookingParticipantCount)),
  BOOKING_TIME: text(
    `${formatTime(input.bookingStartAt)}–${formatTime(input.bookingEndAt)}`
  ),
  COMPANY_DISPLAY_NAME: text(input.companyDisplayName),
  COMPANY_LEGAL_NAME: text(input.companyLegalName ?? "–"),
  PRICE_OVERVIEW_HTML: adminNewBookingPriceOverviewHtml(input),
  ROOM_NAME: text(input.roomName),
  SERVICE_HTML: adminNewBookingServiceHtml(input),
});

export const adminNewBooking = {
  html: emailLayout({
    body: `${emailHeading("Ny booking", "Der er oprettet en ny booking")}
${emailParagraph("Bookingnummer: <strong>{{{BOOKING_NUMBER}}}</strong>")}
${emailRule()}
${emailParagraph(
  "<strong>Virksomhed</strong><br>" +
    "Visningsnavn: {{{COMPANY_DISPLAY_NAME}}}<br>" +
    "Juridisk virksomhedsnavn: {{{COMPANY_LEGAL_NAME}}}"
)}
${emailParagraph(
  "<strong>Ansvarlig booker</strong><br>" +
    "Navn: {{{BOOKER_NAME}}}<br>" +
    "Arbejdsmail: {{{BOOKER_EMAIL}}}<br>" +
    "Mobilnummer: {{{BOOKER_PHONE}}}"
)}
${emailParagraph(
  "<strong>Booking</strong><br>" +
    "Lokale: {{{ROOM_NAME}}}<br>" +
    "Dato: {{{BOOKING_DATE}}}<br>" +
    "Tidspunkt: {{{BOOKING_TIME}}}<br>" +
    "Antal timer: {{{BOOKING_HOURS}}}<br>" +
    "Antal deltagere: {{{BOOKING_PARTICIPANTS}}}"
)}
${emailRule()}
{{{PRICE_OVERVIEW_HTML}}}
${emailRule()}
{{{SERVICE_HTML}}}
${emailRule()}
${emailButton("Åbn bookingen", "{{{ACTION_URL}}}")}`,
    preheader: "Der er oprettet en ny booking.",
    signOff: false,
    title: "Ny booking advisering til admin",
  }),
  subject:
    "Ny booking – {{{COMPANY_DISPLAY_NAME}}} · {{{ROOM_NAME}}} · {{{BOOKING_DATE}}}",
  variables: z.object({
    ACTION_URL: z.string(),
    BOOKER_EMAIL: z.string(),
    BOOKER_NAME: z.string(),
    BOOKER_PHONE: z.string(),
    BOOKING_DATE: z.string(),
    BOOKING_HOURS: z.string(),
    BOOKING_NUMBER: z.string(),
    BOOKING_PARTICIPANTS: z.string(),
    BOOKING_TIME: z.string(),
    COMPANY_DISPLAY_NAME: z.string(),
    COMPANY_LEGAL_NAME: z.string(),
    PRICE_OVERVIEW_HTML: z.string(),
    ROOM_NAME: z.string(),
    SERVICE_HTML: z.string(),
  }),
} satisfies EmailTemplate;
