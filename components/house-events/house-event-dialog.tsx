"use client";

// Create or edit a House Event (admin, #12; DESIGN.md "Opslag (admin)"):
// date, start, end, the rooms it blocks as checkboxes, an optional title
// and a short explanation. When bookings are in the way the dialog lists
// them and saves nothing (decided in #12). One schema with the server
// action (lib/validation/house-events.ts).
import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useActionState, useCallback, useEffect } from "react";
import {
  type Control,
  type UseFormReturn,
  useController,
  useForm,
} from "react-hook-form";
import { DatePicker } from "@/components/forms/date-picker";
import { applyFieldErrors } from "@/components/forms/field-errors";
import { FormDialog } from "@/components/forms/form-dialog";
import { PendingButton } from "@/components/forms/pending-button";
import { TextField } from "@/components/forms/text-field";
import { TextareaField } from "@/components/forms/textarea-field";
import { TimeSelect } from "@/components/rooms/time-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import {
  GRID_END_MINUTES,
  GRID_START_MINUTES,
} from "@/lib/domain/availability";
import { SLOT_MINUTES } from "@/lib/domain/booking-window";
import { timeOptions } from "@/lib/domain/time";
import {
  type HouseEventConflict,
  type HouseEventFormState,
  saveHouseEvent,
} from "@/lib/house-events/actions";
import type { HouseEventRoom } from "@/lib/house-events/data";
import {
  type HouseEventFormValues,
  houseEventFormSchema,
} from "@/lib/validation/house-events";
import { messages } from "@/messages/da";

const copy = messages.houseEvents;

// Events sit on the day grid, so their times use its 30-minute rows.
const TIME_ITEMS = timeOptions(
  SLOT_MINUTES,
  GRID_START_MINUTES,
  GRID_END_MINUTES
).map((time) => ({ label: time, value: time }));

const EMPTY_EVENT: HouseEventFormValues = {
  date: "",
  description: "",
  endTime: "",
  roomIds: [],
  startTime: "",
  title: "",
};

const idleState: HouseEventFormState = { status: "idle" };

function DateField({ control }: { control: Control<HouseEventFormValues> }) {
  const { field, fieldState } = useController({ control, name: "date" });
  return (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor="house-event-date" required>
        {copy.fields.date}
      </FieldLabel>
      <DatePicker
        id="house-event-date"
        label={copy.fields.date}
        onChange={field.onChange}
        value={field.value}
      />
      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
    </Field>
  );
}

function TimeField({
  control,
  label,
  name,
}: {
  control: Control<HouseEventFormValues>;
  label: string;
  name: "endTime" | "startTime";
}) {
  const { field, fieldState } = useController({ control, name });
  return (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel required>{label}</FieldLabel>
      <TimeSelect
        ariaLabel={label}
        items={TIME_ITEMS}
        onChange={field.onChange}
        value={field.value}
      />
      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
    </Field>
  );
}

function RoomCheckbox({
  checked,
  onToggle,
  room,
}: {
  checked: boolean;
  onToggle: (roomId: string, checked: boolean) => void;
  room: HouseEventRoom;
}) {
  const id = `house-event-room-${room.roomId}`;
  const handleChange = useCallback(
    (next: boolean) => onToggle(room.roomId, next),
    [onToggle, room.roomId]
  );
  return (
    <Field orientation="horizontal">
      <Checkbox checked={checked} id={id} onCheckedChange={handleChange} />
      <FieldLabel className="font-normal" htmlFor={id}>
        {room.roomName}
      </FieldLabel>
    </Field>
  );
}

