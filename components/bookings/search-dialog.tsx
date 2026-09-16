"use client";

// "Book lokale" (DESIGN.md "Book lokale", ADR-0009): participants first,
// then room (default all, each labelled with its capacity and hidden when
// too small), date, start, end; "Søg" navigates to /rooms with the search
// in the URL. Rendered by the shell, so it owns its two triggers
// (text button, icon button on the rail).
import { CalendarPlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ChoiceSelect } from "@/components/forms/choice-select";
import { DatePicker } from "@/components/forms/date-picker";
import { TimeSelect } from "@/components/rooms/time-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { dateToIso } from "@/lib/calendar-date";
import {
  GRID_END_MINUTES,
  GRID_START_MINUTES,
} from "@/lib/domain/availability";
import { bookingHorizonEnd, SLOT_MINUTES } from "@/lib/domain/booking-window";
import { timeOptions } from "@/lib/domain/time";
import type { RoomOption } from "@/lib/rooms/public-data";
import { roomSearchQuery } from "@/lib/validation/room-search";
import { messages } from "@/messages/da";

const copy = messages.booking.search;
const ALL_ROOMS = "all";
const DEFAULT_PARTICIPANTS = 2;

const startItems = timeOptions(
  SLOT_MINUTES,
  GRID_START_MINUTES,
  GRID_END_MINUTES - SLOT_MINUTES
).map((label) => ({ label, value: label }));
const endItems = timeOptions(
  SLOT_MINUTES,
  GRID_START_MINUTES + SLOT_MINUTES,
  GRID_END_MINUTES
).map((label) => ({ label, value: label }));

// The end must follow the start: bump it to the next slot when needed.
const endAfter = (start: string, end: string): string => {
  if (end > start) {
    return end;
  }
  const index = endItems.findIndex((item) => item.value > start);
  return endItems[index]?.value ?? end;
};

interface SearchValues {
  date: string;
  from: string;
  participants: number;
  room: string;
  to: string;
}

// Rooms that hold the party, labelled with their capacity, so the room is
// never chosen blind; "Alle lokaler" stays first.
const roomItems = (rooms: RoomOption[], participants: number) => [
  { label: copy.allRooms, value: ALL_ROOMS },
  ...rooms
    .filter((room) => room.capacity >= participants)
    .map((room) => ({
      label: `${room.name} · ${messages.rooms.capacityChip(room.capacity)}`,
      value: room.roomId,
    })),
];

// A chosen room that no longer holds the party falls back to all rooms.
const roomStillFits = (
  rooms: RoomOption[],
  room: string,
  participants: number
): boolean =>
  room === ALL_ROOMS ||
  rooms.some((r) => r.roomId === room && r.capacity >= participants);

function SearchForm({ rooms }: { rooms: RoomOption[] }) {
  const router = useRouter();
  const [values, setValues] = useState<SearchValues>(() => ({
    date: dateToIso(new Date()),
    from: "09:00",
    participants: DEFAULT_PARTICIPANTS,
    room: ALL_ROOMS,
    to: "10:00",
  }));
  const update = useCallback(
    (patch: Partial<SearchValues>) =>
      setValues((current) => {
        const next = { ...current, ...patch };
        return {
          ...next,
          room: roomStillFits(rooms, next.room, next.participants)
            ? next.room
            : ALL_ROOMS,
          to: endAfter(next.from, next.to),
        };
      }),
    [rooms]
  );
  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      router.push(
        `/rooms${roomSearchQuery({
          dato: values.date,
          fra: values.from,
          lokale: values.room === ALL_ROOMS ? undefined : values.room,
          personer: values.participants,
          til: values.to,
        })}`
      );
    },
    [router, values]
  );
  const setRoom = useCallback((room: string) => update({ room }), [update]);
  const setDate = useCallback((date: string) => update({ date }), [update]);
  const setFrom = useCallback((from: string) => update({ from }), [update]);
  const setTo = useCallback((to: string) => update({ to }), [update]);
  const setParticipants = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      update({
        participants: Math.max(1, event.target.valueAsNumber || 1),
      }),
    [update]
  );

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="search-participants">
            {copy.participants}
          </FieldLabel>
          <Input
            id="search-participants"
            inputMode="numeric"
            min={1}
            onChange={setParticipants}
            type="number"
            value={values.participants}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="search-room">
            {messages.booking.fields.room}
          </FieldLabel>
          <ChoiceSelect
            id="search-room"
            items={roomItems(rooms, values.participants)}
            onChange={setRoom}
            value={values.room}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="search-date">{copy.date}</FieldLabel>
          <DatePicker
            id="search-date"
            label={copy.date}
            maxDate={bookingHorizonEnd(new Date())}
            minDate={new Date()}
            onChange={setDate}
            value={values.date}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel>{copy.from}</FieldLabel>
            <TimeSelect
              ariaLabel={copy.from}
              items={startItems}
              onChange={setFrom}
              value={values.from}
            />
          </Field>
          <Field>
            <FieldLabel>{copy.to}</FieldLabel>
            <TimeSelect
              ariaLabel={copy.to}
              items={endItems}
              onChange={setTo}
              value={values.to}
            />
          </Field>
        </div>
      </FieldGroup>
      <Button size="lg" type="submit">
        {copy.submit}
      </Button>
    </form>
  );
}

export function SearchDialog({ rooms }: { rooms: RoomOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={
          <Button
            className="w-full group-data-[collapsible=icon]:hidden"
            size="lg"
          />
        }
      >
        {messages.shell.bookRoom}
      </DialogTrigger>
      {/* Same height as the text button so collapsing does not shift the
          nav. */}
      <DialogTrigger
        render={
          <Button
            aria-label={messages.shell.bookRoom}
            className="mx-auto hidden size-9 group-data-[collapsible=icon]:flex"
            size="icon"
          />
        }
      >
        <CalendarPlusIcon />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        {open ? <SearchForm rooms={rooms} /> : null}
      </DialogContent>
    </Dialog>
  );
}
