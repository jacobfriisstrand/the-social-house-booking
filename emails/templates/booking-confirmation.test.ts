import { describe, expect, it } from "vitest";
import { bookingChanged, bookingChangedVariables } from "./booking-changed";
import {
  bookingConfirmation,
  bookingConfirmationVariables,
  memberPriceOverviewHtml,
} from "./booking-confirmation";
import { bookingPriceTableHtml } from "./booking-sections";

const input = {
  addOnLines: [],
  bookerName: "Peter Pedersen",
  bookingNumber: "B-2610-0042",
  bookingUrl: "https://tsh.test/login?next=%2Fbookings%3Fbooking%3Dabc",
  companyDisplayName: "Rituals",
  discountPercent: 50,
  endAt: "2026-10-08T12:00:00+02:00",
  expectedTotalOre: 80_000,
  participantCount: 8,
  roomName: "Room of Power",
  roomPriceOre: 160_000,
  startAt: "2026-10-08T09:00:00+02:00",
};

const AMOUNT_CELL = /<td align="right"[^>]*>([^<]*)<\/td>/g;
const amountCells = (html: string): string[] =>
  [...html.matchAll(AMOUNT_CELL)].map((match) => match[1]);

describe("#11 booking price table", () => {
  it("right-aligns every amount and states VAT once", () => {
    const html = bookingPriceTableHtml(
      {
        ...input,
        addOnLines: [{ addonName: "Frokost", quantity: 8, totalOre: 120_000 }],
        expectedTotalOre: 200_000,
      },
      { discount: "Medlemsrabat", memberPrice: "Jeres lokalepris" }
    );
    expect(amountCells(html)).toEqual([
      "1.600,00 kr",
      "−800,00 kr",
      "800,00 kr",
      "1.200,00 kr",
      "2.000,00 kr",
    ]);
    expect(html).toContain("Tilvalg: Frokost (8 stk.)");
    expect(html.match(/ekskl\. moms/g)).toHaveLength(1);
  });

  it("shows the discount as the savings, so the rows add up", () => {
    // 10005 øre at 10 %: the member price rounds to 9005, so the discount
    // row must read 10,00 kr, not the separately rounded 10,01 kr.
    const html = bookingPriceTableHtml(
      { ...input, discountPercent: 10, roomPriceOre: 10_005 },
      { discount: "Rabat", memberPrice: "Lokaleleje efter rabat" }
    );
    expect(amountCells(html).slice(0, 3)).toEqual([
      "100,05 kr",
      "−10,00 kr",
      "90,05 kr",
    ]);
  });

  it("drops the discount and member price rows without a discount", () => {
    const html = bookingPriceTableHtml(
      { ...input, discountPercent: 0 },
      { discount: "Medlemsrabat", memberPrice: "Jeres lokalepris" }
    );
    expect(html).not.toContain("Medlemsrabat");
    expect(html).not.toContain("Jeres lokalepris");
  });
});

describe("#11 booking confirmation mail (Mail 4)", () => {
  it("uses the shared shell and carries exactly one CTA, the cancellation link", () => {
    expect(bookingConfirmation.html).toContain("Our house is your stage.");
    expect(bookingConfirmation.html.match(/href="/g)).toHaveLength(1);
    expect(bookingConfirmation.html).toContain('href="{{{BOOKING_URL}}}"');
  });

  it("carries the Bilag 2 sections", () => {
    for (const heading of [
      "Prisoversigt",
      "30 minutters buffer",
      "Forplejning og hospitality",
      "Hvis planerne ændrer sig",
    ]) {
      expect(bookingConfirmation.html).toContain(`<strong>${heading}</strong>`);
    }
    expect(bookingConfirmation.html).toContain(
      "Betaling sker ikke gennem bookingplatformen."
    );
  });

  it("highlights the savings only when there is a discount", () => {
    expect(memberPriceOverviewHtml(input)).toContain(
      "I har allerede sparet 800,00 kr på denne booking gennem jeres medlemsaftale."
    );
    expect(
      memberPriceOverviewHtml({ ...input, discountPercent: 0 })
    ).not.toContain("sparet");
  });

  it("escapes every echoed value", () => {
    const variables = bookingConfirmationVariables({
      ...input,
      bookerName: "<b>Peter</b>",
      companyDisplayName: "Rituals & Sons",
      roomName: "Room <script>",
    });
    expect(variables.COMPANY_DISPLAY_NAME).toBe("Rituals &amp; Sons");
    expect(variables.ROOM_NAME).toBe("Room &lt;script&gt;");
    expect(variables.BOOKER_NAME).toBe("&lt;b&gt;Peter&lt;/b&gt;");
  });

  it("produces exactly the variables the template declares", () => {
    const variables = bookingConfirmationVariables(input);
    expect(bookingConfirmation.variables.parse(variables)).toEqual(variables);
    expect(variables.BOOKING_TIME).toBe("09:00–12:00");
  });
});

describe("#11 booking changed mail (Mail 6)", () => {
  it("carries one CTA and the updated price overview", () => {
    expect(bookingChanged.html.match(/href="/g)).toHaveLength(1);
    expect(bookingChanged.html).toContain(
      "<strong>Opdateret prisoversigt</strong>"
    );
    expect(bookingChanged.html).toContain(
      "Den tidligere booking er erstattet af oplysningerne ovenfor."
    );
  });

  it("lists add-ons in the booking block only when there are some", () => {
    const withAddOns = bookingChangedVariables({
      ...input,
      addOnLines: [{ addonName: "House Host", quantity: 1, totalOre: 50_000 }],
    });
    expect(withAddOns.BOOKING_DETAILS_HTML).toContain("Tilvalg: House Host");
    expect(bookingChangedVariables(input).BOOKING_DETAILS_HTML).not.toContain(
      "Tilvalg"
    );
  });

  it("produces exactly the variables the template declares", () => {
    const variables = bookingChangedVariables(input);
    expect(bookingChanged.variables.parse(variables)).toEqual(variables);
  });
});
