// The Graph event mapping for the Outlook mirror (#13, ADR-0003): pure
// computation, no I/O — lib/outlook/graph.ts sends it, lib/outlook/sync.ts
// decides when. The shared booking@thesocialhouse.dk calendar is read by
// staff, so the copy is Danish and carries what they need to run the
// meeting: booker contact and headcount. Practical notes are deliberately
// left out; they may hold health data (docs/compliance/gdpr-data-inventory.md)
// and Microsoft must not receive them. Times go out as Copenhagen wall clock
// with a named zone (ADR-0021).
import { cphStamp } from "./time";

export const CPH_TIME_ZONE = "Europe/Copenhagen";

export interface GraphEventPayload {
  body: { contentType: "text"; content: string };
  end: { dateTime: string; timeZone: string };
  isAllDay: boolean;
  location: { displayName: string };
  start: { dateTime: string; timeZone: string };
  subject: string;
}

export interface OutlookBookingEvent {
  bookerEmail: string;
  bookerName: string;
  bookerPhone: string;
  bookingNumber: string;
  companyDisplayName: string;
  endAt: Date | string;
  participantCount: number;
  reference: string | null;
  roomName: string;
  startAt: Date | string;
}

export interface OutlookHouseEvent {
  description: string;
  endAt: Date | string;
  roomNames: string[];
  startAt: Date | string;
  title: string | null;
}

const timed = (startAt: Date | string, endAt: Date | string) => {
  const start = cphStamp(new Date(startAt));
  const end = cphStamp(new Date(endAt));
  return {
    end: { dateTime: `${end.date}T${end.time}`, timeZone: CPH_TIME_ZONE },
    isAllDay: false,
    start: { dateTime: `${start.date}T${start.time}`, timeZone: CPH_TIME_ZONE },
  };
};

// "Hele dagen" (00:00–24:00 on one Copenhagen date) becomes a true all-day
// entry: both wall clocks at midnight and the end on the following date.
// Graph wants both ends at midnight and the end exclusive.
const dayAfter = (date: string): string => {
  const [year, month, day] = date.split("-").map(Number);
  return cphStamp(new Date(Date.UTC(year, month - 1, day + 1))).date;
};

const wholeDaySpan = (
  startAt: Date | string,
  endAt: Date | string
): boolean => {
  const start = cphStamp(new Date(startAt));
  const end = cphStamp(new Date(endAt));
  return (
    start.time === "00:00:00" &&
    end.time === "00:00:00" &&
    end.date === dayAfter(start.date)
  );
};

const allDay = (startAt: Date | string) => {
  const start = cphStamp(new Date(startAt));
  return {
    end: {
      dateTime: `${dayAfter(start.date)}T00:00:00`,
      timeZone: CPH_TIME_ZONE,
    },
    isAllDay: true,
    start: { dateTime: `${start.date}T00:00:00`, timeZone: CPH_TIME_ZONE },
  };
};

export function outlookBookingEvent(
  input: OutlookBookingEvent
): GraphEventPayload {
  const lines = [
    `Booker: ${input.bookerName}`,
    `E-mail: ${input.bookerEmail}`,
    `Telefon: ${input.bookerPhone}`,
    `Deltagere: ${input.participantCount}`,
    ...(input.reference ? [`Referencenr.: ${input.reference}`] : []),
  ];
  return {
    subject: `${input.bookingNumber} · ${input.companyDisplayName}`,
    ...timed(input.startAt, input.endAt),
    body: { content: lines.join("\n"), contentType: "text" },
    location: { displayName: input.roomName },
  };
}

export function outlookHouseEvent(input: OutlookHouseEvent): GraphEventPayload {
  return {
    subject: input.title ?? "House Event",
    ...(wholeDaySpan(input.startAt, input.endAt)
      ? allDay(input.startAt)
      : timed(input.startAt, input.endAt)),
    body: { content: input.description, contentType: "text" },
    location: { displayName: input.roomNames.join(", ") },
  };
}
