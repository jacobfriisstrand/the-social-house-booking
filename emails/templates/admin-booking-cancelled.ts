// Bilag 2, Mail 9 — copy verbatim from docs/spec/bilag-2-mailtekster.md.
// Sent by the cancellation flow (#5) to ADMIN_NOTIFY_EMAIL whenever a
// booking is cancelled, with the fee and the invoicing basis. This notice
// intentionally has no action button.
// Resend inserts {{{KEY}}} unescaped, so every value is escaped in
// bookingCancelledAdminVariables() — the hook's escapeHtml is the one
// implementation.

import { z } from "zod";
import { formatOre } from "../../lib/format.ts";
import { escapeHtml } from "../../supabase/functions/send-email/handler.ts";
import { bookingCancelledDetailsVariables } from "./booking-cancelled.ts";
import {
  emailHeading,
  emailLayout,
  emailParagraph,
  emailRule,
} from "./layout.ts";
import type { EmailTemplate } from "./registry";

const text = (value: string): string => escapeHtml(value);

// Same section as Mail 7 with the invoicing-basis wording (Bilag 2):
// itemized when there is a fee or registered costs, otherwise the fallback
// line. Built here so the action stays thin.
export const bookingCancelledAdminVariables = (input: {
  addOnsOre: number;
  bookerName: string;
  bookingNumber: string;
  cancelledAt: string;
  companyDisplayName: string;
  endAt: string;
  feeOre: number | null;
  roomName: string;
  startAt: string;
}): Record<string, string> => {
  const feeOre = input.feeOre ?? 0;
  const charged = feeOre + input.addOnsOre;
  return {
    ...bookingCancelledDetailsVariables(input),
    BOOKER_NAME: text(input.bookerName),
    PRICE_OVERVIEW_HTML:
      charged === 0
        ? emailParagraph(
            "Der er ikke registreret et beløb til faktureringsgrundlaget."
          )
        : emailParagraph(
            `Afbestillingsgebyr: <strong>${formatOre(feeOre)}</strong> ekskl. moms<br>` +
              `Øvrige registrerede omkostninger: ${formatOre(input.addOnsOre)} ekskl. moms<br>` +
              `Samlet beløb til faktureringsgrundlaget: <strong>${formatOre(charged)}</strong> ekskl. moms`
          ),
  };
};

export const bookingCancelledAdmin = {
  html: emailLayout({
    body: `${emailHeading("Afbooking", "En booking er blevet afbooket")}
${emailParagraph(
  "<strong>Bookingnummer:</strong> {{{BOOKING_NUMBER}}}<br>" +
    "<strong>Virksomhed:</strong> {{{COMPANY_DISPLAY_NAME}}}<br>" +
    "<strong>Ansvarlig booker:</strong> {{{BOOKER_NAME}}}<br>" +
    "<strong>Lokale:</strong> {{{ROOM_NAME}}}<br>" +
    "<strong>Dato:</strong> {{{BOOKING_DATE}}}<br>" +
    "<strong>Tidspunkt:</strong> {{{BOOKING_TIME}}}<br>" +
    "<strong>Afbooket:</strong> {{{CANCELLED_AT}}}"
)}
${emailRule()}
{{{PRICE_OVERVIEW_HTML}}}
${emailRule()}
${emailParagraph("Lokalet og den efterfølgende buffer er frigivet.")}`,
    preheader:
      "En booking er blevet afbooket; lokalet og bufferen er frigivet.",
    signOff: false,
    title: "Afbooking advisering til admin",
  }),
  subject:
    "Afbooking – {{{COMPANY_DISPLAY_NAME}}} · {{{ROOM_NAME}}} · {{{BOOKING_DATE}}}",
  variables: z.object({
    BOOKER_NAME: z.string(),
    BOOKING_DATE: z.string(),
    BOOKING_NUMBER: z.string(),
    BOOKING_TIME: z.string(),
    CANCELLED_AT: z.string(),
    COMPANY_DISPLAY_NAME: z.string(),
    PRICE_OVERVIEW_HTML: z.string(),
    ROOM_NAME: z.string(),
  }),
} satisfies EmailTemplate;
