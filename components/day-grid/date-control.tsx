"use client";

// The day grid's date control (DESIGN.md "Hjem"): "Vælg dato" opens a
// calendar, then a previous/next pair with the date between them. The
// date travels in the URL (?dato=yyyy-mm-dd) so a day can be shared. A
// new day loads as a transition: the old day stays while data-pending
// marks the control, so the card around it can dim the grid and show the
// spinner (loading.tsx does not fire for a search-param change).
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { da } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { addDays, dateToIso, isoToDate } from "@/lib/calendar-date";
import { formatDateString } from "@/lib/format";
import { messages } from "@/messages/da";

const copy = messages.home;

const dayHref = (date: string): string => `/?dato=${date}`;

export function DateControl({ date }: { date: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const go = useCallback(
    (day: string) => startTransition(() => router.push(dayHref(day))),
    [router]
  );
  const select = useCallback(
    (selected: Date | undefined) => {
      if (selected) {
        setOpen(false);
        go(dateToIso(selected));
      }
    },
    [go]
  );
  const previous = useCallback(() => go(addDays(date, -1)), [date, go]);
  const next = useCallback(() => go(addDays(date, 1)), [date, go]);

  return (
    <div
      className="flex items-center gap-3"
      data-pending={pending ? "" : undefined}
    >
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger render={<Button type="button" variant="secondary" />}>
          <CalendarIcon data-icon="inline-start" />
          {copy.pickDate}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            locale={da}
            mode="single"
            onSelect={select}
            selected={isoToDate(date)}
          />
        </PopoverContent>
      </Popover>
      <div className="flex h-9 items-center rounded-md border bg-card">
        <Button
          aria-label={copy.previousDay}
          onClick={previous}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ChevronLeftIcon />
        </Button>
        <span className="px-1 text-sm tabular-nums">
          {formatDateString(date)}
        </span>
        <Button
          aria-label={copy.nextDay}
          onClick={next}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}
