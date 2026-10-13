import { describe, expect, it } from "vitest";
import { outlookBookingEvent, outlookHouseEvent } from "./outlook-event";

// The Graph event mapping (#13): what the shared booking@ calendar shows
// staff. Times are Copenhagen wall clock with a named zone (ADR-0021); the
// payload is pure JSON, lib/outlook/graph.ts sends it.
const CPH = "Europe/Copenhagen";

describe("outlookBookingEvent", () => {
  const input = {
    bookerEmail: "peter@rituals.dk",
    bookerName: "Peter Pedersen",
    bookerPhone: "+45 2010 2030",
    bookingNumber: "B-2607-0042",
    companyDisplayName: "Rituals",
    endAt: "2026-07-15T09:00:00Z",
    participantCount: 8,
    reference: "MB-1042",
    roomName: "Room of Power",
    startAt: "2026-07-15T07:00:00Z",
  };

  it("names the entry booking number first, company second", () => {
    expect(outlookBookingEvent(input).subject).toBe("B-2607-0042 · Rituals");
  });

  it("sends Copenhagen wall clock with a named zone", () => {
    const payload = outlookBookingEvent(input);
    expect(payload.start).toEqual({
      dateTime: "2026-07-15T09:00:00",
      timeZone: CPH,
    });
    expect(payload.end).toEqual({
      dateTime: "2026-07-15T11:00:00",
      timeZone: CPH,
    });
    expect(payload.isAllDay).toBe(false);
  });

  it("puts the room in the location", () => {
    expect(outlookBookingEvent(input).location).toEqual({
      displayName: "Room of Power",
    });
  });

  it("carries the booker contact, headcount and reference in the body", () => {
    expect(outlookBookingEvent(input).body).toEqual({
      content:
        "Booker: Peter Pedersen\n" +
        "E-mail: peter@rituals.dk\n" +
        "Telefon: +45 2010 2030\n" +
        "Deltagere: 8\n" +
        "Referencenr.: MB-1042",
      contentType: "text",
    });
  });

  it("drops the reference line when there is none", () => {
    const { body } = outlookBookingEvent({ ...input, reference: null });
    expect(body.content).not.toContain("Referencenr.");
  });
});

describe("outlookHouseEvent", () => {
  const input = {
    description: "Vi rydder hele huset.",
    endAt: "2026-07-15T11:00:00Z",
    roomNames: ["Room of Power", "Kitchen"],
    startAt: "2026-07-15T07:00:00Z",
    title: "Værkstedsdag",
  };

  it("uses the title and joins the rooms", () => {
    const payload = outlookHouseEvent(input);
    expect(payload.subject).toBe("Værkstedsdag");
    expect(payload.location).toEqual({
      displayName: "Room of Power, Kitchen",
    });
    expect(payload.body).toEqual({
      content: "Vi rydder hele huset.",
      contentType: "text",
    });
  });

  it("falls back to a plain subject when the title is missing", () => {
    expect(outlookHouseEvent({ ...input, title: null }).subject).toBe(
      "House Event"
    );
  });

  it("marks a whole-day event (00:00–24:00) all day with an exclusive end", () => {
    // 2026-07-15 00:00–24:00 CEST = 2026-07-14T22:00Z → 2026-07-15T22:00Z
    const payload = outlookHouseEvent({
      ...input,
      endAt: "2026-07-15T22:00:00Z",
      startAt: "2026-07-14T22:00:00Z",
    });
    expect(payload.isAllDay).toBe(true);
    expect(payload.start).toEqual({
      dateTime: "2026-07-15T00:00:00",
      timeZone: CPH,
    });
    expect(payload.end).toEqual({
      dateTime: "2026-07-16T00:00:00",
      timeZone: CPH,
    });
  });

  it("keeps a midnight-to-midnight span that crosses dates a timed event", () => {
    // Both ends at 00:00 but two different dates: not "Hele dagen".
    const payload = outlookHouseEvent({
      ...input,
      endAt: "2026-07-15T23:00:00Z",
      startAt: "2026-07-14T22:00:00Z",
    });
    expect(payload.isAllDay).toBe(false);
    expect(payload.end).toEqual({
      dateTime: "2026-07-16T01:00:00",
      timeZone: CPH,
    });
  });

  it("keeps a partial-day event timed", () => {
    const payload = outlookHouseEvent(input);
    expect(payload.isAllDay).toBe(false);
    expect(payload.start).toEqual({
      dateTime: "2026-07-15T09:00:00",
      timeZone: CPH,
    });
  });
});
