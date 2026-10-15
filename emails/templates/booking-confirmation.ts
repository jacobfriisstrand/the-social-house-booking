// Bilag 2, Mail 4 — copy verbatim from docs/spec/bilag-2-mailtekster.md,
// laid out like Mail 8: bold section headings, amounts in a right-aligned
// table. Sent to the booker's work email when a booking is confirmed — by the
// member's code or by an admin booking on the company's behalf (ADR-0023);
// the once-only index on outbound_emails keeps it to one per booking. The
// savings notice exists only when the company got a discount ("Besparelsen
// skal fremhæves tydeligt … Afsnittet vises kun, når virksomheden faktisk
// har fået rabat"), so it travels inside the never-empty price variable.
// Resend inserts {{{KEY}}} unescaped, so every value is escaped in
// bookingConfirmationVariables() — the hook's escapeHtml is the one
// implementation.

import { z } from "zod";
import { savingsOre } from "../../lib/domain/pricing.ts";
import { formatDate, formatOre, formatTime } from "../../lib/format.ts";
import { escapeHtml } from "../../supabase/functions/send-email/handler.ts";
import {
  type BookingPriceInput,
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

export const MEMBER_PRICE_LABELS = {
  discount: "Medlemsrabat",
  memberPrice: "Jeres lokalepris",
};

// The price table, then — only with a discount — the highlighted savings.
// Mail 6 shows the same section under its own heading.
export const memberPriceOverviewHtml = (input: BookingPriceInput): string => {
  const table = bookingPriceTableHtml(input, MEMBER_PRICE_LABELS);
  const saved = savingsOre(input.roomPriceOre, input.discountPercent);
  if (saved <= 0) {
    return table;
  }
  return (
    table +
    emailNotice(
      `<strong>I har allerede sparet ${formatOre(saved)} på denne booking gennem jeres medlemsaftale.</strong>`
    )
  );
};

export interface BookingConfirmationInput extends BookingPriceInput {
  bookerName: string;
  bookingNumber: string;
  bookingUrl: string;
  companyDisplayName: string;
  endAt: string;
  participantCount: number;
  roomName: string;
  startAt: string;
}

export const bookingConfirmationVariables = (
  input: BookingConfirmationInput
): Record<string, string> => ({
  BOOKER_NAME: text(input.bookerName),
  BOOKING_DATE: text(formatDate(input.startAt)),
  BOOKING_NUMBER: text(input.bookingNumber),
  BOOKING_PARTICIPANTS: text(String(input.participantCount)),
  BOOKING_TIME: text(`${formatTime(input.startAt)}–${formatTime(input.endAt)}`),
  BOOKING_URL: text(input.bookingUrl),
  COMPANY_DISPLAY_NAME: text(input.companyDisplayName),
  PRICE_OVERVIEW_HTML: memberPriceOverviewHtml(input),
  ROOM_NAME: text(input.roomName),
});

const CANCELLATION_RULES =
  "• Mere end 72 timer før: Intet afbestillingsgebyr.<br>" +
  "• Fra og med 24 timer til og med 72 timer før: 50 %.<br>" +
  "• Mindre end 24 timer før: 100 %.";

export const bookingConfirmation = {
  html: emailLayout({
    body: `${emailHeading("Bookingbekræftelse", "{{{ROOM_NAME}}} er reserveret til jer")}
${emailParagraph("Kære {{{COMPANY_DISPLAY_NAME}}}")}
${emailParagraph("{{{ROOM_NAME}}} er nu reserveret til jer.")}
${emailParagraph("Her finder I de samlede oplysninger om jeres booking.")}
${emailRule()}
${emailParagraph(
  "<strong>Booking</strong><br>" +
    "Bookingnummer: <strong>{{{BOOKING_NUMBER}}}</strong><br>" +
    "Lokale: {{{ROOM_NAME}}}<br>" +
    "Dato: {{{BOOKING_DATE}}}<br>" +
    "Tidspunkt: {{{BOOKING_TIME}}}<br>" +
    "Antal deltagere: {{{BOOKING_PARTICIPANTS}}}<br>" +
    "Ansvarlig booker: {{{BOOKER_NAME}}}"
)}
${emailRule()}
${emailParagraph("<strong>Prisoversigt</strong>", 6)}
{{{PRICE_OVERVIEW_HTML}}}
${emailParagraph(
  "Beløbet er det forventede faktureringsgrundlag. Betaling sker ikke gennem bookingplatformen. The Social House fakturerer bookingen efterfølgende."
)}
${emailRule()}
${emailParagraph(
  "<strong>30 minutters buffer</strong><br>" +
    "Efter det bookede tidsrum reserverer vi automatisk 30 minutter uden beregning."
)}
${emailParagraph(
  "Tiden skal bruges til at afslutte mødet, lufte ud og bringe lokalet tilbage til den standard, som kendetegner The Social House, så det står indbydende og klar til det næste møde."
)}
${emailParagraph(
  "Bemærk: Det bookede møde slutter på det angivne sluttidspunkt. Den indlagte buffer er derfor ikke en forlængelse af selve mødet."
)}
${emailParagraph(
  "Hvis I har valgt House Service eller House Host, sørger vi for klargøring og afslutning som en del af den valgte service."
)}
${emailParagraph(
  "Hvis service ikke er valgt, beder vi jer:<br>" +
    "• Stille borde og stole tilbage.<br>" +
    "• Fjerne egne materialer.<br>" +
    "• Fjerne service og affald.<br>" +
    "• Lufte lokalet ud.<br>" +
    "• Efterlade lokalet indbydende og klar til det næste møde."
)}
${emailParagraph(
  "Almindelig rengøring og støvsugning tager huset sig naturligvis af."
)}
${emailParagraph(
  "Hvis lokalet ikke afleveres som aftalt, kan dokumenteret ekstra tidsforbrug og eventuelle eksterne udgifter blive tilføjet til fakturaen."
)}
${emailRule()}
${emailParagraph(
  "<strong>Forplejning og hospitality</strong><br>" +
    "Kaffe, te, vand, frokost, anden forplejning og hospitality reserveres gennem The Social House."
)}
${emailParagraph(
  "Vær opmærksom på, at det ikke er tilladt at medbringe egne mad- og drikkevarer, ekstern catering eller eksternt hospitalitypersonale, medmindre andet er aftalt med os på forhånd."
)}
${emailRule()}
${emailParagraph(
  "<strong>Hvis planerne ændrer sig</strong><br>" +
    "I kan se eller afbooke bookingen her:"
)}
<tr><td style="padding:4px 0 24px;">${emailButton("Se eller afbook bookingen", "{{{BOOKING_URL}}}")}</td></tr>
${emailParagraph(
  `Afbestillingsgebyret beregnes ud fra jeres lokalepris efter medlemsrabat:<br>${CANCELLATION_RULES}`
)}
${emailParagraph(
  "Alle beløb vises ekskl. moms. Eventuelle allerede påløbne udgifter til forplejning eller service behandles særskilt."
)}
${emailRule()}
${emailParagraph(
  "Så er rammen sat. Vi håber, I får et rigtig godt og konstruktivt møde.",
  0
)}`,
    preheader: "{{{ROOM_NAME}}} er nu reserveret til jer.",
    title: "Bookingbekræftelse",
  }),
  subject: "{{{ROOM_NAME}}} er reserveret til jer den {{{BOOKING_DATE}}}",
  variables: z.object({
    BOOKER_NAME: z.string(),
    BOOKING_DATE: z.string(),
    BOOKING_NUMBER: z.string(),
    BOOKING_PARTICIPANTS: z.string(),
    BOOKING_TIME: z.string(),
    BOOKING_URL: z.string(),
    COMPANY_DISPLAY_NAME: z.string(),
    PRICE_OVERVIEW_HTML: z.string(),
    ROOM_NAME: z.string(),
  }),
} satisfies EmailTemplate;
