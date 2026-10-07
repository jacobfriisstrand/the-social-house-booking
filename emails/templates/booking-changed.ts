// Bilag 2, Mail 6 — copy verbatim from docs/spec/bilag-2-mailtekster.md,
// laid out like Mail 4. Sent to the booker's work email when The Social
// House has changed a booking as agreed with the company. No flow changes a
// booking yet, so nothing sends it; the template is ready for the admin
// change flow. The add-on line is hidden when there are none ("empty
// sections hidden"), so the booking block is one never-empty HTML variable.
// Resend inserts {{{KEY}}} unescaped, so every value is escaped in
// bookingChangedVariables() — the hook's escapeHtml is the one
// implementation.

import { z } from "zod";
import { formatDate } from "../../lib/format.ts";
import { escapeHtml } from "../../supabase/functions/send-email/handler.ts";
import {
  type BookingConfirmationInput,
  memberPriceOverviewHtml,
} from "./booking-confirmation.ts";
import { addOnLabel, bookingDetailLines } from "./booking-sections.ts";
import {
  emailButton,
  emailHeading,
  emailLayout,
  emailParagraph,
  emailRule,
} from "./layout.ts";
import type { EmailTemplate } from "./registry";

const text = (value: string): string => escapeHtml(value);

// The BOOKING section: the fixed lines, then "Tilvalg" only when the
// booking has add-ons.
export const bookingChangedDetailsHtml = (
  input: BookingConfirmationInput
): string => {
  const lines = bookingDetailLines(input);
  const addOns = input.addOnLines.flatMap(({ addonName, quantity }) =>
    addonName ? [addOnLabel({ addonName, quantity })] : []
  );
  if (addOns.length > 0) {
    lines.push(`Tilvalg: ${addOns.join(", ")}`);
  }
  return emailParagraph(lines.join("<br>"));
};

export const bookingChangedVariables = (
  input: BookingConfirmationInput
): Record<string, string> => ({
  BOOKING_DATE: text(formatDate(input.startAt)),
  BOOKING_DETAILS_HTML: bookingChangedDetailsHtml(input),
  BOOKING_URL: text(input.bookingUrl),
  COMPANY_DISPLAY_NAME: text(input.companyDisplayName),
  PRICE_OVERVIEW_HTML: memberPriceOverviewHtml(input),
  ROOM_NAME: text(input.roomName),
});

export const bookingChanged = {
  html: emailLayout({
    body: `${emailHeading("Ændring", "Jeres booking er opdateret")}
${emailParagraph("Kære {{{COMPANY_DISPLAY_NAME}}}")}
${emailParagraph("Vi har nu opdateret jeres booking som aftalt.")}
${emailRule()}
{{{BOOKING_DETAILS_HTML}}}
${emailRule()}
${emailParagraph("<strong>Opdateret prisoversigt</strong>", 6)}
{{{PRICE_OVERVIEW_HTML}}}
${emailParagraph("Den tidligere booking er erstattet af oplysningerne ovenfor.")}
<tr><td style="padding:4px 0 24px;">${emailButton("Se eller afbook bookingen", "{{{BOOKING_URL}}}")}</td></tr>
${emailParagraph(
  "Hvis noget ikke stemmer med det, vi har aftalt, er I velkomne til at kontakte os på booking@thesocialhouse.dk."
)}
${emailRule()}
${emailParagraph(
  "Så er rammen sat. Vi håber, I får et rigtig godt og konstruktivt møde.",
  0
)}`,
    preheader: "Vi har nu opdateret jeres booking som aftalt.",
    title: "Jeres booking er opdateret",
  }),
  subject:
    "Jeres booking er opdateret – {{{ROOM_NAME}}} den {{{BOOKING_DATE}}}",
  variables: z.object({
    BOOKING_DATE: z.string(),
    BOOKING_DETAILS_HTML: z.string(),
    BOOKING_URL: z.string(),
    COMPANY_DISPLAY_NAME: z.string(),
    PRICE_OVERVIEW_HTML: z.string(),
    ROOM_NAME: z.string(),
  }),
} satisfies EmailTemplate;
