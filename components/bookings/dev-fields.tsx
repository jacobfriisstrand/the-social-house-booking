"use client";

import { useEffect, useRef } from "react";
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
  type UseFormReturn,
  useController,
} from "react-hook-form";
import { z } from "zod";
import {
  AddOnCheckboxList,
  type AddOnView,
  CateringAcceptance,
} from "@/components/bookings/addon-selection";
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

// Selected add-ons and the catering acceptance, as the harness forms hold
// them (#7): the real flow's fields, in the client form's shape —
// cateringAccepted is a boolean with a refine so the checkbox starts
// unchecked; the server schema requires exactly true.
export const devAddOnFields = {
  addOnIds: z.array(z.guid()).max(50),
  cateringAccepted: z.boolean().refine((accepted) => accepted, {
    message: copy.errors.cateringAcceptRequired,
  }),
};

// Selected add-ons belong to a room: a room change drops the selection, so
// the form never submits another room's add-on ids (#7).
export interface RoomSelectionValues {
  addOnIds: string[];
  roomId: string;
}

export function useClearAddOnsOnRoomChange<
  Values extends RoomSelectionValues & FieldValues,
>(form: UseFormReturn<Values>): void {
  const scoped = form as unknown as UseFormReturn<RoomSelectionValues>;
  const previousRoomId = useRef(scoped.getValues("roomId"));
  const roomId = scoped.watch("roomId");
  useEffect(() => {
    if (roomId !== previousRoomId.current) {
      previousRoomId.current = roomId;
      scoped.setValue("addOnIds", []);
    }
  }, [roomId, scoped]);
}

// The add-on list and the catering rule, with each field's error — the
// shared tail of both harness forms' field group.
export interface AddOnHarnessValues {
  addOnIds: string[];
  cateringAccepted: boolean;
  roomId: string;
}

export function AddOnAndCateringFields<
  Values extends AddOnHarnessValues & FieldValues,
>({
  addOnsByRoomId,
  form,
}: {
  addOnsByRoomId: Record<string, AddOnView[]>;
  form: UseFormReturn<Values>;
}) {
  const scoped = form as unknown as UseFormReturn<AddOnHarnessValues>;
  const roomId = scoped.watch("roomId");
  const addOns = addOnsByRoomId[roomId] ?? [];
  const addOnError = scoped.formState.errors.addOnIds?.message;
  const cateringError = scoped.formState.errors.cateringAccepted?.message;
  return (
    <>
      <AddOnCheckboxList
        addOns={addOns}
        control={scoped.control}
        error={addOnError}
        name="addOnIds"
      />
      <CateringAcceptance
        control={scoped.control}
        error={cateringError}
        name="cateringAccepted"
      />
    </>
  );
}

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
      <FieldLabel htmlFor={id} required>
        {label}
      </FieldLabel>
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
      <FieldLabel htmlFor={id} required>
        {label}
      </FieldLabel>
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
