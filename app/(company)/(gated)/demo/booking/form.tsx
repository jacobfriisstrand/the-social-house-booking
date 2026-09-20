"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useState,
} from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
import { z } from "zod";
import type { AddOnView } from "@/components/bookings/addon-selection";
import {
  AddOnAndCateringFields,
  BookerSlotFields,
  devAddOnFields,
  devSlotFields,
  NativeSelectField,
  toInstants,
  useClearAddOnsOnRoomChange,
} from "@/components/bookings/dev-fields";
import { VerificationStep } from "@/components/bookings/verification-step";
import { applyFieldErrors } from "@/components/forms/field-errors";
import { PendingButton } from "@/components/forms/pending-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { createHold, type Hold, type HoldState } from "@/lib/bookings/actions";
import { bookerFields, type CreateHoldValues } from "@/lib/validation/booking";
import { messages } from "@/messages/da";

const copy = messages.booking;

// The harness fields live in components/bookings/dev-fields.tsx, shared
// with the admin harness (#14); #4 deletes all of it. The field names match
// createHoldSchema so server field errors land on the right inputs; the
// add-on and catering fields are the real flow's (#7) — devAddOnFields
// holds them in the client shape, with cateringAccepted a refined boolean
// so the checkbox starts unchecked; the server schema requires exactly true.
const devFormSchema = z.object({
  ...bookerFields,
  ...devSlotFields,
  ...devAddOnFields,
});
type DevFormValues = z.infer<typeof devFormSchema>;

interface RoomOption {
  room_capacity: number;
  room_id: string;
  room_name: string;
}

const initialState: HoldState = { status: "idle" };

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
  addOnsByRoomId,
  onHeld,
  rooms,
}: {
  addOnsByRoomId: Record<string, AddOnView[]>;
  onHeld: (hold: Hold) => void;
  rooms: RoomOption[];
}) {
  const [state, formAction, pending] = useActionState(createHold, initialState);
  const form = useForm<DevFormValues>({
    defaultValues: {
      addOnIds: [],
      bookerEmail: "",
      bookerName: "",
      bookerPhone: "",
      cateringAccepted: false,
      endAt: "",
      participantCount: 2,
      roomId: firstRoomId(rooms),
      startAt: "",
    },
    resolver: zodResolver(devFormSchema),
  });

  useHoldResult(state, form, onHeld);
  useClearAddOnsOnRoomChange(form);

  const submit = form.handleSubmit((values) =>
    startTransition(() =>
      // The client schema types cateringAccepted as a refined boolean; the
      // action re-parses with createHoldSchema, which requires exactly
      // true, so the cast only narrows that one field.
      formAction(toInstants(values) as CreateHoldValues)
    )
  );

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={submit}>
      <FieldGroup>
        <NativeSelectField
          control={form.control}
          label={copy.fields.room}
          name="roomId"
          options={rooms.map((room) => ({
            label: `${room.room_name} (${room.room_capacity})`,
            value: room.room_id,
          }))}
        />
        <BookerSlotFields control={form.control} />
        <AddOnAndCateringFields addOnsByRoomId={addOnsByRoomId} form={form} />
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
export function DevBookingForm({
  addOnsByRoomId,
  rooms,
}: {
  addOnsByRoomId: Record<string, AddOnView[]>;
  rooms: RoomOption[];
}) {
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
    body = (
      <HoldForm
        addOnsByRoomId={addOnsByRoomId}
        onHeld={setHold}
        rooms={rooms}
      />
    );
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
