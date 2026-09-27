// Bilag 2, Mail 8 — copy verbatim from docs/spec/bilag-2-mailtekster.md.
// Sent by the app to ADMIN_NOTIFY_EMAIL whenever a booking is confirmed —
// by the member's code or by an admin booking on a company's behalf
// (ADR-0023). Allergies and other person-sensitive data are never echoed;
// the mail only states whether special practical information is registered
// (Bilag 2: "De konkrete oplysninger læses efter login i adminpanelet").
// Resend inserts {{{KEY}}} unescaped, so every value is escaped in
// adminNewBookingVariables() — the hook's escapeHtml is the one
// implementation.

import { z } from "zod";
import { discountAmountOre, memberPriceOre } from "../../lib/domain/pricing.ts";
import { hoursBetween } from "../../lib/domain/time.ts";
import { formatDate, formatOre, formatTime } from "../../lib/format.ts";
import { escapeHtml } from "../../supabase/functions/send-email/handler.ts";
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

const hoursFormatter = new Intl.NumberFormat("da-DK", {
  maximumFractionDigits: 2,
});

export interface AdminNewBookingAddOnLine {
  addonName: string | null;
  quantity: number;
  totalOre: number;
}

export interface AdminNewBookingInput {
  actionUrl: string;
  addOnLines: AdminNewBookingAddOnLine[];
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

// The PRISOVERSIGT section: the discount line only exists when there is a
// discount, and the add-on list only when there are add-ons ("empty
// sections hidden"). Built here — with the copy — so the sending module
// stays thin.
export const adminNewBookingPriceOverviewHtml = (
  input: AdminNewBookingInput
): string => {
  // booking_room_price_ore is the frozen room rental for the booked hours
  // (ADR-0005) — read it directly, no second multiply by the hours.
  const roomTotal = input.bookingRoomPriceOre;
  const member = memberPriceOre(roomTotal, input.discountPercent);
  const lines: string[] = [
    `Normal lokalepris: <strong>${formatOre(roomTotal)}</strong> ekskl. moms`,
  ];
  if (input.discountPercent > 0) {
    lines.push(
      `Rabat: ${text(String(input.discountPercent))} % / ${formatOre(
        discountAmountOre(roomTotal, input.discountPercent)
      )} ekskl. moms`
    );
  }
  lines.push(
    `Lokaleleje efter rabat: <strong>${formatOre(member)}</strong> ekskl. moms`
  );
  if (input.addOnLines.length > 0) {
    const addOnLines = input.addOnLines
      .map((line) =>
        line.addonName
          ? `${text(line.addonName)}${
              line.quantity > 1 ? ` (${text(String(line.quantity))} stk.)` : ""
            }: ${formatOre(line.totalOre)} ekskl. moms`
          : null
      )
      .filter((line): line is string => line !== null);
    if (addOnLines.length > 0) {
      lines.push(`Tilvalg: ${addOnLines.join("<br>")}`);
    }
  }
  lines.push(
    `Samlet forventet beløb: <strong>${formatOre(
      input.bookingExpectedTotalOre
    )}</strong> ekskl. moms`
  );
  return emailParagraph(lines.join("<br>"));
};

// SERVICE OG PRAKTISKE BEHOV: only the fact that special information is
// registered — never its content. When House Host, catering or special
// information is present, the block carries the highlighted follow-up line
// (Bilag 2: "skal dette fremhæves tydeligt").
export const adminNewBookingServiceHtml = (
  input: AdminNewBookingInput
): string => {
  const followUp: string[] = [];
  if (input.hasHouseHost) {
    followUp.push("House Host");
  }
  if (input.hasCatering) {
    followUp.push("forplejning");
  }
  if (input.bookingPracticalNotes) {
    followUp.push("særlige praktiske oplysninger");
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
          Boolean(input.bookingPracticalNotes)
        )}</strong>`
    ) + notice
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
