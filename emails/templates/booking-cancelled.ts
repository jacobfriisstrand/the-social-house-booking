// Bilag 2, Mail 7 — copy verbatim from docs/spec/bilag-2-mailtekster.md.
// Sent by the cancellation flow (#5) to the booker's work email the moment
// the cancellation registers. The price section shows the fee and the
// registered costs; with neither, it collapses to the fallback line
// (Bilag 2: "Hvis der ikke er et afbestillingsgebyr eller andre påløbne
// omkostninger"). Resend inserts {{{KEY}}} unescaped, so every value is
// escaped in bookingCancelledVariables() — the hook's escapeHtml is the one
// implementation.

import { z } from "zod";
import {
  formatDate,
  formatDateTime,
  formatOre,
  formatTime,
} from "../../lib/format.ts";
import { escapeHtml } from "../../supabase/functions/send-email/handler.ts";
import {
  emailHeading,
  emailLayout,
  emailParagraph,
  emailRule,
} from "./layout.ts";
import type { EmailTemplate } from "./registry";

const text = (value: string): string => escapeHtml(value);

// The PRISOVERSIGT section: itemized when there is a fee or registered
// costs, otherwise the Bilag 2 fallback line. Built here — with the copy —
// so the action stays thin; the amounts are already escaped by formatOre.
export const bookingCancelledPriceOverviewHtml = (input: {
  addOnsOre: number;
  feeOre: number | null;
}): string => {
  const charged = (input.feeOre ?? 0) + input.addOnsOre;
  if (charged === 0) {
    return emailParagraph(
      "Der er ikke registreret et beløb til efterfølgende fakturering."
    );
  }
  const feeOre = input.feeOre ?? 0;
  return emailParagraph(
    `Afbestillingsgebyr: <strong>${formatOre(feeOre)}</strong> ekskl. moms<br>` +
      `Øvrige registrerede omkostninger: ${formatOre(input.addOnsOre)} ekskl. moms<br>` +
      `Samlet beløb til efterfølgende fakturering: <strong>${formatOre(charged)}</strong> ekskl. moms`
  );
};

export const bookingCancelledVariables = (input: {
  addOnsOre: number;
  bookingNumber: string;
  cancelledAt: string;
  companyDisplayName: string;
  endAt: string;
  feeOre: number | null;
  roomName: string;
  startAt: string;
}): Record<string, string> => ({
  BOOKING_DATE: text(formatDate(input.startAt)),
  BOOKING_NUMBER: text(input.bookingNumber),
  BOOKING_TIME: text(`${formatTime(input.startAt)}–${formatTime(input.endAt)}`),
  CANCELLED_AT: text(formatDateTime(input.cancelledAt)),
  COMPANY_DISPLAY_NAME: text(input.companyDisplayName),
  PRICE_OVERVIEW_HTML: bookingCancelledPriceOverviewHtml({
    addOnsOre: input.addOnsOre,
    feeOre: input.feeOre,
  }),
  ROOM_NAME: text(input.roomName),
});

export const bookingCancelled = {
  html: emailLayout({
    body: `${emailHeading("Afbooking", "Jeres booking er afbooket")}
${emailParagraph(
  "Kære {{{COMPANY_DISPLAY_NAME}}}. Jeres booking er nu afbooket, og lokalet er igen ledigt."
)}
${emailParagraph(
  "<strong>Bookingnummer:</strong> {{{BOOKING_NUMBER}}}<br>" +
    "<strong>Lokale:</strong> {{{ROOM_NAME}}}<br>" +
    "<strong>Dato:</strong> {{{BOOKING_DATE}}}<br>" +
    "<strong>Tidspunkt:</strong> {{{BOOKING_TIME}}}<br>" +
    "<strong>Afbooket:</strong> {{{CANCELLED_AT}}}"
)}
${emailRule()}
{{{PRICE_OVERVIEW_HTML}}}
${emailRule()}
${emailParagraph(
  "Har I spørgsmål til afbookingen eller beløbet, er I velkomne til at kontakte os på booking@thesocialhouse.dk."
)}`,
    preheader: "Jeres booking er nu afbooket, og lokalet er igen ledigt.",
    title: "Jeres booking er afbooket",
  }),
  subject: "Jeres booking er afbooket – {{{ROOM_NAME}}} den {{{BOOKING_DATE}}}",
  variables: z.object({
    BOOKING_DATE: z.string(),
    BOOKING_NUMBER: z.string(),
    BOOKING_TIME: z.string(),
    CANCELLED_AT: z.string(),
    COMPANY_DISPLAY_NAME: z.string(),
    PRICE_OVERVIEW_HTML: z.string(),
    ROOM_NAME: z.string(),
  }),
} satisfies EmailTemplate;
