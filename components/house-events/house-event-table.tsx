"use client";

// The admin's House Events from today on (Opslag, "House Events" tab, #12):
// date, time, the rooms it blocks, and the row's ⋯ menu — the edit sheet
// and the confirm-guarded delete, the bookings list's pattern.

import { EllipsisIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useCallback } from "react";
import { EmptyCard } from "@/components/empty-card";
import { ConfirmDeleteButton } from "@/components/forms/confirm-delete-button";
import { openRowWith } from "@/components/forms/open-row-with";
import { useMenuDialogs } from "@/components/forms/use-menu-dialogs";
import { HouseEventSheet } from "@/components/house-events/house-event-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
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

// One row's ⋯ menu: the edit sheet and the delete, which opens the
// confirm dialog (DESIGN.md "Confirm before destroying").
function HouseEventRowMenu({
  event,
  onDelete,
  onEdit,
}: {
  event: HouseEvent;
  onDelete: (event: HouseEvent) => void;
  onEdit: (event: HouseEvent) => void;
}) {
  const openDelete = useCallback(() => onDelete(event), [onDelete, event]);
  const openEdit = useCallback(() => onEdit(event), [onEdit, event]);
  const label = event.title ?? messages.home.houseEventBadge;
  return (
    <Menu>
      <MenuTrigger
        render={
          <Button
            aria-label={copy.actions.open(label)}
            size="icon-sm"
            type="button"
            variant="ghost"
          />
        }
      >
        <EllipsisIcon aria-hidden="true" />
      </MenuTrigger>
      <MenuContent>
        <MenuItem onClick={openEdit}>
          <PencilIcon aria-hidden="true" />
          {copy.editLabel}
        </MenuItem>
        <MenuItem
          className="text-destructive data-[highlighted]:text-destructive"
          onClick={openDelete}
        >
          <Trash2Icon aria-hidden="true" />
          {copy.delete}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

function HouseEventRow({
  event,
  onDelete,
  onEdit,
}: {
  event: HouseEvent;
  onDelete: (event: HouseEvent) => void;
  onEdit: (event: HouseEvent) => void;
}) {
  return (
    <TableRow
      className="cursor-pointer"
      tabIndex={0}
      {...openRowWith(event, onEdit)}
    >
      <TableCell className="truncate font-medium">
        {event.title ?? messages.home.houseEventBadge}
      </TableCell>
      <TableCell className="tabular-nums">
        {formatDate(event.startAt)}
      </TableCell>
      <TableCell className="tabular-nums">
        {formatTime(event.startAt)} - {formatTime(event.endAt)}
      </TableCell>
      <TableCell className="truncate">
        {event.rooms.map((room) => room.roomName).join(", ")}
      </TableCell>
      <TableCell className="w-14">
        <HouseEventRowMenu event={event} onDelete={onDelete} onEdit={onEdit} />
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
  // The row menu's picks: the sheet and the confirm dialog are mounted
  // once, at the table's level, opened from the ⋯ menu.
  const {
    closeDelete,
    closeEditor,
    deleting,
    editing,
    setDeleting,
    setEditing,
  } = useMenuDialogs<HouseEvent>();

  if (events.length === 0) {
    return (
      <EmptyCard description={copy.emptyDescription} title={copy.emptyTitle} />
    );
  }
  return (
    <>
      <Card className="py-0">
        <Table className="min-w-[48rem] table-fixed" sticky>
          <TableHeader>
            <TableRow>
              <TableHead>{copy.columns.title}</TableHead>
              <TableHead>{copy.columns.date}</TableHead>
              <TableHead>{copy.columns.time}</TableHead>
              <TableHead>{copy.columns.rooms}</TableHead>
              <TableHead className="w-14" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <HouseEventRow
                event={event}
                key={event.houseEventId}
                onDelete={setDeleting}
                onEdit={setEditing}
              />
            ))}
          </TableBody>
        </Table>
      </Card>
      {/* The rows' edit sheet, opened from the ⋯ menu. */}
      <HouseEventSheet
        initial={editing ? toFormValues(editing) : null}
        onOpenChange={closeEditor}
        open={editing !== null}
        rooms={rooms}
      />
      {/* The delete, confirm-guarded, opened from the ⋯ menu. */}
      {deleting ? (
        <ConfirmDeleteButton
          copy={copy}
          id={deleting.houseEventId}
          onDelete={deleteHouseEvent}
          onOpenChange={closeDelete}
          open
        />
      ) : null}
    </>
  );
}