function RoomsField({
  control,
  rooms,
}: {
  control: Control<HouseEventFormValues>;
  rooms: HouseEventRoom[];
}) {
  const { field, fieldState } = useController({ control, name: "roomIds" });
  const { onChange, value } = field;
  const toggle = useCallback(
    (roomId: string, checked: boolean) =>
      onChange(
        checked ? [...value, roomId] : value.filter((id) => id !== roomId)
      ),
    [onChange, value]
  );
  return (
    <FieldSet data-invalid={fieldState.invalid}>
      <FieldLegend className="flex gap-2" required variant="label">
        {copy.fields.rooms}
      </FieldLegend>
      <div className="grid gap-3 sm:grid-cols-2">
        {rooms.map((room) => (
          <RoomCheckbox
            checked={value.includes(room.roomId)}
            key={room.roomId}
            onToggle={toggle}
            room={room}
          />
        ))}
      </div>
      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
    </FieldSet>
  );
}

function ConflictList({ conflicts }: { conflicts: HouseEventConflict[] }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>{copy.conflictTitle}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p>{copy.conflictDescription}</p>
        <ul className="flex flex-col gap-1">
          {conflicts.map((conflict) => (
            <li className="tabular-nums" key={conflict.entryId}>
              {conflict.name} · {conflict.roomName} · {conflict.when}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

type FailedState = Extract<
  HouseEventFormState,
  { status: "conflict" | "error" }
>;

// A conflict stays in the dialog as a list; both failures toast, and an
// error puts its field errors on the inputs (DESIGN.md "Toasts").
function reportFailure(
  state: FailedState,
  form: UseFormReturn<HouseEventFormValues>
): void {
  toast.add({ title: state.error, type: "error" });
  if (state.status === "error") {
    applyFieldErrors(form, state.fieldErrors ?? {});
  }
}

// Success toasts and closes the dialog.
function useSaveResult(
  state: HouseEventFormState,
  form: UseFormReturn<HouseEventFormValues>,
  onSaved: () => void
): void {
  useEffect(() => {
    if (state.status === "success") {
      toast.add({ title: copy.saved, type: "success" });
      onSaved();
    } else if (state.status !== "idle") {
      reportFailure(state, form);
    }
  }, [state, form, onSaved]);
}

function HouseEventForm({
  initial,
  onSaved,
  rooms,
}: {
  initial: HouseEventFormValues;
  onSaved: () => void;
  rooms: HouseEventRoom[];
}) {
  const [state, formAction, pending] = useActionState(
    saveHouseEvent,
    idleState
  );
  const form = useForm<HouseEventFormValues>({
    defaultValues: initial,
    resolver: zodResolver(houseEventFormSchema),
  });
  useSaveResult(state, form, onSaved);
  const submit = form.handleSubmit((values) =>
    startTransition(() => formAction(values))
  );

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={submit}>
      <FieldGroup>
        <DateField control={form.control} />
        <div className="grid grid-cols-2 gap-4">
          <TimeField
            control={form.control}
            label={copy.fields.start}
            name="startTime"
          />
          <TimeField
            control={form.control}
            label={copy.fields.end}
            name="endTime"
          />
        </div>
        <RoomsField control={form.control} rooms={rooms} />
        <TextField
          control={form.control}
          label={copy.fields.title}
          maxLength={120}
          name="title"
          required={false}
        />
        <TextareaField
          control={form.control}
          label={copy.fields.description}
          name="description"
        />
      </FieldGroup>
      {state.status === "conflict" ? (
        <ConflictList conflicts={state.conflicts} />
      ) : null}
      <PendingButton
        idleLabel={copy.submit}
        pending={pending}
        pendingLabel={copy.saving}
        type="submit"
      />
    </form>
  );
}

// The event in edit mode; null in create mode.
export function HouseEventDialog({
  initial,
  rooms,
}: {
  initial: HouseEventFormValues | null;
  rooms: HouseEventRoom[];
}) {
  return (
    <FormDialog copy={copy} editing={initial !== null}>
      {(close) => (
        <HouseEventForm
          initial={initial ?? EMPTY_EVENT}
          onSaved={close}
          rooms={rooms}
        />
      )}
    </FormDialog>
  );
}
