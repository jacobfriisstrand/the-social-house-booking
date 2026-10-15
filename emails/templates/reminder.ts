// Bilag 2, Mail 5 — copy verbatim from docs/spec/bilag-2-mailtekster.md.
// Sent by the hourly job (app/api/jobs/send-reminders/route.ts) to the
// booker's work email 23–24 hours before a confirmed booking starts. The
// add-on and practical-information lines are hidden when empty ("empty
// sections hidden"), so the booking block is one HTML variable that is never
// empty. "Praktiske oplysninger" is the room's practical notes (equipment,
// access) — never the booker's own notes, which may hold allergies (Bilag 2,
// Mail 8). Resend inserts {{{KEY}}} unescaped, so every value is escaped in
// reminderVariables() — the hook's escapeHtml is the one implementation.

import { z } from "zod";
import { formatDate, formatOre } from "../../lib/format.ts";
import { escapeHtml } from "../../supabase/functions/send-email/handler.ts";
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

const LINE_BREAK = /\r?\n/g;

export interface ReminderAddOnLine {
  addonName: string | null;
  quantity: number;
}

export interface ReminderInput {
  addOnLines: ReminderAddOnLine[];
  bookerName: string;
  bookingNumber: string;
  bookingUrl: string;
  cancellationFeeOre: number;
  companyDisplayName: string;
  endAt: string;
  participantCount: number;
  roomName: string;
  roomPracticalNotes: string | null;
  startAt: string;
}

const addOnNames = (lines: ReminderAddOnLine[]): string =>
  lines
    .flatMap(({ addonName, quantity }) =>
      addonName ? [addOnLabel({ addonName, quantity })] : []
    )
    .join(", ");

// The BOOKING section: the shared lines, then "Valgte tilvalg" and
// "Praktiske oplysninger" only when there is something to show.
export const reminderDetailsHtml = (input: ReminderInput): string => {
  const lines = bookingDetailLines(input);
  const addOns = addOnNames(input.addOnLines);
  if (addOns) {
    lines.push(`Valgte tilvalg: ${addOns}`);
  }
  const notes = input.roomPracticalNotes?.trim();
  if (notes) {
    lines.push(
      `Praktiske oplysninger: ${text(notes).replace(LINE_BREAK, "<br>")}`
    );
  }
  return emailParagraph(lines.join("<br>"));
};

export const reminderVariables = (
  input: ReminderInput
): Record<string, string> => ({
  BOOKING_DATE: text(formatDate(input.startAt)),
  BOOKING_DETAILS_HTML: reminderDetailsHtml(input),
  BOOKING_URL: text(input.bookingUrl),
  CANCELLATION_FEE: text(formatOre(input.cancellationFeeOre)),
  COMPANY_DISPLAY_NAME: text(input.companyDisplayName),
  ROOM_NAME: text(input.roomName),
});

export const reminder = {
  html: emailLayout({
    body: `${emailHeading("Påmindelse", "Jeres møde nærmer sig")}
${emailParagraph("Kære {{{COMPANY_DISPLAY_NAME}}}")}
${emailParagraph("Jeres møde i The Social House nærmer sig.")}
${emailRule()}
{{{BOOKING_DETAILS_HTML}}}
${emailRule()}
${emailParagraph(
  "Hvis planerne har ændret sig, beder vi jer afbooke lokalet, så det igen kan blive tilgængeligt for andre."
)}
<tr><td style="padding:4px 0 24px;">${emailButton("Se eller afbook bookingen", "{{{BOOKING_URL}}}")}</td></tr>
${emailParagraph(
  "Hvis I afbooker nu, er afbestillingsgebyret:<br><strong>{{{CANCELLATION_FEE}}} ekskl. moms</strong>"
)}
${emailParagraph(
  "Det endelige gebyr beregnes på det præcise tidspunkt, hvor afbookingen bekræftes."
)}
${emailParagraph(
  "Afbestillingsreglerne er:<br>" +
    "• Mere end 72 timer før: Intet afbestillingsgebyr.<br>" +
    "• Fra og med 24 timer til og med 72 timer før: 50 %.<br>" +
    "• Mindre end 24 timer før: 100 %."
)}
${emailParagraph(
  "Eventuelle allerede påløbne udgifter til forplejning eller service behandles særskilt."
)}
${emailParagraph(
  "Så er rammen sat. Vi håber, I får et rigtig godt og konstruktivt møde.",
  0
)}`,
    preheader: "Jeres møde i The Social House nærmer sig.",
    title: "Påmindelse om jeres møde",
  }),
  subject: "Påmindelse om {{{ROOM_NAME}}} den {{{BOOKING_DATE}}}",
  variables: z.object({
    BOOKING_DATE: z.string(),
    BOOKING_DETAILS_HTML: z.string(),
    BOOKING_URL: z.string(),
    CANCELLATION_FEE: z.string(),
    COMPANY_DISPLAY_NAME: z.string(),
    ROOM_NAME: z.string(),
  }),
} satisfies EmailTemplate;
