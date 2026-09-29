import { describe, expect, it } from "vitest";
import { messages } from "@/messages/da";
import type { BookingDetail, DayEntry } from "./data";
import { bookingView, houseEventView, roomStatusLabel } from "./view";

const { sheet } = messages.home;

// 10:00-12:00 Copenhagen on Wednesday 2026-09-16 (CEST).
const booking: DayEntry = {
  companyName: "Rituals",
  description: null,
  endAt: new Date("2026-09-16T10:00:00Z"),
  id: "booking-1",
  kind: "booking",
  roomId: "room-1",
  roomName: "Room of Power",
  startAt: new Date("2026-09-16T08:00:00Z"),
  title: null,
};

const adminDetail: Extract<BookingDetail, { kind: "admin" }> = {
  bookerEmail: "peter@rituals.dk",
  bookerName: "Peter Hansen",
  bookerPhone: "+45 2010 2030",
  bookingNumber: "B-2609-0001",
  internalNote: "Nøgle i receptionen",
  kind: "admin",
  participantCount: 8,
  practicalNotes: null,
  price: {
    addOnsOre: 0,
    discountPercent: 0,
    roomMemberTotalOre: 160_000,
    roomNormalTotalOre: 160_000,
    savingsOre: 0,
    showSavings: false,
    totalOre: 160_000,
  },
  status: "confirmed",
};

const labels = (view: { details: Array<{ label: string }> }) =>
  view.details.map((line) => line.label);

describe("bookingView", () => {
  it("shows another company's booking with its Display name only", () => {
    const view = bookingView(booking, undefined);
    expect(view.name).toBe("Rituals");
    expect(labels(view)).toEqual([
      sheet.room,
      sheet.date,
      sheet.time,
      sheet.company,
    ]);
    expect(view.price).toBeNull();
    expect(view.time).toBe("10:00 - 12:00");
    expect(view.ariaLabel).toBe("Room of Power, 10:00 til 12:00, Rituals");
  });

  it("adds the booker's name to the company's own booking, nothing more", () => {
    const view = bookingView(booking, {
      bookerName: "Peter Hansen",
      kind: "own",
    });
    expect(view.name).toBe("Rituals · Peter Hansen");
    expect(labels(view)).toEqual([
      sheet.room,
      sheet.date,
      sheet.time,
      sheet.company,
      sheet.booker,
    ]);
    expect(view.price).toBeNull();
  });

  it("gives the admin contact, notes and price", () => {
    const view = bookingView(booking, adminDetail);
    expect(view.name).toBe("Rituals");
    expect(labels(view)).toContain(sheet.bookerEmail);
    expect(labels(view)).toContain(sheet.internalNote);
    expect(labels(view)).not.toContain(sheet.practicalNotes);
    expect(view.price).toEqual(adminDetail.price);
  });
});

describe("houseEventView", () => {
  const event: DayEntry = {
    ...booking,
    companyName: null,
    description: "The Loft bruges til 3 Days of Design.",
    id: "event-1",
    kind: "house_event",
    title: "3 Days of Design",
  };

  it("names the event and every room it blocks", () => {
    const view = houseEventView(event, ["Room of Power", "The Loft"]);
    expect(view.name).toBe("3 Days of Design");
    expect(view.details[0]).toEqual({
      label: sheet.rooms,
      value: "Room of Power, The Loft",
    });
    expect(labels(view)).toContain(sheet.description);
  });

  it("falls back to the House Event label without a title", () => {
    expect(houseEventView({ ...event, title: null }, []).name).toBe(
      messages.home.houseEventBadge
    );
  });
});

describe("roomStatusLabel", () => {
  it("says when an occupied room frees up", () => {
    expect(
      roomStatusLabel({
        freeAt: new Date("2026-09-16T12:00:00Z"),
        kind: "occupied",
      })
    ).toBe("Ledig fra 14:00");
  });

  it("says free and closed", () => {
    expect(roomStatusLabel({ kind: "free" })).toBe(messages.home.status.free);
    expect(roomStatusLabel({ kind: "closed" })).toBe(
      messages.home.status.closed
    );
  });
});
