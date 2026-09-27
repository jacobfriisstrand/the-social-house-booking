import { describe, expect, it } from "vitest";
import {
  adminNewBooking,
  adminNewBookingPriceOverviewHtml,
  adminNewBookingServiceHtml,
  adminNewBookingVariables,
} from "./admin-new-booking";

const base = {
  actionUrl: "https://tsh.test/admin/bookings",
  addOnLines: [],
  bookerEmail: "peter@rituals.dk",
  bookerName: "Peter Pedersen",
  bookerPhone: "+45 2010 2030",
  bookingEndAt: "2026-10-01T12:00:00+02:00",
  bookingExpectedTotalOre: 80_000,
  bookingNumber: "B-2609-0151",
  bookingParticipantCount: 6,
  bookingPracticalNotes: null,
  bookingRoomPriceOre: 160_000,
  bookingStartAt: "2026-10-01T10:00:00+02:00",
  companyDisplayName: "Rituals",
  companyLegalName: "Rituals ApS",
  discountPercent: 50,
  hasCatering: false,
  hasHouseHost: false,
  hasHouseService: false,
  roomName: "Room of Power",
};

describe("#5 admin new-booking mail", () => {
  it("uses the shared shell and carries exactly one CTA", () => {
    expect(adminNewBooking.html).toContain("Our house is your stage.");
    expect(
      adminNewBooking.html.match(/href="\{\{\{ACTION_URL\}\}\}/g)
    ).toHaveLength(1);
  });

  it("shows the discount line only when there is a discount", () => {
    const withDiscount = adminNewBookingPriceOverviewHtml(base);
    expect(withDiscount).toContain("Rabat: 50 % / 800,00");
    expect(withDiscount).toContain("Samlet forventet beløb");

    const withoutDiscount = adminNewBookingPriceOverviewHtml({
      ...base,
      addOnLines: [{ addonName: "Lunch", quantity: 6, totalOre: 30_000 }],
      bookingExpectedTotalOre: 110_000,
      discountPercent: 0,
    });
    expect(withoutDiscount).not.toContain("Rabat:");
    expect(withoutDiscount).toContain("Tilvalg: Lunch (6 stk.): 300,00");
  });

  it("reports service flags without echoing practical notes", () => {
    const flagged = adminNewBookingServiceHtml({
      ...base,
      bookingPracticalNotes: "Allergi mod nødder",
      hasHouseHost: true,
    });
    expect(flagged).toContain("House Host: <strong>Ja</strong>");
    expect(flagged).toContain(
      "Særlige praktiske oplysninger registreret: <strong>Ja</strong>"
    );
    expect(flagged).toContain("Følg personligt op");
    expect(flagged).not.toContain("Allergi mod nødder");

    const plain = adminNewBookingServiceHtml(base);
    expect(plain).toContain("House Service: <strong>Nej</strong>");
    expect(plain).not.toContain("Følg personligt op");
  });

  it("escapes echoed values", () => {
    const variables = adminNewBookingVariables({
      ...base,
      companyDisplayName: "Rituals & Sons <test>",
    });
    expect(variables.COMPANY_DISPLAY_NAME).toBe(
      "Rituals &amp; Sons &lt;test&gt;"
    );
  });
});
