// What the day grid shows of each entry (DESIGN.md "Day grid", #12): the
// block's name and time, the sheet's detail lines, and each room's status.
// Member visibility (Bilag 1 "Synlige oplysninger"): room, date/time, the
// company's Display name, the House Event title and explanation. The
// booker's name is added for the company's own bookings; contact, notes,
// participants and price only for an admin. Which of those exist is
// decided by what the data layer could read (lib/notice-board/data.ts).
import type { RoomStatus } from "@/lib/domain/day-grid";
import type { PriceOverviewModel } from "@/lib/domain/price-overview";
import { formatDate, formatTime } from "@/lib/format";
import { messages } from "@/messages/da";
import type { BookingDetail, DayEntry } from "./data";

const copy = messages.home;
const { sheet } = messages.home;

export interface DetailLine {
  label: string;
  mono?: boolean;
  value: string;
}

export interface GridEntryView {
  ariaLabel: string;
  details: DetailLine[];
  id: string;
  kind: "booking" | "house_event";
  name: string;
  price: PriceOverviewModel | null;
  time: string;
}

const STATUS_LABEL = {
  cancelled: messages.bookings.status.cancelled,
  confirmed: messages.bookings.status.confirmed,
  expired: messages.bookings.status.cancelled,
  pending_verification: messages.bookings.status.pendingVerification,
} as const;

const timeRange = (entry: DayEntry): string =>
  `${formatTime(entry.startAt)} - ${formatTime(entry.endAt)}`;

const whenLines = (entry: DayEntry): DetailLine[] => [
  { label: sheet.date, value: formatDate(entry.startAt) },
  { label: sheet.time, value: timeRange(entry) },
];

// Optional free text only when there is some.
const textLine = (label: string, value: string | null): DetailLine[] =>
  value ? [{ label, value }] : [];

function adminLines(
  detail: Extract<BookingDetail, { kind: "admin" }>
): DetailLine[] {
  return [
    { label: sheet.bookingNumber, mono: true, value: detail.bookingNumber },
    { label: sheet.status, value: STATUS_LABEL[detail.status] },
    { label: sheet.booker, value: detail.bookerName },
    { label: sheet.bookerEmail, value: detail.bookerEmail },
    { label: sheet.bookerPhone, value: detail.bookerPhone },
    { label: sheet.participants, value: String(detail.participantCount) },
    ...textLine(sheet.practicalNotes, detail.practicalNotes),
    ...textLine(sheet.internalNote, detail.internalNote),
  ];
}

function detailLines(detail: BookingDetail | undefined): DetailLine[] {
  if (!detail) {
    return [];
  }
  return detail.kind === "own"
    ? [{ label: sheet.booker, value: detail.bookerName }]
    : adminLines(detail);
}

// The company's own bookings add the booker's name after the company's.
function bookingName(entry: DayEntry, detail: BookingDetail | undefined) {
  const company = entry.companyName ?? "";
  return detail?.kind === "own" ? `${company} · ${detail.bookerName}` : company;
}

export function bookingView(
  entry: DayEntry,
  detail: BookingDetail | undefined
): GridEntryView {
  const name = bookingName(entry, detail);
  return {
    ariaLabel: copy.blockLabel(
      entry.roomName,
      formatTime(entry.startAt),
      formatTime(entry.endAt),
      name
    ),
    details: [
      { label: sheet.room, value: entry.roomName },
      ...whenLines(entry),
      { label: sheet.company, value: entry.companyName ?? "" },
      ...detailLines(detail),
    ],
    id: entry.id,
    kind: "booking",
    name,
    price: detail?.kind === "admin" ? detail.price : null,
    time: timeRange(entry),
  };
}

// A House Event's sheet names every room it blocks, not just this column.
export function houseEventView(
  entry: DayEntry,
  roomNames: string[]
): GridEntryView {
  const name = entry.title ?? copy.houseEventBadge;
  return {
    ariaLabel: copy.blockLabel(
      entry.roomName,
      formatTime(entry.startAt),
      formatTime(entry.endAt),
      name
    ),
    details: [
      { label: sheet.rooms, value: roomNames.join(", ") },
      ...whenLines(entry),
      ...textLine(sheet.description, entry.description),
    ],
    id: entry.id,
    kind: "house_event",
    name,
    price: null,
    time: timeRange(entry),
  };
}

export function roomStatusLabel(status: RoomStatus): string {
  if (status.kind === "occupied") {
    return copy.status.freeAt(formatTime(status.freeAt));
  }
  return status.kind === "free" ? copy.status.free : copy.status.closed;
}
