// The admin's House Events from today on (Opslag, "House Events" tab, #12):
// date, time, the rooms it blocks, the title, and the row actions.

import { EmptyCard } from "@/components/empty-card";
import { ConfirmDeleteButton } from "@/components/forms/confirm-delete-button";
import { HouseEventSheet } from "@/components/house-events/house-event-sheet";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cphDate } from "@/lib/domain/opening-hours";
import { formatDate, formatTime } from "@/lib/format";
import { deleteHouseEvent } from "@/lib/house-events/actions";
import type { HouseEvent, HouseEventRoom } from "@/lib/house-events/data";
import type { HouseEventFormValues } from "@/lib/validation/house-events";
import { messages } from "@/messages/da";

const copy = messages.houseEvents;

// The saved event as the form's Copenhagen date and wall-clock times.
const toFormValues = (event: HouseEvent): HouseEventFormValues => ({
  date: cphDate(new Date(event.startAt)),
  description: event.description,
  endTime: formatTime(event.endAt),
  houseEventId: event.houseEventId,
  roomIds: event.rooms.map((room) => room.roomId),
  startTime: formatTime(event.startAt),
  title: event.title ?? "",
});

function HouseEventRow({
  event,
  rooms,
}: {
  event: HouseEvent;
  rooms: HouseEventRoom[];
}) {
  return (
    <TableRow>
      <TableCell className="tabular-nums">
        {formatDate(event.startAt)}
      </TableCell>
      <TableCell className="tabular-nums">
        {formatTime(event.startAt)} - {formatTime(event.endAt)}
      </TableCell>
      <TableCell className="truncate">
        {event.rooms.map((room) => room.roomName).join(", ")}
      </TableCell>
      <TableCell className="truncate font-medium">
        {event.title ?? messages.home.houseEventBadge}
      </TableCell>
      <TableCell className="w-48">
        <div className="flex items-center justify-end gap-2">
          <HouseEventSheet initial={toFormValues(event)} rooms={rooms} />
          <ConfirmDeleteButton
            copy={copy}
            id={event.houseEventId}
            onDelete={deleteHouseEvent}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function HouseEventTable({
  events,
  rooms,
}: {
  events: HouseEvent[];
  rooms: HouseEventRoom[];
}) {
  if (events.length === 0) {
    return (
      <EmptyCard description={copy.emptyDescription} title={copy.emptyTitle} />
    );
  }
  return (
    <Card className="py-0">
      {/* table-fixed: the columns between the first and the last share the
          remaining width evenly (DESIGN.md "Components"); the room list and
          the title truncate instead of pushing into the next column. */}
      <Table className="min-w-[48rem] table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead>{copy.columns.date}</TableHead>
            <TableHead>{copy.columns.time}</TableHead>
            <TableHead>{copy.columns.rooms}</TableHead>
            <TableHead>{copy.columns.title}</TableHead>
            <TableHead className="w-48" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <HouseEventRow
              event={event}
              key={event.houseEventId}
              rooms={rooms}
            />
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
