"use client";

import { useCallback } from "react";
import { type UseFormReturn, useController, useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { timeOptions } from "@/lib/domain/time";
import type { RoomFormValues } from "@/lib/validation/rooms";
import { messages } from "@/messages/da";
import { TimeSelect } from "./time-select";

// 30-minute options as Select items. Opens: 00:00-23:30; closes: 00:30-24:00
// (a room may close at midnight, written "24:00" — Postgres `time` accepts it).
const openItems = timeOptions(30, 0, 23 * 60 + 30).map((value) => ({
  label: value,
  value,
}));
const closeItems = timeOptions(30, 30, 24 * 60).map((value) => ({
  label: value,
  value,
}));

interface OpeningHourRowProps {
  form: UseFormReturn<RoomFormValues>;
  index: number;
  weekday: string;
}

// One weekday row: a closed checkbox plus 30-minute open/close selects. A
// closed day ignores its times (they are still sent — the schema columns are
// not null).
function OpeningHourRow({ form, index, weekday }: OpeningHourRowProps) {
  const closedField = useController({
    control: form.control,
    name: `openingHours.${index}.isClosed`,
  });
  const opensField = useController({
    control: form.control,
    name: `openingHours.${index}.opens`,
  });
  const closesField = useController({
    control: form.control,
    name: `openingHours.${index}.closes`,
  });
  const closed = useWatch({
    control: form.control,
    name: `openingHours.${index}.isClosed`,
  });

  const handleOpenChange = useCallback(
    (checked: boolean): void => {
      closedField.field.onChange(!checked);
    },
    [closedField.field]
  );

  return (
    <div className="flex min-h-12 flex-col items-center gap-3 pb-3 md:flex-row">
      <div className="flex items-center gap-2">
        {/* Switch on = the day is open; off = closed. */}
        <Switch
          checked={!closed}
          id={`room-open-${index}`}
          onCheckedChange={handleOpenChange}
        />
        <FieldLabel
          className="w-16 font-normal"
          htmlFor={`room-open-${index}`}
          required
        >
          {weekday}
        </FieldLabel>
      </div>
      {closed ? (
        // Switch off = the day is closed: say so instead of leaving
        // greyed-out times that read as "unknown".
        <Badge variant="secondary">{messages.rooms.fields.closed}</Badge>
      ) : (
        <div className="flex items-center gap-2">
          <TimeSelect
            ariaLabel={`${weekday} — ${messages.rooms.fields.opens}`}
            items={openItems}
            onChange={opensField.field.onChange}
            value={opensField.field.value}
          />
          <TimeSelect
            ariaLabel={`${weekday} — ${messages.rooms.fields.closes}`}
            items={closeItems}
            onChange={closesField.field.onChange}
            value={closesField.field.value}
          />
        </div>
      )}
    </div>
  );
}

// Weekly opening hours, one row per weekday. Every booking must fit within
// them (Bilag 1); the fit check is TypeScript arithmetic (#4).
export function OpeningHoursCard({
  form,
}: {
  form: UseFormReturn<RoomFormValues>;
}) {
  const hoursError = form.formState.errors.openingHours?.message;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{messages.rooms.openingHoursSection}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col space-y-3 divide-y">
        {messages.rooms.weekdays.map((weekday, index) => (
          <OpeningHourRow
            form={form}
            index={index}
            key={weekday}
            weekday={weekday}
          />
        ))}
        {typeof hoursError === "string" ? (
          <Field data-invalid>
            <FieldError errors={[{ message: hoursError }]} />
          </Field>
        ) : null}
      </CardContent>
    </Card>
  );
}
