"use client";

import { cn } from "cn";
import { CalendarIcon, CalendarXIcon, TrashIcon } from "lucide-react";
import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useState,
} from "react";
import { da } from "react-day-picker/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { timeOptions } from "@/lib/domain/time";
import { formatDateString } from "@/lib/format";
import type { ActionFormState } from "@/lib/rooms/actions";
import {
  deleteSpecialClosingDay,
  saveSpecialClosingDay,
} from "@/lib/rooms/actions";
import { messages } from "@/messages/da";
import { TimeSelect } from "./time-select";

const specialDayOpenItems = timeOptions(30, 0, 23 * 60 + 30).map((value) => ({
  label: value,
  value,
}));
const specialDayCloseItems = timeOptions(30, 30, 24 * 60).map((value) => ({
  label: value,
  value,
}));

export interface SpecialClosingDayItem {
  closes: string | null;
  date: string;
  isClosed: boolean;
  opens: string | null;
  roomSpecialClosingDayId: string;
}

// "2026-12-24" ↔ Date conversions for the calendar. A bare date string has
// no timezone, so the round trip stays on local date parts (no UTC shift).
function isoToDate(value: string): Date | undefined {
  const [year, month, day] = value.split("-").map(Number);
  if (!(year && month && day)) {
    return undefined;
  }
  return new Date(year, month - 1, day);
}

function dateToIso(date: Date): string {
  const pad = (part: number): string => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

interface SpecialDayDatePickerProps {
  onChange: (value: string) => void;
  value: string;
}

// DESIGN.md date picker: Popover + Calendar, trigger shows the chosen date
// as dd/mm/yyyy until one is picked.
function SpecialDayDatePicker({ onChange, value }: SpecialDayDatePickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback(
    (selected: Date | undefined): void => {
      if (selected) {
        onChange(dateToIso(selected));
        setOpen(false);
      }
    },
    [onChange]
  );

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            className={cn(
              "max-w-fit",
              value ? undefined : "text-muted-foreground"
            )}
            id="special-day-date"
            type="button"
            variant="outline"
          />
        }
      >
        <CalendarIcon data-icon="inline-start" />
        {value ? formatDateString(value) : messages.rooms.chooseDate}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          captionLayout="dropdown"
          locale={da}
          mode="single"
          onSelect={handleSelect}
          selected={value ? isoToDate(value) : undefined}
        />
      </PopoverContent>
    </Popover>
  );
}

interface SpecialDayRowProps {
  specialDay: SpecialClosingDayItem;
}

// One saved date with its own delete action; pending state is per row.
function SpecialDayRow({ specialDay }: SpecialDayRowProps) {
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteSpecialClosingDay,
    { status: "idle" } satisfies ActionFormState
  );

  const handleRemove = useCallback((): void => {
    // Dispatch needs a transition of its own when called outside a form
    // action, or isPending never updates.
    startTransition(() => {
      deleteAction(specialDay.roomSpecialClosingDayId);
    });
  }, [deleteAction, specialDay.roomSpecialClosingDayId]);

  useEffect(() => {
    if (deleteState.status === "success") {
      toast.add({ title: messages.rooms.specialDayDeleted, type: "success" });
    }
    if (deleteState.status === "error") {
      toast.add({ title: deleteState.error, type: "error" });
    }
  }, [deleteState]);

  return (
    <li className="flex items-center gap-3 text-sm">
      <span className="w-28">{formatDateString(specialDay.date)}</span>
      {specialDay.isClosed ? (
        <Badge variant="secondary">
          {messages.rooms.specialDayClosedLabel}
        </Badge>
      ) : (
        <span>
          {messages.rooms.specialDayOpens} {specialDay.opens} ·{" "}
          {messages.rooms.specialDayCloses} {specialDay.closes}
        </span>
      )}
      <Button
        aria-label={messages.rooms.specialDayDelete}
        className="ml-auto"
        onClick={handleRemove}
        pending={deletePending}
        size="sm"
        type="button"
        variant="ghost"
      >
        <TrashIcon aria-hidden="true" />
      </Button>
    </li>
  );
}

