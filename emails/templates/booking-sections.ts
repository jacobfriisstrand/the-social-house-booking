// The booking sections the mails share, laid out like Mail 8 (#11).
//
// The booking block of Mail 5 and Mail 6: a bold "Booking" heading, then
// "Label: value" lines with the booking number in bold. Each mail appends
// its own optional lines.
//
// The booking price overview shared by Mail 4, Mail 6 and Mail 8: normal
// room price, the discount and the member price (only when there is a
// discount, "empty sections hidden"), one row per add-on, and the expected
// total. The discount row is the savings — normal price minus member price —
// so the rows always add up (lib/domain/pricing.ts). The two discount labels
// differ between the member mails and the admin advisory (Bilag 2).
import { memberPriceOre, savingsOre } from "../../lib/domain/pricing.ts";
import { formatDate, formatOre, formatTime } from "../../lib/format.ts";
import { escapeHtml } from "../../supabase/functions/send-email/handler.ts";
import { type EmailAmountRow, emailAmountTable } from "./layout.ts";

export interface BookingDetailsInput {
  bookerName: string;
  bookingNumber: string;
  endAt: string;
  participantCount: number;
  roomName: string;
  startAt: string;
}

export const bookingDetailLines = (input: BookingDetailsInput): string[] => [
  "<strong>Booking</strong>",
  `Bookingnummer: <strong>${escapeHtml(input.bookingNumber)}</strong>`,
  `Lokale: ${escapeHtml(input.roomName)}`,
  `Dato: ${escapeHtml(formatDate(input.startAt))}`,
  `Tidspunkt: ${escapeHtml(`${formatTime(input.startAt)}–${formatTime(input.endAt)}`)}`,
  `Antal deltagere: ${input.participantCount}`,
  `Ansvarlig booker: ${escapeHtml(input.bookerName)}`,
];

export interface BookingPriceAddOnLine {
  addonName: string | null;
  quantity: number;
  totalOre: number;
}

export interface BookingPriceInput {
  addOnLines: BookingPriceAddOnLine[];
  discountPercent: number;
  expectedTotalOre: number;
  // The frozen room rental for the booked hours (ADR-0005).
  roomPriceOre: number;
}

export interface BookingPriceLabels {
  discount: string;
  memberPrice: string;
}

// "Frokost (8 stk.)" — the add-on name with its quantity when above one.
export const addOnLabel = (line: {
  addonName: string;
  quantity: number;
}): string =>
  `${escapeHtml(line.addonName)}${line.quantity > 1 ? ` (${line.quantity} stk.)` : ""}`;

const addOnRows = (lines: BookingPriceAddOnLine[]): EmailAmountRow[] =>
  lines.flatMap(({ addonName, quantity, totalOre }) =>
    addonName
      ? [
          {
            amount: formatOre(totalOre),
            label: `Tilvalg: ${addOnLabel({ addonName, quantity })}`,
          },
        ]
      : []
  );

export const bookingPriceTableHtml = (
  input: BookingPriceInput,
  labels: BookingPriceLabels
): string => {
  const rows: EmailAmountRow[] = [
    { amount: formatOre(input.roomPriceOre), label: "Normal lokalepris" },
  ];
  if (input.discountPercent > 0) {
    rows.push(
      {
        amount: `−${formatOre(savingsOre(input.roomPriceOre, input.discountPercent))}`,
        label: `${labels.discount} (${input.discountPercent} %)`,
      },
      {
        amount: formatOre(
          memberPriceOre(input.roomPriceOre, input.discountPercent)
        ),
        label: labels.memberPrice,
      }
    );
  }
  rows.push(...addOnRows(input.addOnLines), {
    amount: formatOre(input.expectedTotalOre),
    label: "Samlet forventet beløb",
    total: true,
  });
  return emailAmountTable(rows);
};
