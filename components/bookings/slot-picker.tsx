"use client";

// The white bordered panel of the booking dialog (DESIGN.md): two rows.
// The calendar month beside the start-time list, unavailable slots muted
// and disabled; under them the end-time select and the fields the form
// adds (participants).
import { useCallback, useEffect, useRef } from "react";
import { da } from "react-day-picker/locale";
import { ChoiceSelect } from "@/components/forms/choice-select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldLabel } from "@/components/ui/field";
import { dateToIso, isoToDate } from "@/lib/calendar-date";
import type { StartSlot } from "@/lib/domain/availability";
import { bookingHorizonEnd } from "@/lib/domain/booking-window";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { messages } from "@/messages/da";

const copy = messages.booking.dialog;

// The calendar sized to the dialog from md up: its own padding goes (the
// panel has it), and the day cells are h-9 pills instead of squares scaled
// by the column width, so even a six-row month fits the dialog's fixed
// height without the step scrolling. Phone keeps the large square days as
// tap targets (2026-09-26 in #81).
const CALENDAR_CLASSES = String.raw`md:p-0 md:[&_.rdp-day]:aspect-auto md:[&_.rdp-day]:h-9 md:[&_.rdp-day\_button]:aspect-auto md:[&_.rdp-day\_button]:h-full`;

// Scrolls the list (the element's parent) so the element sits mid-list.
const centreInList = (el: HTMLElement): void => {
  const list = el.parentElement;
  if (list) {
    list.scrollTop = el.offsetTop - (list.clientHeight - el.clientHeight) / 2;
  }
};

// Scrolls the list so its first bookable start time sits at the top. The
// buttons are disabled unless available, so the first enabled option is it.
const showFirstAvailable = (list: HTMLElement | null): void => {
  const first = list?.querySelector<HTMLElement>(
    '[role="option"]:not([disabled])'
  );
  if (list && first) {
    list.scrollTop = first.offsetTop;
  }
};

const statusLabel = (status: StartSlot["status"]): string | null =>
  status === "available" ? null : copy.slotStatus[status];

interface SlotPickerProps {
  // Rendered beside the end select: the participants field.
  children?: React.ReactNode;
  date: string;
  endAt: string;
  endOptions: Date[];
  loading: boolean;
  onDateChange: (date: string) => void;
  onEndChange: (endAt: string) => void;
  onStartChange: (startAt: string) => void;
  slots: StartSlot[];
  startAt: string;
}

function SlotButton({
  loading,
  onStartChange,
  selected,
  slot,
}: {
  loading: boolean;
  onStartChange: (startAt: string) => void;
  selected: boolean;
  slot: StartSlot;
}) {
  const available = slot.status === "available";
  const ref = useRef<HTMLButtonElement>(null);

  // Keep the chosen start in view: a pre-filled search lands mid-list. The
  // list scrolls on its own, so the dialog around it stays put.
  useEffect(() => {
    if (selected && ref.current) {
      centreInList(ref.current);
    }
  }, [selected]);

  const handleClick = useCallback(
    () => onStartChange(slot.startAt.toISOString()),
    [onStartChange, slot.startAt]
  );
  return (
    <Button
      aria-selected={selected}
      className={cn(
        "h-9 shrink-0 justify-between tabular-nums",
        selected &&
          "border-chart-2 bg-primary text-primary-foreground hover:bg-primary",
        !available && "bg-muted text-muted-foreground"
      )}
      disabled={!available || loading}
      onClick={handleClick}
      ref={ref}
      role="option"
      type="button"
      variant="outline"
    >
      {slot.label}
      <span className="text-xs">{statusLabel(slot.status)}</span>
    </Button>
  );
}

function StartList({
  loading,
  onStartChange,
  slots,
  startAt,
}: Pick<SlotPickerProps, "loading" | "onStartChange" | "slots" | "startAt">) {
  const none = slots.every((slot) => slot.status !== "available");
  const listRef = useRef<HTMLDivElement>(null);

  // With no start chosen (a fresh dialog, or a new date, which remounts
  // this list), show the first available start time once the day's
  // bookings have loaded. A chosen start is centred by its own button.
  useEffect(() => {
    if (!loading && startAt === "") {
      showFirstAvailable(listRef.current);
    }
  }, [loading, startAt]);

  return (
    <div
      aria-busy={loading}
      aria-label={copy.startListLabel}
      className="relative flex max-h-80 flex-col gap-1 overflow-y-auto pr-1 md:absolute md:inset-0 md:max-h-none"
      ref={listRef}
      role="listbox"
    >
      {none ? (
        <p className="text-muted-foreground text-sm">{copy.noStartSlots}</p>
      ) : null}
      {slots.map((slot) => (
        <SlotButton
          key={slot.label}
          loading={loading}
          onStartChange={onStartChange}
          selected={slot.startAt.toISOString() === startAt}
          slot={slot}
        />
      ))}
    </div>
  );
}

export function SlotPicker({
  children,
  date,
  endAt,
  endOptions,
  loading,
  onDateChange,
  onEndChange,
  onStartChange,
  slots,
  startAt,
}: SlotPickerProps) {
  const now = new Date();
  const handleSelect = useCallback(
    (selected: Date | undefined) => {
      if (selected) {
        onDateChange(dateToIso(selected));
      }
    },
    [onDateChange]
  );
  return (
    <div className="flex flex-col gap-6 rounded-lg border bg-card p-4">
      {/* Row one: the calendar and the start list at equal width from md
          up; each on its own below md, so the days are large tap targets. */}
      <div className="grid gap-6 md:grid-cols-2">
        <Calendar
          aria-label={copy.calendarLabel}
          className={CALENDAR_CLASSES}
          classNames={{ root: "w-full" }}
          disabled={[{ before: now }, { after: bookingHorizonEnd(now) }]}
          locale={da}
          mode="single"
          onSelect={handleSelect}
          selected={isoToDate(date)}
        />
        <Field>
          <FieldLabel>{copy.startLabel}</FieldLabel>
          {/* From md up the list is exactly as tall as the month beside it:
              it fills the field's remaining height absolutely, so the row
              is the calendar's height and the list is the one thing in the
              step that scrolls. Below md it is a capped list in flow. Keyed
              by date: a new day starts the list afresh, so it scrolls to
              that day's first available start time. */}
          <div className="md:relative md:flex-1">
            <StartList
              key={date}
              loading={loading}
              onStartChange={onStartChange}
              slots={slots}
              startAt={startAt}
            />
          </div>
        </Field>
      </div>
      {/* Row two: the end time and the participants side by side. */}
      <div className="grid gap-6 md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="booking-end">{copy.endLabel}</FieldLabel>
          <ChoiceSelect
            disabled={endOptions.length === 0}
            id="booking-end"
            items={endOptions.map((end) => ({
              label: formatTime(end),
              value: end.toISOString(),
            }))}
            onChange={onEndChange}
            placeholder={copy.endPlaceholder}
            value={endAt || null}
          />
        </Field>
        {children}
      </div>
    </div>
  );
}
