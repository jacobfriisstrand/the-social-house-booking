"use client";

// "Book lokale" (DESIGN.md "Book lokale", ADR-0009): participants, date,
// start, end; "Søg" navigates to /rooms with the search in the URL and
// every room that is free and holds the party comes back. Rendered by the shell, so it owns its two triggers
// (text button, icon button on the rail).
import { CalendarPlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
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
import { roomSearchQuery } from "@/lib/validation/room-search";
import { messages } from "@/messages/da";

const copy = messages.booking.search;
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
  to: string;
}

// onSearched closes the dialog: the shell survives the navigation, so the
// dialog would otherwise stay open over the results.
function SearchForm({ onSearched }: { onSearched: () => void }) {
  const router = useRouter();
  const [values, setValues] = useState<SearchValues>(() => ({
    date: dateToIso(new Date()),
    from: "09:00",
    participants: DEFAULT_PARTICIPANTS,
    to: "10:00",
  }));
  const update = useCallback(
    (patch: Partial<SearchValues>) =>
      setValues((current) => {
        const next = { ...current, ...patch };
        return { ...next, to: endAfter(next.from, next.to) };
      }),
    []
  );
  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      router.push(
        `/rooms${roomSearchQuery({
          dato: values.date,
          fra: values.from,
          personer: values.participants,
          til: values.to,
        })}`
      );
      onSearched();
    },
    [onSearched, router, values]
  );
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

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
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
        {open ? <SearchForm onSearched={close} /> : null}
      </DialogContent>
    </Dialog>
  );
}
