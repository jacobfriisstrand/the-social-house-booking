"use client";

// Fields for the development-only booking harnesses (#2 company side, #14
// admin side). Native controls: the product's dropdowns arrive with #4's
// dialog, which deletes this file and both harness routes. Times are
// datetime-local strings; toInstants() turns them into the offset ISO
// instants the schemas require. Parsing a zone-less string is against
// ADR-0021 and tolerated only here.
import {
  type Control,
  type FieldValues,
  type Path,
  useController,
} from "react-hook-form";
import { z } from "zod";
import { TextField } from "@/components/forms/text-field";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { messages } from "@/messages/da";

const copy = messages.booking;
const HALF_HOUR_SECONDS = 1800;

export interface SelectOption {
  label: string;
  value: string;
}

// The slot as the harness forms hold it; the field names match the
// schemas so server field errors land on the right inputs.
export const devSlotFields = {
  endAt: z.string().min(1, copy.errors.required),
  participantCount: z.number(copy.errors.participantsInvalid),
  roomId: z.string().min(1, copy.errors.required),
  startAt: z.string().min(1, copy.errors.required),
};

export const toInstants = <Values extends { endAt: string; startAt: string }>(
  values: Values
): Values => ({
  ...values,
  endAt: new Date(values.endAt).toISOString(),
  startAt: new Date(values.startAt).toISOString(),
});

export function NativeSelectField<Values extends FieldValues>({
  control,
  label,
  name,
  options,
}: {
  control: Control<Values>;
  label: string;
  name: Path<Values>;
  options: SelectOption[];
}) {
  const { field, fieldState } = useController({ control, name });
  const id = `field-${name}`;
  return (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <select
        aria-invalid={fieldState.invalid}
        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        id={id}
        name={field.name}
        onBlur={field.onBlur}
        onChange={field.onChange}
        ref={field.ref}
        value={typeof field.value === "string" ? field.value : ""}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function DateTimeField<Values extends FieldValues>({
  control,
  label,
  name,
}: {
  control: Control<Values>;
  label: string;
  name: Path<Values>;
}) {
  const { field, fieldState } = useController({ control, name });
  const id = `field-${name}`;
  return (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        aria-invalid={fieldState.invalid}
        id={id}
        name={field.name}
        onBlur={field.onBlur}
        onChange={field.onChange}
        ref={field.ref}
        step={HALF_HOUR_SECONDS}
        type="datetime-local"
        value={typeof field.value === "string" ? field.value : ""}
      />
    </Field>
  );
}

interface BookerSlotValues {
  bookerEmail: string;
  bookerName: string;
  bookerPhone: string;
  endAt: string;
  participantCount: number;
  startAt: string;
}

// Period, headcount and the responsible booker: the part of the harness
// forms that does not depend on who is booking.
export function BookerSlotFields<Values extends BookerSlotValues>({
  control,
}: {
  control: Control<Values>;
}) {
  const c = control as unknown as Control<BookerSlotValues>;
  return (
    <>
      <DateTimeField control={c} label={copy.fields.startAt} name="startAt" />
      <DateTimeField control={c} label={copy.fields.endAt} name="endAt" />
      <TextField
        control={c}
        label={copy.fields.participantCount}
        name="participantCount"
        type="number"
      />
      <TextField
        autoComplete="name"
        control={c}
        label={copy.fields.bookerName}
        name="bookerName"
      />
      <TextField
        autoComplete="email"
        control={c}
        label={copy.fields.bookerEmail}
        name="bookerEmail"
        type="email"
      />
      <TextField
        autoComplete="tel"
        control={c}
        label={copy.fields.bookerPhone}
        name="bookerPhone"
        type="tel"
      />
    </>
  );
}
