import { describe, expect, it } from "vitest";
import {
  bookingCancelledAdmin,
  bookingCancelledAdminVariables,
} from "./admin-booking-cancelled";
import {
  bookingCancelled,
  bookingCancelledPriceOverviewHtml,
  bookingCancelledVariables,
} from "./booking-cancelled";

const input = {
  addOnsOre: 150_000,
  bookingNumber: "B-2609-0001",
  cancelledAt: "2026-09-29T10:00:00Z",
  companyDisplayName: "Rituals",
  endAt: "2026-10-01T12:00:00Z",
  feeOre: 60_000,
  roomName: "Vue & View",
  startAt: "2026-10-01T10:00:00Z",
};

describe("#5 cancellation email templates", () => {
  it("use the shared visual shell", () => {
    for (const template of [bookingCancelled, bookingCancelledAdmin]) {
      expect(template.html).toContain("#faf8f2");
      expect(template.html).toContain("Our house is your stage.");
    }
  });

  it("has no action button in the admin cancellation advisory", () => {
    expect(bookingCancelledAdmin.html).not.toContain("Åbn afbookingen");
    expect(bookingCancelledAdmin.html).not.toContain("href=");
    expect(bookingCancelledAdmin.html).not.toContain("{{{ACTION_URL}}}");
    expect(bookingCancelled.html).not.toContain("ACTION_URL");
  });

  it("escapes every echoed value", () => {
    const variables = bookingCancelledVariables({
      ...input,
      companyDisplayName: "Rituals & Sons <test>",
      roomName: "Room <script>",
    });
    expect(variables.COMPANY_DISPLAY_NAME).not.toContain("Rituals & Sons");
    expect(variables.ROOM_NAME).toBe("Room &lt;script&gt;");
  });

  it("itemizes fee, registered costs and the total when there is a fee", () => {
    const section = bookingCancelledPriceOverviewHtml({
      addOnsOre: input.addOnsOre,
      feeOre: input.feeOre,
    });
    expect(section).toContain("Afbestillingsgebyr");
    expect(section).toContain("600,00");
    expect(section).toContain("1.500,00");
    expect(section).toContain("2.100,00");
  });

  it("falls back to the no-amount line when nothing is charged", () => {
    expect(
      bookingCancelledPriceOverviewHtml({ addOnsOre: 0, feeOre: 0 })
    ).toContain("Der er ikke registreret et beløb");
    expect(
      bookingCancelledPriceOverviewHtml({ addOnsOre: 0, feeOre: null })
    ).toContain("Der er ikke registreret et beløb");
    expect(
      bookingCancelledPriceOverviewHtml({ addOnsOre: 25_000, feeOre: null })
    ).toContain("Samlet beløb til efterfølgende fakturering");
  });

  it("builds both templates' variables from one input", () => {
    const member = bookingCancelledVariables(input);
    const admin = bookingCancelledAdminVariables({
      ...input,
      bookerName: "Peter",
    });
    expect(member.PRICE_OVERVIEW_HTML).toContain("Afbestillingsgebyr");
    expect(admin.BOOKER_NAME).toContain("Peter");
    expect(admin).not.toHaveProperty("ACTION_URL");
  });
});
