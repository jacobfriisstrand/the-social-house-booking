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
  emailAmountTable,
  emailHeading,
  emailLayout,
  emailParagraph,
  emailRule,
} from "./layout.ts";
import type { EmailTemplate } from "./registry";

const text = (value: string): string => escapeHtml(value);

interface BookingCancelledDetailsInput {
  bookingNumber: string;
  cancelledAt: string;
  companyDisplayName: string;
  endAt: string;
  roomName: string;
  startAt: string;
}

export const bookingCancelledDetailsVariables = (
  input: BookingCancelledDetailsInput
): Record<string, string> => ({
  BOOKING_DATE: text(formatDate(input.startAt)),
  BOOKING_NUMBER: text(input.bookingNumber),
  BOOKING_TIME: text(`${formatTime(input.startAt)}–${formatTime(input.endAt)}`),
  CANCELLED_AT: text(formatDateTime(input.cancelledAt)),
  COMPANY_DISPLAY_NAME: text(input.companyDisplayName),
  ROOM_NAME: text(input.roomName),
});

// Fee, registered costs and their total as an amount table; Mail 9 uses it
// with its own total label.
export const cancellationAmountTable = (
  feeOre: number,
  addOnsOre: number,
  totalLabel: string
): string =>
  emailAmountTable([
    { amount: formatOre(feeOre), label: "Afbestillingsgebyr" },
    { amount: formatOre(addOnsOre), label: "Øvrige registrerede omkostninger" },
    { amount: formatOre(feeOre + addOnsOre), label: totalLabel, total: true },
  ]);

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
  return cancellationAmountTable(
    input.feeOre ?? 0,
    input.addOnsOre,
    "Samlet beløb til efterfølgende fakturering"
  );
};

export const bookingCancelledVariables = (
  input: BookingCancelledDetailsInput & {
    addOnsOre: number;
    feeOre: number | null;
  }
): Record<string, string> => ({
  ...bookingCancelledDetailsVariables(input),
  PRICE_OVERVIEW_HTML: bookingCancelledPriceOverviewHtml({
    addOnsOre: input.addOnsOre,
    feeOre: input.feeOre,
  }),
});

export const bookingCancelled = {
  html: emailLayout({
    body: `${emailHeading("Afbooking", "Jeres booking er afbooket")}
${emailParagraph("Kære {{{COMPANY_DISPLAY_NAME}}}")}
${emailParagraph("Jeres booking er nu afbooket, og lokalet er igen ledigt.")}
${emailRule()}
${emailParagraph(
  "<strong>Booking</strong><br>" +
    "Bookingnummer: <strong>{{{BOOKING_NUMBER}}}</strong><br>" +
    "Lokale: {{{ROOM_NAME}}}<br>" +
    "Dato: {{{BOOKING_DATE}}}<br>" +
    "Tidspunkt: {{{BOOKING_TIME}}}<br>" +
    "Afbooket: {{{CANCELLED_AT}}}"
)}
${emailRule()}
${emailParagraph("<strong>Prisoversigt</strong>", 6)}
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