interface SpecialClosingDaysProps {
  roomId: string;
  specialDays: SpecialClosingDayItem[];
}

// Date-level overrides of the weekly hours (the glossary's "special
// closing day"): a date where the room is closed all day — the primary
// case, default in the form — or open with different hours. Holidays,
// maintenance days, special evenings.
export function SpecialClosingDays({
  specialDays,
  roomId,
}: SpecialClosingDaysProps) {
  const [saveState, saveAction, savePending] = useActionState(
    saveSpecialClosingDay,
    { status: "idle" } satisfies ActionFormState
  );
  const [date, setDate] = useState("");
  const [opens, setOpens] = useState("08:00");
  const [closes, setCloses] = useState("18:00");
  // Closed all day is the default: pick a date, add. Toggling off reveals
  // the custom-hours fields.
  const [isClosed, setIsClosed] = useState(true);

  useEffect(() => {
    if (saveState.status === "success") {
      toast.add({ title: messages.rooms.specialDaySaved, type: "success" });
      setDate("");
      setIsClosed(true);
      setOpens("08:00");
      setCloses("18:00");
    }
    if (saveState.status === "error") {
      toast.add({ title: saveState.error, type: "error" });
    }
  }, [saveState]);

  const handleSave = useCallback((): void => {
    if (date === "") {
      toast.add({ title: messages.rooms.specialDayPickDate, type: "error" });
      return;
    }
    saveAction({
      roomId,
      values: {
        closes: isClosed ? "00:00" : closes,
        date,
        isClosed,
        opens: isClosed ? "00:00" : opens,
      },
    });
  }, [closes, date, isClosed, opens, roomId, saveAction]);

  const handleClosedChange = useCallback((checked: boolean): void => {
    setIsClosed(checked);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{messages.rooms.specialDaysTitle}</CardTitle>
        <CardDescription>
          {messages.rooms.specialDayDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {specialDays.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarXIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>{messages.rooms.specialDayEmpty}</EmptyTitle>
              <EmptyDescription>
                {messages.rooms.specialDayEmptyDescription}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-2">
            {specialDays.map((specialDay) => (
              <SpecialDayRow
                key={specialDay.roomSpecialClosingDayId}
                specialDay={specialDay}
              />
            ))}
          </ul>
        )}

        <form
          action={handleSave}
          className="flex flex-wrap items-end gap-3 border-t pt-4"
        >
          <Field>
            <FieldLabel htmlFor="special-day-date" required>
              {messages.rooms.specialDayDate}
            </FieldLabel>
            <SpecialDayDatePicker onChange={setDate} value={date} />
          </Field>
          <Field orientation="horizontal">
            {/* Switch on = the whole date is closed (the default); off =
            custom hours for that date. */}
            <Switch
              checked={isClosed}
              id="special-day-closed"
              onCheckedChange={handleClosedChange}
            />
            <FieldLabel
              className="font-normal"
              htmlFor="special-day-closed"
              required
            >
              {messages.rooms.specialDayClosed}
            </FieldLabel>
          </Field>
          {isClosed ? null : (
            <Field orientation="horizontal">
              <FieldLabel required>
                {messages.rooms.specialDayHoursLabel}
              </FieldLabel>
              <div className="flex items-center gap-2">
                <TimeSelect
                  ariaLabel={messages.rooms.specialDayOpens}
                  items={specialDayOpenItems}
                  onChange={setOpens}
                  value={opens}
                />
                <span aria-hidden="true" className="text-muted-foreground">
                  –
                </span>
                <TimeSelect
                  ariaLabel={messages.rooms.specialDayCloses}
                  items={specialDayCloseItems}
                  onChange={setCloses}
                  value={closes}
                />
              </div>
            </Field>
          )}
          <Button
            className="ml-auto"
            disabled={date === ""}
            pending={savePending}
            type="submit"
          >
            {messages.rooms.specialDayAdd}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
