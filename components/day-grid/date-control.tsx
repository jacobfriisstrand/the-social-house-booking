"use client";

// The day grid's date control (DESIGN.md "Hjem"): "Vælg dato" opens a
// calendar, then a previous/next pair with the date between them. The
// date travels in the URL (?dato=yyyy-mm-dd) so a day can be shared.
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
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
  const select = useCallback(
    (selected: Date | undefined) => {
      if (selected) {
        setOpen(false);
        router.push(dayHref(dateToIso(selected)));
      }
    },
    [router]
  );

  return (
    <div className="flex items-center gap-3">
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
          nativeButton={false}
          render={<Link href={dayHref(addDays(date, -1))} />}
          size="icon"
          variant="ghost"
        >
          <ChevronLeftIcon />
        </Button>
        <span className="px-1 text-sm tabular-nums">
          {formatDateString(date)}
        </span>
        <Button
          aria-label={copy.nextDay}
          nativeButton={false}
          render={<Link href={dayHref(addDays(date, 1))} />}
          size="icon"
          variant="ghost"
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}
