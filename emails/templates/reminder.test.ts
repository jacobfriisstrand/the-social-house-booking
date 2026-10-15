import { describe, expect, it } from "vitest";
import { reminder, reminderDetailsHtml, reminderVariables } from "./reminder";

const input = {
  addOnLines: [],
  bookerName: "Peter Pedersen",
  bookingNumber: "B-2610-0042",
  bookingUrl: "https://tsh.test/login?next=%2Fbookings%3Fbooking%3Dabc",
  cancellationFeeOre: 160_000,
  companyDisplayName: "Rituals",
  endAt: "2026-10-08T12:00:00+02:00",
  participantCount: 8,
  roomName: "Room of Power",
  roomPracticalNotes: null,
  startAt: "2026-10-08T09:00:00+02:00",
};

describe("#11 reminder mail (Mail 5)", () => {
  it("uses the shared shell and carries exactly one CTA, the cancellation link", () => {
    expect(reminder.html).toContain("Our house is your stage.");
    expect(reminder.html.match(/href="/g)).toHaveLength(1);
    expect(reminder.html).toContain('href="{{{BOOKING_URL}}}"');
  });

  it("states the current fee and the cancellation rules", () => {
    expect(reminder.html).toContain(
      "Hvis I afbooker nu, er afbestillingsgebyret:"
    );
    expect(reminder.html).toContain("Mindre end 24 timer før: 100 %.");
    expect(reminderVariables(input).CANCELLATION_FEE).toBe("1.600,00 kr");
  });

  it("lists the booking with Copenhagen times", () => {
    const details = reminderDetailsHtml(input);
    expect(details).toContain("B-2610-0042");
    expect(details).toContain("08/10/2026");
    expect(details).toContain("09:00–12:00");
    expect(details).toContain("Antal deltagere: 8");
    expect(details).toContain("Peter Pedersen");
  });

  it("hides the add-on and practical lines when there is nothing to show", () => {
    const details = reminderDetailsHtml({
      ...input,
      addOnLines: [{ addonName: null, quantity: 1 }],
      roomPracticalNotes: "  ",
    });
    expect(details).not.toContain("Valgte tilvalg");
    expect(details).not.toContain("Praktiske oplysninger");
  });

  it("shows add-ons and the room's practical notes when present", () => {
    const details = reminderDetailsHtml({
      ...input,
      addOnLines: [
        { addonName: "Frokost", quantity: 8 },
        { addonName: "House Host", quantity: 1 },
      ],
      roomPracticalNotes: "Skærm med HDMI\nNøglekort i receptionen",
    });
    expect(details).toContain("Valgte tilvalg: Frokost (8 stk.), House Host");
    expect(details).toContain("Skærm med HDMI<br>Nøglekort i receptionen");
  });

  it("escapes every echoed value", () => {
    const variables = reminderVariables({
      ...input,
      addOnLines: [{ addonName: "<b>Kaffe</b>", quantity: 1 }],
      companyDisplayName: "Rituals & Sons",
      roomName: "Room <script>",
      roomPracticalNotes: "<img src=x>",
    });
    expect(variables.COMPANY_DISPLAY_NAME).toBe("Rituals &amp; Sons");
    expect(variables.ROOM_NAME).toBe("Room &lt;script&gt;");
    expect(variables.BOOKING_DETAILS_HTML).not.toContain("<b>Kaffe");
    expect(variables.BOOKING_DETAILS_HTML).not.toContain("<img");
  });

  it("produces exactly the variables the template declares", () => {
    expect(reminder.variables.parse(reminderVariables(input))).toEqual(
      reminderVariables(input)
    );
  });
});
