"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  type Control,
  type UseFormReturn,
  useController,
  useForm,
} from "react-hook-form";
import { z } from "zod";
import { VerificationStep } from "@/components/bookings/verification-step";
import { applyFieldErrors } from "@/components/forms/field-errors";
import { PendingButton } from "@/components/forms/pending-button";
import { TextField } from "@/components/forms/text-field";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { createHold, type Hold, type HoldState } from "@/lib/bookings/actions";
import { bookerFields } from "@/lib/validation/booking";
import { messages } from "@/messages/da";

const copy = messages.booking;
const HALF_HOUR_SECONDS = 1800;

// The harness takes datetime-local strings and turns them into the offset
// ISO instants createHoldSchema requires. Parsing a zone-less string is
// against ADR-0021; it is tolerated only here, in a development-only page
// that #4's dialog replaces with lib/domain/time.ts slots. The field names
// match so server field errors land on the right inputs.
const devFormSchema = z.object({
  ...bookerFields,
  endAt: z.string().min(1, copy.errors.required),
  participantCount: z.number(copy.errors.participantsInvalid),
  roomId: z.string().min(1, copy.errors.required),
  startAt: z.string().min(1, copy.errors.required),
});
type DevFormValues = z.infer<typeof devFormSchema>;

interface RoomOption {
  room_capacity: number;
  room_id: string;
  room_name: string;
}

const initialState: HoldState = { status: "idle" };

function RoomSelect({
  control,
  rooms,
}: {
  control: Control<DevFormValues>;
  rooms: RoomOption[];
}) {
  const { field, fieldState } = useController({ control, name: "roomId" });
  return (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor="field-roomId">{copy.fields.room}</FieldLabel>
      {/* Native select: a dev-only harness, and the shadcn Select was
          removed with #1 (no dropdowns in the product yet). */}
      <select
        aria-invalid={fieldState.invalid}
        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        id="field-roomId"
        name={field.name}
        onBlur={field.onBlur}
        onChange={field.onChange}
        ref={field.ref}
        value={field.value}
      >
        {rooms.map((room) => (
          <option key={room.room_id} value={room.room_id}>
            {room.room_name} ({room.room_capacity})
          </option>
        ))}
      </select>
    </Field>
  );
}

function DateTimeField({
  control,
  label,
  name,
}: {
  control: Control<DevFormValues>;
  label: string;
  name: "endAt" | "startAt";
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
        value={field.value}
      />
    </Field>
  );
}

// Applies the action result: a held state hands the hold up, an error
// toasts and lands its field errors.
function useHoldResult(
  state: HoldState,
  form: UseFormReturn<DevFormValues>,
  onHeld: (hold: Hold) => void
): void {
  useEffect(() => {
    if (state.status === "held") {
      onHeld(state.hold);
      return;
    }
    if (state.status === "error") {
      toast.add({ title: state.error, type: "error" });
      applyFieldErrors(form, state.fieldErrors ?? {});
    }
  }, [state, form, onHeld]);
}

const firstRoomId = (rooms: RoomOption[]): string => rooms[0]?.room_id ?? "";

function HoldForm({
  onHeld,
  rooms,
}: {
  onHeld: (hold: Hold) => void;
  rooms: RoomOption[];
}) {
  const [state, formAction, pending] = useActionState(createHold, initialState);
  const form = useForm<DevFormValues>({
    defaultValues: {
      bookerEmail: "",
      bookerName: "",
      bookerPhone: "",
      endAt: "",
      participantCount: 2,
      roomId: firstRoomId(rooms),
      startAt: "",
    },
    resolver: zodResolver(devFormSchema),
  });

  useHoldResult(state, form, onHeld);

  const submit = form.handleSubmit((values) =>
    startTransition(() =>
      formAction({
        ...values,
        endAt: new Date(values.endAt).toISOString(),
        startAt: new Date(values.startAt).toISOString(),
      })
    )
  );

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={submit}>
      <FieldGroup>
        <RoomSelect control={form.control} rooms={rooms} />
        <DateTimeField
          control={form.control}
          label={copy.fields.startAt}
          name="startAt"
        />
        <DateTimeField
          control={form.control}
          label={copy.fields.endAt}
          name="endAt"
        />
        <TextField
          control={form.control}
          label={copy.fields.participantCount}
          name="participantCount"
          type="number"
        />
        <TextField
          autoComplete="name"
          control={form.control}
          label={copy.fields.bookerName}
          name="bookerName"
        />
        <TextField
          autoComplete="email"
          control={form.control}
          label={copy.fields.bookerEmail}
          name="bookerEmail"
          type="email"
        />
        <TextField
          autoComplete="tel"
          control={form.control}
          label={copy.fields.bookerPhone}
          name="bookerPhone"
          type="tel"
        />
      </FieldGroup>
      <PendingButton
        idleLabel={copy.demo.submit}
        pending={pending}
        pendingLabel={copy.demo.submitting}
        type="submit"
      />
    </form>
  );
}

// Three states, in order: the form, the verification step, done.
export function DevBookingForm({ rooms }: { rooms: RoomOption[] }) {
  const [hold, setHold] = useState<Hold | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const handleConfirmed = useCallback(() => setConfirmed(true), []);

  let body: React.ReactNode;
  if (confirmed) {
    body = <p className="font-medium">{copy.confirmed}</p>;
  } else if (hold) {
    body = (
      <VerificationStep
        hold={hold}
        onConfirmed={handleConfirmed}
        onResent={setHold}
      />
    );
  } else {
    body = <HoldForm onHeld={setHold} rooms={rooms} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.demo.title}</CardTitle>
        <CardDescription>{copy.demo.description}</CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
