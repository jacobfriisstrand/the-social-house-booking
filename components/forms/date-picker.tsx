"use client";

import { CalendarIcon } from "lucide-react";
import { useCallback, useState } from "react";
import type { Matcher } from "react-day-picker";
import { da } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { dateToIso, isoToDate } from "@/lib/calendar-date";
import { formatDateString } from "@/lib/format";

interface DatePickerProps {
  id?: string;
  label: string;
  maxDate?: Date;
  minDate?: Date;
  onChange: (value: string) => void;
  value: string;
}

const disabledDays = (minDate?: Date, maxDate?: Date): Matcher[] => {
  const rules: Matcher[] = [];
  if (minDate) {
    rules.push({ before: minDate });
  }
  if (maxDate) {
    rules.push({ after: maxDate });
  }
  return rules;
};

// DESIGN.md date picker: Popover + Calendar; the trigger shows the chosen
// date as dd/mm/yyyy. Value is "yyyy-mm-dd".
export function DatePicker({
  id,
  label,
  maxDate,
  minDate,
  onChange,
  value,
}: DatePickerProps) {
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

  const text = value ? formatDateString(value) : label;

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            aria-label={label}
            className="w-full justify-start"
            id={id}
            size="lg"
            type="button"
            variant="outline"
          />
        }
      >
        <CalendarIcon data-icon="inline-start" />
        {text}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          disabled={disabledDays(minDate, maxDate)}
          locale={da}
          mode="single"
          onSelect={handleSelect}
          selected={value ? isoToDate(value) : undefined}
        />
      </PopoverContent>
    </Popover>
  );
}
